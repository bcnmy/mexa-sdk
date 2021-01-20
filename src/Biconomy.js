const Promise = require("promise");
const ethers = require("ethers");
const txDecoder = require("ethereum-tx-decoder");
const abi = require("ethereumjs-abi");
const { toJSONRPCPayload } = require("./util");
const {
  config,
  RESPONSE_CODES,
  EVENTS,
  BICONOMY_RESPONSE_CODES,
  STATUS,
} = require("./config");
const DEFAULT_PAYLOAD_ID = "99999999";
const Web3 = require("web3");
const baseURL = config.baseURL;
const userLoginPath = config.userLoginPath;
const withdrawFundsUrl = config.withdrawFundsUrl;
const getUserContractPath = config.getUserContractPath;
const JSON_RPC_VERSION = config.JSON_RPC_VERSION;
const USER_ACCOUNT = config.USER_ACCOUNT;
const USER_CONTRACT = config.USER_CONTRACT;
const NATIVE_META_TX_URL = config.nativeMetaTxUrl;
const ZERO_ADDRESS = config.ZERO_ADDRESS;
import PermitClient from "./PermitClient";
import ERC20ForwarderClient from "./ERC20ForwarderClient";
import { buildForwardTxRequest, getDomainSeperator } from "./biconomyforwarder";
import {
  erc20ForwarderAbi,
  oracleAggregatorAbi,
  feeManagerAbi,
  biconomyForwarderAbi,
  transferHandlerAbi,
} from "./abis";

let decoderMap = {},
  smartContractMap = {},
  // contract addresss -> contract attributes(metaTransactionType)
  // could be contract address -> contract object
  smartContractMetaTransactionMap = {};
let biconomyForwarder;
const events = require("events");
var eventEmitter = new events.EventEmitter();
let loginInterval;
let trustedForwarderOverhead;

let domainType,
  metaInfoType,
  relayerPaymentType,
  metaTransactionType,
  forwardRequestType;

let domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract,
};

let daiDomainData = {
  name: config.daiDomainName,
  version: config.daiVersion,
};

let forwarderDomainData;

// EIP712 format data for login
let loginDomainType, loginMessageType, loginDomainData;

function getWeb3(context) {
  let web3;
  if (context) {
    web3 = context.web3;
  }
  return web3;
}

function Biconomy(provider, options) {
  if (typeof fetch == "undefined") {
    fetch = require("node-fetch");
  }
  _validate(options);
  this.isBiconomy = true;
  this.status = STATUS.INIT;
  this.options = options;
  this.apiKey = options.apiKey;
  this.isLogin = false;
  this.dappAPIMap = {};
  this.strictMode = options.strictMode || false;
  this.providerId = options.providerId || 0;
  this.readViaContract = options.readViaContract || false;
  this.READY = STATUS.BICONOMY_READY;
  this.LOGIN_CONFIRMATION = EVENTS.LOGIN_CONFIRMATION;
  this.ERROR = EVENTS.BICONOMY_ERROR;
  this.pendingLoginTransactions = {};
  this.jsonRPC = {
    messageId: 0,
  };
  this.originalProvider = provider;

  if (options.debug) {
    config.logsEnabled = true;
  }
  _init(this.apiKey, this);

  if (provider) {
    this.web3 = new Web3(provider);
    if (options.defaultAccount) {
      getWeb3(this).eth.defaultAccount = options.defaultAccount;
    }

    const proto = Object.getPrototypeOf(provider);
    const keys = Object.getOwnPropertyNames(proto);

    for (var i = 0; i < keys.length; i++) {
      this[keys[i]] = provider[keys[i]];
    }

    for (var key in provider) {
      if (!this[key]) {
        this[key] = provider[key];
      }
    }

    let self = this;
    this.send = function (payload, cb) {
      if (payload.method == "eth_sendTransaction") {
        handleSendTransaction(this, payload, (error, result) => {
          let response = _createJsonRpcResponse(payload, error, result);
          if (cb) {
            cb(error, response);
          }
        });
      } else if (payload.method == "eth_sendRawTransaction") {
        sendSignedTransaction(this, payload, (error, result) => {
          let response = _createJsonRpcResponse(payload, error, result);
          if (cb) {
            cb(error, response);
          }
        });
      } else {
        getWeb3(self).currentProvider.send(payload, cb);
      }
    };
    this.request = function (args, cb) {
      let payload = {
        method: args.method,
        params: args.params,
      };
      if (payload.method == "eth_sendTransaction") {
        return new Promise((resolve, reject) => {
          handleSendTransaction(self, payload, (error, result) => {
            if (error) {
              return reject(error);
            }

            if (result.result) {
              resolve(result.result);
              _logMessage(result.result);
            } else {
              resolve(result);
              _logMessage(result);
            }

            if (cb) {
              cb(error, result);
            }
          });
        });
      } else if (payload.method == "eth_sendRawTransaction") {
        return new Promise((resolve, reject) => {
          sendSignedTransaction(self, payload, (error, result) => {
            if (error) {
              return reject(error);
            }

            if (result.result) {
              resolve(result.result);
              _logMessage(result.result);
            } else {
              resolve(result);
              _logMessage(result);
            }
            if (cb) {
              cb(error, result);
            }
          });
        });
      } else {
        if (getWeb3(self).currentProvider.request) {
          return getWeb3(self).currentProvider.request(args, cb);
        } else if (getWeb3(self).currentProvider.send) {
          return new Promise((resolve, reject) => {
            let jsonRPCPaylod = toJSONRPCPayload(
              self,
              payload.method,
              payload.params
            );
            getWeb3(self).currentProvider.send(
              jsonRPCPaylod,
              (err, response) => {
                if (err) {
                  return reject(err);
                }
                if (response.result) {
                  resolve(response.result);
                } else {
                  resolve(response);
                }
              }
            );
          });
        } else {
          return Promise.reject(
            "Invalid provider object passed to Biconomy as it doesn't support request or send method"
          );
        }
      }
    };
    this.sendAsync = this.send;
  } else {
    throw new Error("Please pass a provider to Biconomy.");
  }
}

Biconomy.prototype.getForwardRequestAndMessageToSign = function (
  rawTransaction,
  tokenAddress,
  cb
) {
  let engine = this;
  return new Promise(async (resolve, reject) => {
    if (rawTransaction) {
      let decodedTx = txDecoder.decodeTx(rawTransaction);
      if (decodedTx.to && decodedTx.data && decodedTx.value) {
        let to = decodedTx.to.toLowerCase();
        let methodInfo = decodeMethod(to, decodedTx.data);
        if (!methodInfo) {
          let error = formatMessage(
            RESPONSE_CODES.DASHBOARD_DATA_MISMATCH,
            `Smart Contract address registered on dashboard is different than what is sent(${decodedTx.to}) in current transaction`
          );
          if (cb) cb(error);

          return reject(error);
        }
        let methodName = methodInfo.name;
        //token address needs to be passed otherwise fees will be charged in DAI by default, given DAI permit is given
        let token = tokenAddress ? tokenAddress : engine.daiTokenAddress;
        _logMessage(tokenAddress);
        let api = engine.dappAPIMap[to]
          ? engine.dappAPIMap[to][methodName]
          : undefined;
        if (!api) {
          api = engine.dappAPIMap[config.SCW]
            ? engine.dappAPIMap[config.SCW][methodName]
            : undefined;
        }
        if (!api) {
          _logMessage(`API not found for method ${methodName}`);
          let error = formatMessage(
            RESPONSE_CODES.API_NOT_FOUND,
            `No API found on dashboard for called method ${methodName}`
          );
          if (cb) cb(error);
          return reject(error);
        }
        _logMessage("API found");
        let params = methodInfo.params;
        let paramArray = [];
        for (let i = 0; i < params.length; i++) {
          paramArray.push(_getParamValue(params[i], engine));
        }

        let account = getWeb3(engine).eth.accounts.recoverTransaction(
          rawTransaction
        );
        _logMessage(`Signer is ${account}`);
        let contractAddr = api.contractAddress.toLowerCase();
        let metaTxApproach = smartContractMetaTransactionMap[contractAddr];
        let gasLimit = decodedTx.gasLimit;
        let gasLimitNum;

        if (!gasLimit || parseInt(gasLimit) == 0) {
          let contractABI = smartContractMap[to];
          if (contractABI) {
            let web3 = getWeb3(engine);
            let contract = new web3.eth.Contract(JSON.parse(contractABI), to);
            gasLimit = await contract.methods[methodName]
              .apply(null, paramArray)
              .estimateGas({ from: account });

            // Do not send this value in API call. only meant for txGas
            gasLimitNum = ethers.BigNumber.from(gasLimit.toString())
              .add(ethers.BigNumber.from(5000))
              .toNumber();
            _logMessage(`Gas limit number ${gasLimitNum}`);
          }
        } else {
          gasLimitNum = ethers.BigNumber.from(gasLimit.toString()).toNumber();
        }

        if (!account) {
          let error = formatMessage(
            RESPONSE_CODES.ERROR_RESPONSE,
            `Not able to get user account from signed transaction`
          );
          return end(error);
        }

        let request, cost;
        if (metaTxApproach == engine.TRUSTED_FORWARDER) {
          request = (
            await buildForwardTxRequest(
              account,
              to,
              gasLimitNum,
              decodedTx.data,
              biconomyForwarder
            )
          ).request;
        } else if (metaTxApproach == engine.ERC20_FORWARDER) {
          //token address needs to be passed otherwise fees will be charged in DAI by default, given DAI permit is given
          let buildTxResponse = await engine.erc20ForwarderClient.buildTx({
            userAddress: account,
            to,
            txGas: gasLimitNum,
            data: decodedTx.data,
            token
          });
          if(buildTxResponse) {
            request = buildTxResponse.request;
            cost = buildTxResponse.cost;
          } else {
            reject(formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Unable to build forwarder request"));
          }
        } else {
          let error = formatMessage(
            RESPONSE_CODES.INVALID_OPERATION,
            `Smart contract is not registered in the dashboard for this meta transaction approach. Kindly use biconomy.getUserMessageToSign`
          );
          if (cb) cb(error);
          return reject(error);
        }

        _logMessage("Forward Request is: ");
        _logMessage(request);

        const eip712DataToSign = {
          types: {
            EIP712Domain: domainType,
            ERC20ForwardRequest: forwardRequestType,
          },
          domain: forwarderDomainData,
          primaryType: "ERC20ForwardRequest",
          message: request,
        };

        const hashToSign = abi.soliditySHA3(
          [
            "address",
            "address",
            "address",
            "uint256",
            "uint256",
            "uint256",
            "uint256",
            "uint256",
            "bytes32",
          ],
          [
            request.from,
            request.to,
            request.token,
            request.txGas,
            request.tokenGasPrice,
            request.batchId,
            request.batchNonce,
            request.deadline,
            ethers.utils.keccak256(request.data),
          ]
        );

        const dataToSign = {
          eip712Format: eip712DataToSign,
          personalSignatureFormat: hashToSign,
          request: request,
          cost: cost
        };

        if (cb) cb(null, dataToSign);

        return resolve(dataToSign);
      } else {
        let error = formatMessage(
          RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,
          `Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard`
        );
        if (cb) cb(error);

        return reject(error);
      }
    }
  });
};

/**
 * Method used to listen to events emitted from the SDK
 */
Biconomy.prototype.onEvent = function (type, callback) {
  if (
    type == this.READY ||
    type == this.ERROR ||
    type == this.LOGIN_CONFIRMATION
  ) {
    eventEmitter.on(type, callback);
    return this;
  } else {
    throw formatMessage(
      RESPONSE_CODES.EVENT_NOT_SUPPORTED,
      `${type} event is not supported.`
    );
  }
};

/**
 * Create a JSON RPC response from the given error and result parameter.
 **/
function _createJsonRpcResponse(payload, error, result) {
  let response = {};
  response.id = payload.id;
  response.jsonrpc = JSON_RPC_VERSION;
  if ((!error || error == null) && !result) {
    response.error =
      "Unexpected error has occured. Please contact Biconomy Team";
    return response;
  }

  if (error) {
    response.error = error;
  } else if (result && result.error) {
    response.error = result.error;
  } else if (getWeb3(this).utils.isHex(result)) {
    response.result = result;
  } else {
    response = result;
  }
  return response;
}

function decodeMethod(to, data) {
  if (to && data && decoderMap[to]) {
    return decoderMap[to].decodeMethod(data);
  }
  return;
}

/**
 * Method used to handle transaction initiated using web3.eth.sendSignedTransaction method
 * It extracts rawTransaction from payload and decode it to get required information like from, to,
 * data, gasLimit to create the payload for biconomy meta transaction API.
 * In case of Native meta transaction, payload just contains rawTransaction
 * In case of contract based meta transaction, payload contains rawTransaction and signature wrapped
 * in a json object.
 *
 * @param {Object} engine Reference to this SDK instance
 * @param {Object} payload Payload data
 * @param {Function} end Callback function with error as first argument
 */
async function sendSignedTransaction(engine, payload, end) {
  if (payload && payload.params[0]) {
    let data = payload.params[0];
    let rawTransaction, signature, request, signatureType;
    // user would need to pass token address as well!
    // OR they could pass the symbol and engine will provide the address for you..
    // default is DAI

    if (typeof data == "string") {
      // Here user send the rawTransaction in the payload directly. Probably the case of native meta transaction
      // Handle this scenario differently?
      rawTransaction = data;
    } else if (typeof data == "object") {
      // Here user wrapped raw Transaction in json object along with signature
      signature = data.signature;
      rawTransaction = data.rawTransaction;
      signatureType = data.signatureType;
      request = data.forwardRequest;
    }

    if (rawTransaction) {
      let decodedTx = txDecoder.decodeTx(rawTransaction);

      if (decodedTx.to && decodedTx.data && decodedTx.value) {
        let to = decodedTx.to.toLowerCase();
        let methodInfo = decodeMethod(to, decodedTx.data);
        if (!methodInfo) {
          methodInfo = decodeMethod(config.SCW, decodedTx.data);
          if (!methodInfo) {
            if (engine.strictMode) {
              let error = formatMessage(
                RESPONSE_CODES.DASHBOARD_DATA_MISMATCH,
                `No smart contract wallet or smart contract registered on dashboard with address (${decodedTx.to})`
              );
              return end(error);
            } else {
              _logMessage(
                "Strict mode is off so falling back to default provider for handling transaction"
              );
              if (typeof data == "object" && data.rawTransaction) {
                payload.params = [data.rawTransaction];
              }
              return getWeb3(engine).currentProvider.send(payload, end);
            }
          }
        }
        let methodName = methodInfo.name;
        let api = engine.dappAPIMap[to]
          ? engine.dappAPIMap[to][methodName]
          : undefined;
        if (!api) {
          api = engine.dappAPIMap[config.SCW]
            ? engine.dappAPIMap[config.SCW][methodName]
            : undefined;
        }
        if (!api) {
          _logMessage(`API not found for method ${methodName}`);
          _logMessage(`Strict mode ${engine.strictMode}`);
          if (engine.strictMode) {
            let error = formatMessage(
              RESPONSE_CODES.API_NOT_FOUND,
              `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`
            );
            return end(error, null);
          } else {
            _logMessage(
              `Falling back to default provider as strict mode is false in biconomy`
            );
            if (typeof data == "object" && data.rawTransaction) {
              payload.params = [data.rawTransaction];
            }
            return getWeb3().currentProvider.send(payload, end);
          }
        }
        _logMessage("API found");
        let params = methodInfo.params;
        let paramArray = [];

        let contractAddr = api.contractAddress.toLowerCase();
        let metaTxApproach = smartContractMetaTransactionMap[contractAddr];
        let account = getWeb3(engine).eth.accounts.recoverTransaction(
          rawTransaction
        );
        _logMessage(`signer is ${account}`);
        if (!account) {
          let error = formatMessage(
            RESPONSE_CODES.ERROR_RESPONSE,
            `Not able to get user account from signed transaction`
          );
          return end(error);
        }

        /**
         * based on the api check contract meta transaction type
         * change paramArray accordingly
         * build request EDIT : do not build the request again it will result in signature mismatch
         * create domain seperator based on signature type
         * use already available signature
         * send API call with appropriate parameters based on signature type
         *
         */
        let forwardedData, gasLimitNum;
        let gasLimit = decodedTx.gasLimit;
        if (api.url == NATIVE_META_TX_URL) {
          if (metaTxApproach != engine.DEFAULT) {
            // forwardedData = payload.params[0].data;
            forwardedData = decodedTx.data;

            let paramArrayForGasCalculation = [];
            for (let i = 0; i < params.length; i++) {
              paramArrayForGasCalculation.push(
                _getParamValue(params[i], engine)
              );
            }

            if (!gasLimit || parseInt(gasLimit) == 0) {
              let contractABI = smartContractMap[to];
              if (contractABI) {
                let web3 = getWeb3(engine);
                let contract = new web3.eth.Contract(
                  JSON.parse(contractABI),
                  to
                );
                gasLimit = await contract.methods[methodName]
                  .apply(null, paramArrayForGasCalculation)
                  .estimateGas({ from: account });

                // do not send this value in API call. only meant for txGas
                gasLimitNum = ethers.BigNumber.from(gasLimit.toString())
                  .add(ethers.BigNumber.from(5000))
                  .toNumber();
                _logMessage("gas limit number" + gasLimitNum);
              }
            } else {
              gasLimitNum = ethers.BigNumber.from(
                gasLimit.toString()
              ).toNumber();
            }

            /*if (metaTxApproach == engine.TRUSTED_FORWARDER) {
                            request = (await buildForwardTxRequest(account, to, gasLimitNum, forwardedData, biconomyForwarder)).request;
                        } else if (metaTxApproach == engine.ERC20_FORWARDER) {
                            request = await engine.erc20ForwarderClient.buildERC20TxRequest(account, to, gasLimitNum, forwardedData, engine.daiTokenAddress);
                        }*/
            _logMessage(request);

            paramArray.push(request);

            if (signatureType && signatureType == engine.EIP712_SIGN) {
              const domainSeparator = getDomainSeperator(
                forwarderDomainData
              );
              _logMessage(domainSeparator);
              paramArray.push(domainSeparator);
            }

            paramArray.push(signature);

            let data = {};
            data.from = account;
            data.apiId = api.id;
            data.params = paramArray;
            data.to = to;
            if (signatureType && signatureType == engine.EIP712_SIGN) {
              data.signatureType = engine.EIP712_SIGN;
            }
            await _sendTransaction(engine, account, api, data, end);
          } else {
            for (let i = 0; i < params.length; i++) {
              paramArray.push(_getParamValue(params[i], engine));
            }

            let data = {};
            data.from = account;
            data.apiId = api.id;
            data.params = paramArray;
            data.gasLimit = decodedTx.gasLimit.toString(); //verify
            data.to = decodedTx.to.toLowerCase();
            await _sendTransaction(engine, account, api, data, end);
          }
        } else {
          if (signature) {
            let relayerPayment = {};
            relayerPayment.token = config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS;
            relayerPayment.amount = config.DEFAULT_RELAYER_PAYMENT_AMOUNT;

            let data = {};
            data.rawTx = rawTransaction;
            data.signature = signature;
            data.to = to;
            data.from = account;
            data.apiId = api.id;
            data.data = decodedTx.data;
            data.value = getWeb3(engine).utils.toHex(decodedTx.value);
            data.gasLimit = decodedTx.gasLimit.toString();
            data.nonceBatchId = config.NONCE_BATCH_ID;
            data.expiry = config.EXPIRY;
            data.baseGas = config.BASE_GAS;
            data.relayerPayment = {
              token: relayerPayment.token,
              amount: relayerPayment.amount,
            };
            _sendTransaction(engine, account, api, data, end);
          } else {
            let error = formatMessage(
              RESPONSE_CODES.INVALID_PAYLOAD,
              `Invalid payload data ${JSON.stringify(
                payload.params[0]
              )}. message and signature are required in param object`
            );
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
            end(error);
          }
        }
      } else {
        let error = formatMessage(
          RESPONSE_CODES.INVALID_PAYLOAD,
          `Not able to deode the data in rawTransaction using ethereum-tx-decoder. Please check the data sent.`
        );
        eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
        end(error);
      }
    } else {
      let error = formatMessage(
        RESPONSE_CODES.INVALID_PAYLOAD,
        `Invalid payload data ${JSON.stringify(
          payload.params[0]
        )}.rawTransaction is required in param object`
      );
      eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
      end(error);
    }
  } else {
    let error = formatMessage(
      RESPONSE_CODES.INVALID_PAYLOAD,
      `Invalid payload data ${JSON.stringify(
        payload.params[0]
      )}. Non empty Array expected in params key`
    );
    eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
    end(error);
  }
}

/**
 * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v3
 * method and send the request to biconomy for processing and call the callback method 'end'
 * with transaction hash.
 *
 * This is an internal function that is called while intercepting eth_sendTransaction RPC method call.
 **/
async function handleSendTransaction(engine, payload, end) {
  _logMessage("Handle transaction with payload");
  _logMessage(payload);
  if (payload.params && payload.params[0] && payload.params[0].to) {
    let to = payload.params[0].to.toLowerCase();
    if (decoderMap[to] || decoderMap[config.SCW]) {
      let methodInfo = decodeMethod(to, payload.params[0].data);

      // Check if the Smart Contract Wallet is registered on dashboard
      if (!methodInfo) {
        methodInfo = decodeMethod(config.SCW, payload.params[0].data);
      }
      let methodName = methodInfo.name;
      let api = engine.dappAPIMap[to]
        ? engine.dappAPIMap[to][methodName]
        : undefined;
      // Information we get here is contractAddress, methodName, methodType, ApiId
      if (!api) {
        api = engine.dappAPIMap[config.SCW]
          ? engine.dappAPIMap[config.SCW][methodName]
          : undefined;
      }
      let gasPrice = payload.params[0].gasPrice;
      let gasLimit = payload.params[0].gas;
      let signatureType = payload.params[0].signatureType;
      _logMessage(api);

      if (!api) {
        _logMessage(`API not found for method ${methodName}`);
        _logMessage(`Strict mode ${engine.strictMode}`);
        if (engine.strictMode) {
          let error = {};
          error.code = RESPONSE_CODES.API_NOT_FOUND;
          error.message = `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`;
          return end(error, null);
        } else {
          _logMessage(
            `Falling back to default provider as strict mode is false in biconomy`
          );
          return getWeb3(engine).currentProvider.send(payload, end);
        }
      }
      _logMessage("API found");

      _logMessage("Getting user account");
      let account = payload.params[0].from;
      if (!account) {
        return end(`Not able to get user account`);
      }
      _logMessage(`User account fetched`);

      let params = methodInfo.params;
      let paramArray = [];

      let contractAddr = api.contractAddress.toLowerCase();
      let metaTxApproach = smartContractMetaTransactionMap[contractAddr];
      let forwardedData, gasLimitNum;

      if (api.url == NATIVE_META_TX_URL) {
        if (metaTxApproach == engine.TRUSTED_FORWARDER) {
          forwardedData = payload.params[0].data;

          // Check if gas limit is present, it not calculate gas limit

          let paramArrayForGasCalculation = [];
          for (let i = 0; i < params.length; i++) {
            paramArrayForGasCalculation.push(_getParamValue(params[i], engine));
          }

          if (!gasLimit || parseInt(gasLimit) == 0) {
            let contractABI = smartContractMap[to];
            if (contractABI) {
              let web3 = getWeb3(engine);
              let contract = new web3.eth.Contract(JSON.parse(contractABI), to);
              gasLimit = await contract.methods[methodName]
                .apply(null, paramArrayForGasCalculation)
                .estimateGas({ from: account });

              // do not send this value in API call. only meant for txGas
              gasLimitNum = ethers.BigNumber.from(gasLimit.toString())
                .add(ethers.BigNumber.from(5000))
                .toNumber();
              _logMessage("gas limit number" + gasLimitNum);
            }
          } else {
            gasLimitNum = ethers.BigNumber.from(gasLimit.toString()).toNumber();
          }

          const request = (
            await buildForwardTxRequest(
              account,
              to,
              gasLimitNum,
              forwardedData,
              biconomyForwarder
            )
          ).request;
          _logMessage(request);

          paramArray.push(request);
          if (signatureType && signatureType == engine.EIP712_SIGN) {
            const domainSeparator = getDomainSeperator(
              forwarderDomainData
            );
            _logMessage(domainSeparator);
            paramArray.push(domainSeparator);
            const signatureEIP712 = await getSignatureEIP712(
              engine,
              account,
              request
            );
            _logMessage(`EIP712 signature is ${signatureEIP712}`);
            paramArray.push(signatureEIP712);
          } else {
            const signaturePersonal = await getSignaturePersonal(
              engine,
              account,
              request
            );
            _logMessage(`Personal signature is ${signaturePersonal}`);
            paramArray.push(signaturePersonal);
          }

          let data = {};
          data.from = account;
          data.apiId = api.id;
          data.params = paramArray;
          data.to = to;
          if (signatureType && signatureType == engine.EIP712_SIGN) {
            data.signatureType = engine.EIP712_SIGN;
          }
          await _sendTransaction(engine, account, api, data, end);
        } else {
          for (let i = 0; i < params.length; i++) {
            paramArray.push(_getParamValue(params[i], engine));
          }
          let data = {};
          data.from = account;
          data.apiId = api.id;
          data.params = paramArray;
          data.gasLimit = gasLimit;
          data.to = to;
          _sendTransaction(engine, account, api, data, end);
        }
      } else {
        if (engine.isLogin) {
          let nonce = await _getUserContractNonce(account, engine);
          if (!nonce) {
            let error = formatMessage(
              RESPONSE_CODES.USER_ACCOUNT_NOT_FOUND,
              `User is not a registered biconomy user`
            );
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
            end(error);
          }
          let userContractWallet = await _getUserContractWallet(
            engine,
            account
          );

          if (!userContractWallet) {
            let error = formatMessage(
              RESPONSE_CODES.USER_CONTRACT_NOT_FOUND,
              `User contract wallet not found`
            );
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
            return end(error);
          }

          // Check if gas limit is present, if not calculate gas limit
          if (!gasLimit || parseInt(gasLimit) == 0) {
            let contractABI = smartContractMap[to];
            if (contractABI) {
              let web3 = getWeb3(engine);
              let contract = new web3.eth.Contract(JSON.parse(contractABI), to);
              gasLimit = await contract.methods[methodName]
                .apply(null, paramArrayForGas)
                .estimateGas({ from: userContractWallet });
            }
          }

          let metaInfo = {};
          metaInfo.contractWallet = userContractWallet;

          let relayerPayment = {};
          relayerPayment.token = config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS;
          relayerPayment.amount = config.DEFAULT_RELAYER_PAYMENT_AMOUNT;

          let message = {};
          message.from = account;
          message.to = to;
          message.data = payload.params[0].data;
          message.batchId = config.NONCE_BATCH_ID;
          message.nonce = parseInt(nonce);
          message.value = getWeb3(engine).utils.toHex(
            payload.params[0].value || 0
          );
          message.txGas = gasLimit ? gasLimit : 0;
          message.expiry = config.EXPIRY;
          message.baseGas = config.BASE_GAS;
          message.metaInfo = metaInfo;
          message.relayerPayment = relayerPayment;

          const dataToSign = JSON.stringify({
            types: {
              EIP712Domain: domainType,
              MetaInfo: metaInfoType,
              RelayerPayment: relayerPaymentType,
              MetaTransaction: metaTransactionType,
            },
            domain: domainData,
            primaryType: "MetaTransaction",
            message: message,
          });
          _logMessage(dataToSign);
          engine.send(
            {
              jsonrpc: JSON_RPC_VERSION,
              id: payload.id,
              method: config.signTypedV3Method,
              params: [account, dataToSign],
            },
            function (error, response) {
              _logMessage(
                `User signature for payload id ${payload.id} is ${response.result}`
              );
              if (error) {
                end(error);
              } else if (response && response.error) {
                end(response.error);
              } else if (response && response.result) {
                let data = {};
                data.signature = response.result;
                data.from = account;
                data.to = to;
                data.apiId = api.id;

                data.data = payload.params[0].data;
                data.nonceBatchId = config.NONCE_BATCH_ID;
                data.expiry = config.EXPIRY;
                data.baseGas = config.BASE_GAS;
                data.userContract = userContractWallet;
                data.value = getWeb3(engine).utils.toHex(
                  payload.params[0].value || 0
                );
                data.gasLimit = gasLimit ? gasLimit : 0;
                data.relayerPayment = {
                  token: relayerPayment.token,
                  amount: relayerPayment.amount,
                };
                _sendTransaction(engine, account, api, data, end);
              } else {
                end();
              }
            }
          );
        } else {
          let error = {};
          error.message = "User not logged in to biconomy";
          error.code = RESPONSE_CODES.USER_NOT_LOGGED_IN;
          return end(error);
        }
      }
    } else {
      if (engine.strictMode) {
        let error = formatMessage(
          RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,
          `Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard`
        );
        eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
        end(error);
      } else {
        _logMessage(
          "Smart contract not found on dashbaord. Strict mode is off, so falling back to normal transaction mode"
        );
        return getWeb3(engine).currentProvider.send(payload, end);
      }
    }
  } else {
    let error = formatMessage(
      RESPONSE_CODES.INVALID_PAYLOAD,
      `Invalid payload data ${JSON.stringify(
        payload
      )}. Expecting params key to be an array with first element having a 'to' property`
    );
    eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
    end(error);
  }
}

function getSignatureEIP712(engine, account, request) {
  const dataToSign = JSON.stringify({
    types: {
      EIP712Domain: domainType,
      ERC20ForwardRequest: forwardRequestType,
    },
    domain: forwarderDomainData,
    primaryType: "ERC20ForwardRequest",
    message: request,
  });

  const promi = new Promise(async function (resolve, reject) {
    await getWeb3(engine).currentProvider.send(
      {
        jsonrpc: "2.0",
        id: 999999999999,
        method: "eth_signTypedData_v4",
        params: [account, dataToSign],
      },
      function (error, res) {
        if (error) {
          reject(error);
        } else {
          resolve(res.result);
        }
      }
    );
  });

  return promi;
}

async function getSignaturePersonal(engine, account, req) {
  const hashToSign = abi.soliditySHA3(
    [
      "address",
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "bytes32",
    ],
    [
      req.from,
      req.to,
      req.token,
      req.txGas,
      req.tokenGasPrice,
      req.batchId,
      req.batchNonce,
      req.deadline,
      ethers.utils.keccak256(req.data),
    ]
  );

  const signature = await getWeb3(engine).eth.personal.sign(
    "0x" + hashToSign.toString("hex"),
    account
  );

  return signature;
}

// On getting smart contract data get the API data also
eventEmitter.on(EVENTS.SMART_CONTRACT_DATA_READY, (dappId, engine) => {
  // Get DApp API information from Database
  let getAPIInfoAPI = `${baseURL}/api/${config.version}/meta-api`;
  fetch(getAPIInfoAPI, getFetchOptions("GET", engine.apiKey))
    .then((response) => response.json())
    .then(function (response) {
      if (response && response.listApis) {
        let apiList = response.listApis;
        for (let i = 0; i < apiList.length; i++) {
          let contractAddress = apiList[i].contractAddress;
          // TODO: In case of SCW(Smart Contract Wallet) there'll be no contract address. Save SCW as key in that case.
          if (contractAddress) {
            if (!engine.dappAPIMap[contractAddress]) {
              engine.dappAPIMap[contractAddress] = {};
            }
            engine.dappAPIMap[contractAddress][apiList[i].method] = apiList[i];
          } else {
            if (!engine.dappAPIMap[config.SCW]) {
              engine.dappAPIMap[config.SCW] = {};
            }
            engine.dappAPIMap[config.SCW][apiList[i].method] = apiList[i];
          }
        }
        eventEmitter.emit(EVENTS.DAPP_API_DATA_READY, engine);
      }
    })
    .catch(function (error) {
      _logMessage(error);
    });
});

eventEmitter.on(EVENTS.HELPER_CLENTS_READY, async (engine) => {
  try {
    const biconomyAttributes = {
      apiKey: engine.apiKey,
      dappAPIMap: engine.dappAPIMap,
      decoderMap: decoderMap,
      signType: {
        EIP712_SIGN: engine.EIP712_SIGN,
        PERSONAL_SIGN: engine.PERSONAL_SIGN,
      },
    };
    const ethersProvider = new ethers.providers.Web3Provider(
      engine.originalProvider
    );
    const signer = ethersProvider.getSigner();
    let signerOrProvider = signer;
    let isSignerWithAccounts = true;
    try {
      await signer.getAddress();
    } catch (error) {
      _logMessage("Given provider does not have accounts information");
      signerOrProvider = ethersProvider;
      isSignerWithAccounts = false;
    }
    const erc20ForwarderAddress =
      engine.options.erc20ForwarderAddress || engine.erc20ForwarderAddress;
    const transferHandlerAddress =
      engine.options.transferHandlerAddress || engine.transferHandlerAddress;

    if (erc20ForwarderAddress) {
      const erc20Forwarder = new ethers.Contract(
        erc20ForwarderAddress,
        erc20ForwarderAbi,
        signerOrProvider
      );
      const oracleAggregatorAddress = await erc20Forwarder.oracleAggregator();
      const feeManagerAddress = await erc20Forwarder.feeManager();
      const forwarderAddress = await erc20Forwarder.forwarder();
      const oracleAggregator = new ethers.Contract(
        oracleAggregatorAddress,
        oracleAggregatorAbi,
        signerOrProvider
      );
      const feeManager = new ethers.Contract(
        feeManagerAddress,
        feeManagerAbi,
        signerOrProvider
      );
      const forwarder = new ethers.Contract(
        forwarderAddress,
        biconomyForwarderAbi,
        signerOrProvider
      );
      const transferHandler = new ethers.Contract(
        transferHandlerAddress,
        transferHandlerAbi,
        signerOrProvider
      );
      const tokenGasPriceV1SupportedNetworks =
        engine.tokenGasPriceV1SupportedNetworks;

      // removed dai domain data
      // might add networkId
      engine.permitClient = new PermitClient(
        engine,
        erc20ForwarderAddress,
        engine.daiTokenAddress
      );
      engine.erc20ForwarderClient = new ERC20ForwarderClient({
        forwarderClientOptions: biconomyAttributes,
        networkId: engine.networkId,
        provider: ethersProvider,
        forwarderDomainData,
        erc20Forwarder,
        transferHandler,
        forwarder,
        oracleAggregator,
        feeManager,
        isSignerWithAccounts,
        tokenGasPriceV1SupportedNetworks,
        trustedForwarderOverhead
      });

      _logMessage(engine.permitClient);
      _logMessage(engine.erc20ForwarderClient);
    }
    engine.status = STATUS.BICONOMY_READY;
    eventEmitter.emit(STATUS.BICONOMY_READY);
  } catch (error) {
    _logMessage(error);
  }
});

eventEmitter.on(EVENTS.DAPP_API_DATA_READY, (engine) => {
  eventEmitter.emit(EVENTS.HELPER_CLENTS_READY, engine);
});

/**
 * Get user account from current provider using eth_accounts method.
 **/
function _getUserAccount(engine, payload, cb) {
  if (engine) {
    let id = DEFAULT_PAYLOAD_ID;
    if (payload) {
      id = payload.id;
    }
    if (cb) {
      getWeb3(engine).currentProvider.send(
        {
          jsonrpc: JSON_RPC_VERSION,
          id: id,
          method: "eth_accounts",
          params: [],
        },
        (error, response) => {
          if (
            response &&
            response.result &&
            response.result.length == 0 &&
            getWeb3(engine).eth.defaultAccount &&
            getWeb3(engine).eth.defaultAccount != ""
          ) {
            response.result.push(getWeb3(engine).eth.defaultAccount);
            cb(error, response);
          } else {
            cb(error, response);
          }
        }
      );
    } else {
      return new Promise(function (resolve, reject) {
        getWeb3(engine).currentProvider.send(
          {
            jsonrpc: JSON_RPC_VERSION,
            id: id,
            method: "eth_accounts",
            params: [],
          },
          function (error, res) {
            if (error) {
              reject(error);
            } else if (!res.result) {
              reject(`Invalid response ${res}`);
            } else if (
              res.result &&
              res.result.length == 0 &&
              getWeb3(engine).eth.defaultAccount &&
              getWeb3(engine).eth.defaultAccount != ""
            ) {
              resolve(getWeb3(engine).eth.defaultAccount);
            } else {
              resolve(res.result[0]);
            }
          }
        );
      });
    }
  }
}

/**
 * Validate parameters passed to biconomy object. Dapp id and api key are mandatory.
 **/
function _validate(options) {
  if (!options) {
    throw new Error(
      `Options object needs to be passed to Biconomy Object with apiKey as mandatory key`
    );
  }
  if (!options.apiKey) {
    throw new Error(
      `apiKey is required in options object when creating Biconomy object`
    );
  }
}

/**
 * Get paramter value from param object based on its type.
 **/
function _getParamValue(paramObj, engine) {
  let value;
  if (paramObj) {
    let type = paramObj.type;
    switch (type) {
      case (type.match(/^uint/) || type.match(/^int/) || {}).input:
        value = scientificToDecimal(parseInt(paramObj.value));
        value = getWeb3(engine).utils.toHex(value);
        break;
      case "string":
        if (typeof paramObj.value === "object") {
          value = paramObj.value.toString();
        } else {
          value = paramObj.value;
        }
        break;

      default:
        value = paramObj.value;
        break;
    }
  }
  return value;
}

/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param engine Object representing biconomy provider engine
 * @param account User selected account on current wallet
 * @param api API object got from biconomy server
 * @param data Data to be sent to biconomy server having transaction data
 * @param cb Callback method to be called to pass result or send error
 **/
async function _sendTransaction(engine, account, api, data, cb) {
  if (engine && account && api && data) {
    let url = api.url;
    let fetchOption = getFetchOptions("POST", engine.apiKey);
    fetchOption.body = JSON.stringify(data);
    fetch(`${baseURL}${url}`, fetchOption)
      .then((response) => response.json())
      .then(function (result) {
        _logMessage(result);
        if (
          !result.txHash &&
          result.flag != BICONOMY_RESPONSE_CODES.ACTION_COMPLETE &&
          result.flag != BICONOMY_RESPONSE_CODES.SUCCESS
        ) {
          let error = {};
          error.code = result.flag || result.code;
          if (result.flag == BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
            error.code = RESPONSE_CODES.USER_CONTRACT_NOT_FOUND;
          }
          error.message = result.log || result.message;
          if (cb) cb(error);
        } else {
          if (cb) cb(null, result.txHash);
        }
      })
      .catch(function (error) {
        _logMessage(error);
        if (cb) cb(error);
      });
  } else {
    _logMessage(
      `Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`
    );
    if (cb)
      cb(
        `Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`,
        null
      );
  }
}

/**
 * Function to initialize the biconomy object with DApp information.
 * It fetches the dapp's smart contract from biconomy database and initialize the decoders for each smart
 * contract which will be used to decode information during function calls.
 * @param dappId Id for dapp whos information is to be fetched
 * @param apiKey API key used to authenticate the request at biconomy server
 * @param _this object representing biconomy provider
 **/
async function _init(apiKey, engine) {
  try {
    // Check current network id and dapp network id registered on dashboard
    let getDappAPI = `${baseURL}/api/${config.version}/dapp`;
    fetch(getDappAPI, getFetchOptions("GET", apiKey))
      .then(function (response) {
        return response.json();
      })
      .then(function (dappResponse) {
        _logMessage(dappResponse);
        if (dappResponse && dappResponse.dapp) {
          let dappNetworkId = dappResponse.dapp.networkId;
          let dappId = dappResponse.dapp._id;
          _logMessage(
            `Network id corresponding to dapp id ${dappId} is ${dappNetworkId}`
          );
          getWeb3(engine).currentProvider.send(
            {
              jsonrpc: JSON_RPC_VERSION,
              id: "102",
              method: "net_version",
              params: [],
            },
            function (error, networkResponse) {
              if (error || (networkResponse && networkResponse.error)) {
                return eventEmitter.emit(
                  EVENTS.BICONOMY_ERROR,
                  formatMessage(
                    RESPONSE_CODES.NETWORK_ID_NOT_FOUND,
                    "Could not get network version"
                  ),
                  error || networkResponse.error
                );
              } else {
                let providerNetworkId = networkResponse.result;
                engine.networkId = providerNetworkId;
                _logMessage(
                  `Current provider network id: ${providerNetworkId}`
                );
                if (providerNetworkId != dappNetworkId) {
                  return eventEmitter.emit(
                    EVENTS.BICONOMY_ERROR,
                    formatMessage(
                      RESPONSE_CODES.NETWORK_ID_MISMATCH,
                      `Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${dappNetworkId}`
                    )
                  );
                } else {
                  domainData.chainId = providerNetworkId;
                  daiDomainData.chainId = providerNetworkId;
                  fetch(
                    `${baseURL}/api/${config.version2}/meta-tx/systemInfo?networkId=${providerNetworkId}`
                  )
                    .then((response) => response.json())
                    .then((systemInfo) => {
                      if (systemInfo) {
                        domainType = systemInfo.domainType;
                        metaInfoType = systemInfo.metaInfoType;
                        relayerPaymentType = systemInfo.relayerPaymentType;
                        metaTransactionType = systemInfo.metaTransactionType;
                        loginDomainType = systemInfo.loginDomainType;
                        loginMessageType = systemInfo.loginMessageType;
                        loginDomainData = systemInfo.loginDomainData;
                        forwardRequestType = systemInfo.forwardRequestType;
                        forwarderDomainData = systemInfo.forwarderDomainData;
                        trustedForwarderOverhead = systemInfo.overHeadEIP712Sign;
                        engine.forwarderAddress =
                          systemInfo.biconomyForwarderAddress;
                        engine.erc20ForwarderAddress =
                          systemInfo.erc20ForwarderAddress;
                        engine.transferHandlerAddress =
                          systemInfo.transferHandlerAddress;
                        engine.daiTokenAddress = systemInfo.daiTokenAddress;
                        engine.usdtTokenAddress = systemInfo.usdtTokenAddress;
                        engine.usdcTokenAddress = systemInfo.usdcTokenAddress;
                        engine.TRUSTED_FORWARDER =
                          systemInfo.trustedForwarderMetaTransaction;
                        engine.ERC20_FORWARDER =
                          systemInfo.erc20ForwarderMetaTransaction;
                        engine.DEFAULT = systemInfo.defaultMetaTransaction;
                        engine.EIP712_SIGN = systemInfo.eip712Sign;
                        engine.PERSONAL_SIGN = systemInfo.personalSign;
                        engine.tokenGasPriceV1SupportedNetworks =
                          systemInfo.tokenGasPriceV1SupportedNetworks;

                       
                        daiDomainData.verifyingContract =
                          engine.daiTokenAddress;

                        if (systemInfo.relayHubAddress) {
                          domainData.verifyingContract =
                            systemInfo.relayHubAddress;
                        }
                      } else {
                        return eventEmitter.emit(
                          EVENTS.BICONOMY_ERROR,
                          formatMessage(
                            RESPONSE_CODES.INVALID_DATA,
                            "Could not get signature types from server. Contact Biconomy Team"
                          )
                        );
                      }
                      let web3 = getWeb3(engine);
                      biconomyForwarder = new web3.eth.Contract(
                        biconomyForwarderAbi,
                        engine.forwarderAddress
                      );
                      // Get dapps smart contract data from biconomy servers
                      let getDAppInfoAPI = `${baseURL}/api/${config.version}/smart-contract`;
                      fetch(getDAppInfoAPI, getFetchOptions("GET", apiKey))
                        .then((response) => response.json())
                        .then(function (result) {
                          if (!result && result.flag != 143) {
                            return eventEmitter.emit(
                              EVENTS.BICONOMY_ERROR,
                              formatMessage(
                                RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
                                `Error getting smart contract for dappId ${dappId}`
                              )
                            );
                          }
                          let smartContractList = result.smartContracts;
                          if (
                            smartContractList &&
                            smartContractList.length > 0
                          ) {
                            smartContractList.forEach((contract) => {
                              let abiDecoder = require("abi-decoder");
                              smartContractMetaTransactionMap[
                                contract.address.toLowerCase()
                              ] = contract.metaTransactionType;
                              if (contract.type === config.SCW) {
                                abiDecoder.addABI(JSON.parse(contract.abi));
                                decoderMap[config.SCW] = abiDecoder;
                                smartContractMap[config.SCW] = contract.abi;
                              } else {
                                abiDecoder.addABI(JSON.parse(contract.abi));
                                decoderMap[
                                  contract.address.toLowerCase()
                                ] = abiDecoder;
                                smartContractMap[
                                  contract.address.toLowerCase()
                                ] = contract.abi;
                              }
                            });
                            _logMessage(smartContractMetaTransactionMap);
                            _checkUserLogin(engine, dappId);
                          } else {
                            if (engine.strictMode) {
                              engine.status = STATUS.NO_DATA;
                              eventEmitter.emit(
                                EVENTS.BICONOMY_ERROR,
                                formatMessage(
                                  RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
                                  `No smart contract registered for dappId ${dappId} on Mexa Dashboard`
                                )
                              );
                            } else {
                              _checkUserLogin(engine, dappId);
                            }
                          }
                        })
                        .catch(function (error) {
                          eventEmitter.emit(
                            EVENTS.BICONOMY_ERROR,
                            formatMessage(
                              RESPONSE_CODES.ERROR_RESPONSE,
                              "Error while initializing Biconomy"
                            ),
                            error
                          );
                        });
                    });
                }
              }
            }
          );
        } else {
          if (dappResponse.log) {
            eventEmitter.emit(
              EVENTS.BICONOMY_ERROR,
              formatMessage(RESPONSE_CODES.ERROR_RESPONSE, dappResponse.log)
            );
          } else {
            eventEmitter.emit(
              EVENTS.BICONOMY_ERROR,
              formatMessage(
                RESPONSE_CODES.DAPP_NOT_FOUND,
                `No Dapp Registered with apikey ${apiKey}`
              )
            );
          }
        }
      })
      .catch(function (error) {
        eventEmitter.emit(
          EVENTS.BICONOMY_ERROR,
          formatMessage(
            RESPONSE_CODES.ERROR_RESPONSE,
            "Error while initializing Biconomy"
          ),
          error
        );
      });
  } catch (error) {
    eventEmitter.emit(
      EVENTS.BICONOMY_ERROR,
      formatMessage(
        RESPONSE_CODES.ERROR_RESPONSE,
        "Error while initializing Biconomy"
      ),
      error
    );
  }
}

async function _checkUserLogin(engine, dappId) {
  eventEmitter.emit(EVENTS.SMART_CONTRACT_DATA_READY, dappId, engine);
}

Biconomy.prototype.isReady = function () {
  return this.status === STATUS.BICONOMY_READY;
};

Biconomy.prototype.getUserAccount = async function () {
  return await _getUserAccount(this);
};

function getFetchOptions(method, apiKey) {
  return {
    method: method,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json;charset=utf-8",
    },
  };
}

function formatMessage(code, message) {
  return { code: code, message: message };
}

function removeFromStorage(key) {
  if (typeof localStorage != "undefined") {
    localStorage.removeItem(key);
  } else {
    this[key] = null;
  }
}

function getFromStorage(key) {
  if (typeof localStorage != "undefined") {
    return localStorage.getItem(key);
  } else {
    return this[key];
  }
}

/**
 * Single method to be used for logging purpose.
 *
 * @param {string} message Message to be logged
 */
function _logMessage(message) {
  if (config && config.logsEnabled && console.log) {
    console.log(message);
  }
}

var scientificToDecimal = function (num) {
  var nsign = Math.sign(num);
  // remove the sign
  num = Math.abs(num);
  // if the number is in scientific notation remove it
  if (/\d+\.?\d*e[\+\-]*\d+/i.test(num)) {
    var zero = "0",
      parts = String(num).toLowerCase().split("e"), // split into coeff and exponent
      e = parts.pop(), // store the exponential part
      l = Math.abs(e), // get the number of zeros
      sign = e / l,
      coeff_array = parts[0].split(".");
    if (sign === -1) {
      l = l - coeff_array[0].length;
      if (l < 0) {
        num =
          coeff_array[0].slice(0, l) +
          "." +
          coeff_array[0].slice(l) +
          (coeff_array.length === 2 ? coeff_array[1] : "");
      } else {
        num = zero + "." + new Array(l + 1).join(zero) + coeff_array.join("");
      }
    } else {
      var dec = coeff_array[1];
      if (dec) l = l - dec.length;

      if (l < 0) {
        num = coeff_array[0] + dec.slice(0, l) + "." + dec.slice(l);
      } else {
        num = coeff_array.join("") + new Array(l + 1).join(zero);
      }
    }
  }
  return nsign < 0 ? "-" + num : num;
};

export default Biconomy;
