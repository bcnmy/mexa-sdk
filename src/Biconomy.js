const Promise = require("promise");
const ethers = require("ethers");
const txDecoder = require("ethereum-tx-decoder");
const abi = require("ethereumjs-abi");
const { toJSONRPCPayload } = require("./util");
const { eip2771BaseAbi } = require("./abis");
const {
  config,
  RESPONSE_CODES,
  EVENTS,
  BICONOMY_RESPONSE_CODES,
  STATUS,
} = require("./config");
const DEFAULT_PAYLOAD_ID = "99999999";
const baseURL = config.baseURL;
const JSON_RPC_VERSION = config.JSON_RPC_VERSION;
const NATIVE_META_TX_URL = config.nativeMetaTxUrl;

let PermitClient = require("./PermitClient");
let ERC20ForwarderClient = require("./ERC20ForwarderClient");
let BiconomyWalletClient = require("./BiconomyWalletClient");
let { buildForwardTxRequest, getDomainSeperator } = require("./biconomyforwarder");
let {
  erc20ForwarderAbi,
  oracleAggregatorAbi,
  feeManagerAbi,
  biconomyForwarderAbi,
  transferHandlerAbi,
} = require("./abis");

let fetch = require("cross-fetch");

let interfaceMap = {},
  smartContractMap = {},
  smartContractMetaTransactionMap = {},
  smartContractTrustedForwarderMap = {};
let biconomyForwarder;
const events = require("events");
var eventEmitter = new events.EventEmitter();
let trustedForwarderOverhead;
let daiPermitOverhead;
let eip2612PermitOverhead;

let domainType,
  forwarderDomainType,
  metaInfoType,
  relayerPaymentType,
  metaTransactionType,
  forwardRequestType;

//domaindata would be sourced from forwarder -> domain details mapping
let domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract,
};

let daiDomainData = {
  name: config.daiDomainName,
  version: config.daiVersion,
};

let forwarderDomainData, forwarderDomainDetails;

// EIP712 format data for login
let loginDomainType, loginMessageType, loginDomainData;

function Biconomy(provider, options) {
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
  this.isEthersProviderPresent = false;
  this.canSignMessages = false;

  if (options.debug) {
    config.logsEnabled = true;
  }

  if (options.walletProvider) {
    if (isEthersProvider(options.walletProvider)) {
      throw new Error("Wallet Provider in options can't be an ethers provider. Please pass the provider you get from your wallet directly.")
    }
    this.walletProvider = new ethers.providers.Web3Provider(options.walletProvider);
  }

  if (provider) {
    if (isEthersProvider(provider)) {
      this.ethersProvider = provider;
      this.isEthersProviderPresent = true;
    } else {
      this.ethersProvider = new ethers.providers.Web3Provider(provider);
    }

    _init(this.apiKey, this);
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
      if (typeof payload === "string") {
        // Ethers provider is being used to call methods, so payload is actually method, and cb is params
        payload = {
          id: 1,
          jsonrpc: "2.0",
          method: payload,
          params: cb
        }
      }

      if (payload.method == "eth_sendTransaction") {
        return new Promise((resolve, reject) => {
          handleSendTransaction(this, payload, (error, result) => {
            let response = this._createJsonRpcResponse(payload, error, result);
            if (cb && !self.isEthersProviderPresent) {
              cb(error, response);
            }
            if (response.error) {
              reject(response.error);
            } else {
              resolve(response.result);
            }
          });
        });
      } else if (payload.method == "eth_sendRawTransaction") {
        return new Promise((resolve, reject) => {
          sendSignedTransaction(this, payload, (error, result) => {
            let response = this._createJsonRpcResponse(payload, error, result);
            if (cb && !self.isEthersProviderPresent) {
              cb(error, response);
            }
            if (response.error) {
              reject(response.error);
            } else {
              resolve(response.result);
            }
          });
        });
      } else {
        if (self.isEthersProviderPresent) {
          return self.originalProvider.send(payload.method, payload.params);
        } else {
          self.originalProvider.send(payload, cb);
        }
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
        if (self.originalProvider.request) {
          return self.originalProvider.request(args, cb);
        } else if (self.originalProvider.send) {
          return new Promise(async (resolve, reject) => {
            let jsonRPCPaylod = toJSONRPCPayload(
              self,
              payload.method,
              payload.params
            );
            if (self.isEthersProviderPresent) {
              try {
                let localResult = await self.originalProvider.send(jsonRPCPaylod.method, jsonRPCPaylod.params);
                resolve(localResult);
              } catch (error) {
                reject(error);
              }
            } else {
              self.originalProvider.send(
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
            }
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

Biconomy.prototype.getSignerByAddress = function (userAddress) {
  let provider = this.getEthersProvider();
  let signer = provider.getSigner();
  signer = signer.connectUnchecked();
  signer.getAddress = async () => {
    return userAddress
  }
  return signer;
}

Biconomy.prototype.getEthersProvider = function () {
  return new ethers.providers.Web3Provider(this);
}

//TODO
//Allow to provide custom txGas
Biconomy.prototype.getForwardRequestAndMessageToSign = function (
  rawTransaction,
  tokenAddress,
  customBatchId,
  customDomainName,
  customDomainVersion,
  cb
) {
  try {
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
          let metaTxApproach;
          if (!api) {
            api = engine.dappAPIMap[config.SCW]
              ? engine.dappAPIMap[config.SCW][methodName]
              : undefined;
            metaTxApproach = smartContractMetaTransactionMap[config.SCW];
          } else {
            let contractAddr = api.contractAddress.toLowerCase();
            metaTxApproach = smartContractMetaTransactionMap[contractAddr];
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

          let parsedTransaction = ethers.utils.parseTransaction(rawTransaction);
          let account = parsedTransaction.from;

          _logMessage(`Signer is ${account}`);
          let gasLimit = decodedTx.gasLimit;
          let gasLimitNum;

          if (!gasLimit || parseInt(gasLimit) == 0) {
            let contractABI = smartContractMap[to];
            if (contractABI) {
              let contract = new ethers.Contract(to, JSON.parse(contractABI), engine.ethersProvider);
              try {
                gasLimit = await contract.estimateGas[methodInfo.signature](...methodInfo.args, { from: account });
              } catch (err) {
                return reject(err);
              }
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

          let request, cost, forwarderToUse;
          if (metaTxApproach == engine.TRUSTED_FORWARDER) {

            forwarderToUse = await findTheRightForwarder(engine, to);

            //Attach the forwarder with right address


            request = (
              await buildForwardTxRequest(
                account,
                to,
                gasLimitNum,
                decodedTx.data,
                biconomyForwarder.attach(forwarderToUse),
                customBatchId
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
            if (buildTxResponse) {
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



          // Update the verifyingContract field of domain data based on the current request
          forwarderDomainData.verifyingContract = forwarderToUse;
          let domainDataToUse = forwarderDomainDetails[forwarderToUse];

          if (customDomainName) {
            domainDataToUse.name = customDomainName.toString();
          }

          if (customDomainVersion) {
            domainDataToUse.version = customDomainVersion.toString();
          }

          const eip712DataToSign = {
            types: {
              EIP712Domain: forwarderDomainType,
              ERC20ForwardRequest: forwardRequestType,
            },
            domain: domainDataToUse,
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
  } catch (error) {
    return end(error);
  }
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
Biconomy.prototype._createJsonRpcResponse = function (payload, error, result) {
  let response = {};
  response.id = payload.id;
  response.jsonrpc = JSON_RPC_VERSION;
  if ((!error || error == null) && !result) {
    response.error =
      "Unexpected error has occurred. Please contact Biconomy Team";
    return response;
  }

  if (error) {
    response.error = error;
  } else if (result && result.error) {
    response.error = result.error;
  } else if (ethers.utils.isHexString(result)) {
    response.result = result;
  } else {
    response = result;
  }
  return response;
}

function decodeMethod(to, data) {
  if (to && data && interfaceMap[to]) {
    return interfaceMap[to].parseTransaction({ data });
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
    let rawTransaction, signature, request, signatureType, customDomainName, customDomainVersion;
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
      customDomainName = data.domainName;
      customDomainVersion = data.domainVersion;
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

              try {
                return callDefaultProvider(engine, payload, end, `No smart contract wallet or smart contract registered on dashboard with address (${decodedTx.to})`);
              }
              catch (error) {
                return end(error);
              }
            }
          }
        }
        let methodName = methodInfo.name;
        let api = engine.dappAPIMap[to]
          ? engine.dappAPIMap[to][methodName]
          : undefined;
        let metaTxApproach;
        if (!api) {
          api = engine.dappAPIMap[config.SCW]
            ? engine.dappAPIMap[config.SCW][methodName]
            : undefined;
          metaTxApproach = smartContractMetaTransactionMap[config.SCW];
        } else {
          let contractAddr = api.contractAddress.toLowerCase();
          metaTxApproach = smartContractMetaTransactionMap[contractAddr];
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
            try {
              return callDefaultProvider(engine, payload, end, `Current provider can not sign transactions. Make sure to register method ${methodName} on Biconomy Dashboard`);
            }
            catch (error) {
              return end(error);
            }
          }
        }
        _logMessage("API found");
        let paramArray = [];
        let parsedTransaction = ethers.utils.parseTransaction(
          rawTransaction
        );
        let account = parsedTransaction ? parsedTransaction.from : undefined;

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
         * create domain separator based on signature type
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

            if (!gasLimit || parseInt(gasLimit) == 0) {
              let contractABI = smartContractMap[to];
              if (contractABI) {
                let contract = new ethers.Contract(to, JSON.parse(contractABI), engine.ethersProvider);
                gasLimit = await contract.estimateGas[methodInfo.signature](...methodInfo.args, { from: account });

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
            _logMessage(request);

            paramArray.push(request);

            let forwarderToUse = await findTheRightForwarder(engine, to);

            //Update the verifyingContract in domain data
            forwarderDomainData.verifyingContract = forwarderToUse;
            let domainDataToUse = forwarderDomainDetails[forwarderToUse];

            if (customDomainName) {
              domainDataToUse.name = customDomainName.toString();
            }

            if (customDomainVersion) {
              domainDataToUse.version = customDomainVersion.toString();
            }

            // Update the verifyingContract field of domain data based on the current request
            if (signatureType && signatureType == engine.EIP712_SIGN) {
              const domainSeparator = getDomainSeperator(
                domainDataToUse
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
            await _sendTransaction(engine, account, api, data, end, payload);
          } else {
            paramArray.push(...methodInfo.args);

            let data = {};
            data.from = account;
            data.apiId = api.id;
            data.params = paramArray;
            data.gasLimit = decodedTx.gasLimit.toString(); //verify
            data.to = decodedTx.to.toLowerCase();
            await _sendTransaction(engine, account, api, data, end, payload);
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
            data.value = ethers.utils.hexValue(decodedTx.value);
            data.gasLimit = decodedTx.gasLimit.toString();
            data.nonceBatchId = config.NONCE_BATCH_ID;
            data.expiry = config.EXPIRY;
            data.baseGas = config.BASE_GAS;
            data.relayerPayment = {
              token: relayerPayment.token,
              amount: relayerPayment.amount,
            };
            _sendTransaction(engine, account, api, data, end, payload);
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
 * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v4
 * method and send the request to biconomy for processing and call the callback method 'end'
 * with transaction hash.
 *
 * This is an internal function that is called while intercepting eth_sendTransaction RPC method call.
 **/
async function handleSendTransaction(engine, payload, end) {
  try {
    _logMessage("Handle transaction with payload");
    _logMessage(payload);
    if (payload.params && payload.params[0] && payload.params[0].to) {
      let to = payload.params[0].to.toLowerCase();
      if (interfaceMap[to] || interfaceMap[config.SCW]) {
        let methodInfo = decodeMethod(to, payload.params[0].data);

        // Check if the Smart Contract Wallet is registered on dashboard
        if (!methodInfo) {
          methodInfo = decodeMethod(config.SCW, payload.params[0].data);
        }
        if (!methodInfo) {
          let error = {};
          error.code = RESPONSE_CODES.WRONG_ABI;
          error.message = `Can't decode method information from payload. Make sure you have uploaded correct ABI on Biconomy Dashboard`;
          return end(error, null);
        }
        let methodName = methodInfo.name;
        let api = engine.dappAPIMap[to]
          ? engine.dappAPIMap[to][methodName]
          : undefined;
        // Information we get here is contractAddress, methodName, methodType, ApiId
        let metaTxApproach;
        let customBatchId;
        let webHookAttributes;
        let customDomainName, customDomainVersion;
        let signTypedDataType;
        if (!api) {
          api = engine.dappAPIMap[config.SCW]
            ? engine.dappAPIMap[config.SCW][methodName]
            : undefined;
          metaTxApproach = smartContractMetaTransactionMap[config.SCW];
        } else {
          let contractAddr = api.contractAddress.toLowerCase();
          metaTxApproach = smartContractMetaTransactionMap[contractAddr];
        }

        //Sanitise gas limit here. big number / hex / number -> hex
        let gasLimit = payload.params[0].gas || payload.params[0].gasLimit;
        if (gasLimit) {
          gasLimit = ethers.BigNumber.from(gasLimit.toString()).toHexString();
        }
        let txGas = payload.params[0].txGas;
        let signatureType = payload.params[0].signatureType;
        if (payload.params[0].batchId) {
          customBatchId = Number(payload.params[0].batchId);
        }

        if (payload.params[0].webHookAttributes) {
          webHookAttributes = payload.params[0].webHookAttributes;
        }

        if (payload.params[0].domainName) {
          customDomainName = payload.params[0].domainName;
        }

        if (payload.params[0].domainVersion) {
          customDomainVersion = payload.params[0].domainVersion;
        }

        if (payload.params[0].signTypedDataType) {
          signTypedDataType = payload.params[0].signTypedDataType;
        }

        _logMessage(payload.params[0]);
        _logMessage(api);
        _logMessage(`gas limit : ${gasLimit}`);
        if (txGas) {
          _logMessage(`tx gas supplied : ${txGas}`);
        }

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
            try {
              return callDefaultProvider(engine, payload, end, `No registered API found for method ${methodName}. Please register API from developer dashboard.`);
            } catch (error) {
              return end(error);
            }
          }
        }
        _logMessage("API found");

        _logMessage("Getting user account");
        let account = payload.params[0].from;

        if (!account) {
          return end(`Not able to get user account`);
        }
        _logMessage(`User account fetched`);

        _logMessage(methodInfo.args);
        let paramArray = [];

        if (metaTxApproach == engine.ERC20_FORWARDER) {
          let error = formatMessage(
            RESPONSE_CODES.INVALID_PAYLOAD,
            `This operation is not allowed for contracts registered on dashboard as "ERC20Forwarder". Use ERC20Forwarder client instead!`
          );
          eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
          return end(error);
        }

        let forwardedData, gasLimitNum;

        if (api.url == NATIVE_META_TX_URL) {
          if (metaTxApproach == engine.TRUSTED_FORWARDER) {
            _logMessage("Smart contract is configured to use Trusted Forwarder as meta transaction type");
            forwardedData = payload.params[0].data;

            let signatureFromPayload = payload.params[0].signature;
            // Check if txGas is present, if not calculate gas limit for txGas

            if (!txGas || parseInt(txGas) == 0) {
              let contractABI = smartContractMap[to];
              if (contractABI) {
                let contract = new ethers.Contract(to, JSON.parse(contractABI), engine.ethersProvider);
                txGas = await contract.estimateGas[methodInfo.signature](...methodInfo.args, { from: account });
                // do not send this value in API call. only meant for txGas
                gasLimitNum = ethers.BigNumber.from(txGas.toString())
                  .add(ethers.BigNumber.from(5000))
                  .toNumber();

                _logMessage(`Gas limit (txGas) calculated for method ${methodName} in SDK: ${gasLimitNum}`);
              }
              else {
                let error = formatMessage(
                  RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
                  `Smart contract ABI not found!`
                );
                eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
                end(error);
              }
            } else {
              _logMessage(`txGas supplied for this Trusted Forwarder call is ${Number(txGas)}`);
              gasLimitNum = ethers.BigNumber.from(
                txGas.toString()
              ).toNumber();
              _logMessage("gas limit number for txGas " + gasLimitNum);
            }

            let forwarderToAttach = await findTheRightForwarder(engine, to);

            const request = (
              await buildForwardTxRequest(
                account,
                to,
                parseInt(gasLimitNum), //txGas
                forwardedData,
                biconomyForwarder.attach(forwarderToAttach),
                customBatchId
              )
            ).request;
            _logMessage(request);

            paramArray.push(request);

            forwarderDomainData.verifyingContract = forwarderToAttach;
            let domainDataToUse = forwarderDomainDetails[forwarderToAttach];

            if (customDomainName) {
              domainDataToUse.name = customDomainName.toString();
            }

            if (customDomainVersion) {
              domainDataToUse.version = customDomainVersion.toString();
            }

            if (signatureType && signatureType == engine.EIP712_SIGN) {
              _logMessage("EIP712 signature flow");
              // Update the verifyingContract field of domain data based on the current request
              const domainSeparator = getDomainSeperator(
                domainDataToUse
              );
              _logMessage("Domain separator to be used:")
              _logMessage(domainSeparator);
              paramArray.push(domainSeparator);
              let signatureEIP712;
              if (signatureFromPayload) {
                signatureEIP712 = signatureFromPayload;
                _logMessage(`EIP712 signature from payload is ${signatureEIP712}`);
              } else {
                signatureEIP712 = await getSignatureEIP712(
                  engine,
                  account,
                  request,
                  forwarderToAttach,
                  domainDataToUse,
                  signTypedDataType
                );
                _logMessage(`EIP712 signature is ${signatureEIP712}`);
              }
              paramArray.push(signatureEIP712);
            } else {
              _logMessage("Personal signature flow");
              let signaturePersonal;
              if (signatureFromPayload) {
                signaturePersonal = signatureFromPayload;
                _logMessage(`Personal signature from payload is ${signaturePersonal}`);
              } else {
                signaturePersonal = await getSignaturePersonal(
                  engine,
                  request
                );
                _logMessage(`Personal signature is ${signaturePersonal}`);
              }
              if (signaturePersonal) {
                paramArray.push(signaturePersonal);
              } else {
                throw new Error("Could not get personal signature while processing transaction in Mexa SDK. Please check the providers you have passed to Biconomy")
              }
            }

            let data = {};
            data.from = account;
            data.apiId = api.id;
            data.params = paramArray;
            data.to = to;
            //gasLimit for entire transaction
            //This will be calculated at the backend again
            data.gasLimit = gasLimit;
            if (signatureType && signatureType == engine.EIP712_SIGN) {
              data.signatureType = engine.EIP712_SIGN;
            }
            await _sendTransaction(engine, account, api, data, end, payload);
          } else {
            paramArray.push(...methodInfo.args);

            let data = {};
            data.from = account;
            data.apiId = api.id;
            data.params = paramArray;
            data.gasLimit = gasLimit;
            data.to = to;
            data.webHookAttributes = webHookAttributes;
            _sendTransaction(engine, account, api, data, end, payload);
          }
        } else {
          let error = formatMessage(
            RESPONSE_CODES.INVALID_OPERATION,
            `Biconomy smart contract wallets are not supported now. On dashboard, re-register your smart contract methods with "native meta tx" checkbox selected.`
          );
          eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
          return end(error);
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
          try {
            return callDefaultProvider(engine, payload, end, `Current provider can't send transactions and smart contract ${to} not found on Biconomy Dashbaord`);
          } catch (error) {
            return end(error);
          }
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
  catch (error) {
    return end(error);
  }
}

async function callDefaultProvider(engine, payload, callback, errorMessage) {
  try {
    let targetProvider = getTargetProvider(engine);
    if (targetProvider) {
      if (isEthersProvider(targetProvider)) {
        let responseFromProvider = await targetProvider.send(payload.method, payload.params);
        _logMessage("Response from original provider", responseFromProvider);
        callback(null, responseFromProvider);
        return responseFromProvider;
      } else {
        return targetProvider.send(payload, callback);
      }
    }
    else {
      _logMessage("No provider present in Biconomy that can sign messages");
      throw new Error(errorMessage);
    }
  } catch (e) {
    _logMessage("Unexpected error occured when calling default provider");
    _logMessage(e);
    return callback(e);
  }
}


function _getEIP712ForwardMessageToSign(request, forwarder, domainData) {
  // Update the verifyingContract field of domain data based on the current request
  if (!forwarderDomainType || !forwardRequestType || !forwarderDomainData || !forwarder) {
    throw new Error("Biconomy is not properly initialized");
  }

  if (!forwarderDomainDetails || Object.keys(forwarderDomainDetails).length === 0) {
    throw new Error("Biconomy is not properly initialized");
  }

  //Override domainData
  let domainDataToUse = domainData;
  //Might update version as well

  let dataToSign = JSON.stringify({
    types: {
      EIP712Domain: forwarderDomainType,
      ERC20ForwardRequest: forwardRequestType,
    },
    domain: domainDataToUse,
    primaryType: "ERC20ForwardRequest",
    message: request,
  });
  return dataToSign;
}

function _getPersonalForwardMessageToSign(request) {
  return abi.soliditySHA3(
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
}

function getTargetProvider(engine) {
  let provider;
  if (engine) {
    provider = engine.originalProvider;
    if (!engine.canSignMessages) {
      if (!engine.walletProvider) {
        //comment this out and just log
        //throw new Error(`Please pass a provider connected to a wallet that can sign messages in Biconomy options.`);
        _logMessage("Please pass a provider connected to a wallet that can sign messages in Biconomy options");
      } else {
        provider = engine.walletProvider;
      }
    }
  }
  return provider;
}

function getSignatureParameters(signature) {
  if (!ethers.utils.isHexString(signature)) {
    throw new Error(
      'Given value "'.concat(signature, '" is not a valid hex string.')
    );
  }
  var r = signature.slice(0, 66);
  var s = "0x".concat(signature.slice(66, 130));
  var v = "0x".concat(signature.slice(130, 132));
  v = ethers.BigNumber.from(v).toNumber();
  if (![27, 28].includes(v)) v += 27;
  return {
    r: r,
    s: s,
    v: v
  };
}

async function findTheRightForwarder(engine, to) {
  let forwarderToUse;
  let ethersProvider;
  if (smartContractTrustedForwarderMap[to]) {
    forwarderToUse = smartContractTrustedForwarderMap[to];
  } else {
    if (engine.isEthersProviderPresent) {
      ethersProvider = engine.originalProvider;
    } else {
      ethersProvider = new ethers.providers.Web3Provider(
        engine.originalProvider
      );
    }
    let contract = new ethers.Contract(to, eip2771BaseAbi, ethersProvider);
    let supportedForwarders = engine.forwarderAddresses;
    forwarderToUse = engine.forwarderAddress; //default forwarder

    // Attempt to find out forwarder that 'to' contract trusts
    let forwarder;
    try {
      forwarder = await contract.trustedForwarder();
    } catch (error) {
      _logMessage("Could not find read method 'trustedForwarder' in the contract abi");
      _logMessage(error);
    }

    for (var i = 0; i < supportedForwarders.length; i++) {
      // Check if it matches above forwarder
      if (forwarder) {
        if (supportedForwarders[i].toString() == forwarder.toString()) {
          forwarderToUse = supportedForwarders[i];
          break;
        }
      }
      // Another way to find out is isTrustedForwarder read method
      try {
        let isTrustedForwarder = await contract.isTrustedForwarder(supportedForwarders[i]);
        if (isTrustedForwarder) {
          forwarderToUse = supportedForwarders[i];
          break;
        }
      } catch (error) {
        _logMessage("Could not find read method 'isTrustedForwarder' in the contract abi");
        _logMessage(error);
      }
    }
    smartContractTrustedForwarderMap[to] = forwarderToUse;
  }
  return forwarderToUse;
}

//take parameter for chosen signature type V3 or V4
function getSignatureEIP712(engine, account, request, forwarder, domainData, type) {
  //default V4 now   
  let signTypedDataType = "eth_signTypedData_v4";
  if (type === "v3" || type === "V3") {
    signTypedDataType = "eth_signTypedData_v3";
  }
  const dataToSign = _getEIP712ForwardMessageToSign(request, forwarder, domainData);
  let targetProvider = getTargetProvider(engine);
  if (!targetProvider) {
    throw new Error(`Unable to get provider information passed to Biconomy`);
  }
  const promise = new Promise(async function (resolve, reject) {
    if (targetProvider) {
      if (isEthersProvider(targetProvider)) {
        try {
          let signature = await targetProvider.send(signTypedDataType, [account, dataToSign]);
          let { r, s, v } = getSignatureParameters(signature);
          v = ethers.BigNumber.from(v).toHexString();
          let newSignature = r + s.slice(2) + v.slice(2);
          resolve(newSignature);
        } catch (error) {
          reject(error);
        }
      } else {
        await targetProvider.send(
          {
            jsonrpc: "2.0",
            id: 999999999999,
            method: signTypedDataType,
            params: [account, dataToSign],
          },
          function (error, res) {
            if (error) {
              reject(error);
            } else {
              let oldSignature = res.result;
              let { r, s, v } = getSignatureParameters(oldSignature);
              v = ethers.BigNumber.from(v).toHexString();
              let newSignature = r + s.slice(2) + v.slice(2);
              resolve(newSignature);
            }
          }
        );
      }
    } else {
      reject(`Could not get signature from the provider passed to Biconomy. Check if you have passed a walletProvider in Biconomy Options.`);
    }
  });

  return promise;
}

async function getSignaturePersonal(engine, req) {
  const hashToSign = _getPersonalForwardMessageToSign(req);
  if (!engine.signer && !engine.walletProvider) {
    throw new Error(`Can't sign messages with current provider. Did you forget to pass walletProvider in Biconomy options?`);
  }
  let signature;
  let targetProvider = getTargetProvider(engine);

  if (!targetProvider) {
    throw new Error(`Unable to get provider information passed to Biconomy`);
  }

  let providerWithSigner;

  if (isEthersProvider(targetProvider)) {
    providerWithSigner = targetProvider;
  } else {
    providerWithSigner = new ethers.providers.Web3Provider(targetProvider);
  }

  let signer = providerWithSigner.getSigner();
  const promise = new Promise(async function (resolve, reject) {
    try {
      signature = await signer.signMessage(ethers.utils.arrayify(hashToSign));
      let { r, s, v } = getSignatureParameters(signature);
      v = ethers.BigNumber.from(v).toHexString();
      let newSignature = r + s.slice(2) + v.slice(2);
      resolve(newSignature);
    } catch (error) {
      reject(error);
    }
  });
  return promise;
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
      interfaceMap: interfaceMap,
      signType: {
        EIP712_SIGN: engine.EIP712_SIGN,
        PERSONAL_SIGN: engine.PERSONAL_SIGN,
      },
    };
    let targetProvider = getTargetProvider(engine);
    /*if(!targetProvider) {
      throw new Error(`Unable to get provider information passed to Biconomy`);
    }*/
    let ethersProvider;
    if (engine.isEthersProviderPresent) {
      ethersProvider = engine.originalProvider;
    } else {
      ethersProvider = new ethers.providers.Web3Provider(
        engine.originalProvider
      );
    }
    const signer = ethersProvider.getSigner();
    let signerOrProvider = signer;
    let isSignerWithAccounts = true;
    try {
      await signer.getAddress();
      engine.canSignMessages = true;
    } catch (error) {
      _logMessage("Given provider does not have accounts information");
      signerOrProvider = ethersProvider;
      isSignerWithAccounts = false;
      engine.canSignMessages = false;
    }
    const erc20ForwarderAddress =
      engine.options.erc20ForwarderAddress || engine.erc20ForwarderAddress;
    const transferHandlerAddress =
      engine.options.transferHandlerAddress || engine.transferHandlerAddress;

    // Has to be biconomy wrapped provider in order to make gasless calls!
    if (engine.walletFactoryAddress) {
      engine.biconomyWalletClient = new BiconomyWalletClient({
        biconomyProvider: engine,
        provider: ethersProvider,
        targetProvider,
        isSignerWithAccounts,
        biconomyAttributes,
        walletFactoryAddress: engine.walletFactoryAddress,
        baseWalletAddress: engine.baseWalletAddress,
        entryPointAddress: engine.entryPointAddress,
        handlerAddress: engine.handlerAddress,
        networkId: engine.networkId
      })
      _logMessage(engine.biconomyWalletClient);
    }

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

      //If ERC20 Forwarder Address exits then it would have configured Forwarder 
      const forwarder = new ethers.Contract(
        forwarderAddress,
        biconomyForwarderAbi,
        signerOrProvider
      );
      const requiredDomainData = forwarderDomainDetails[forwarderAddress];
      const transferHandler = new ethers.Contract(
        transferHandlerAddress,
        transferHandlerAbi,
        signerOrProvider
      );
      const tokenGasPriceV1SupportedNetworks =
        engine.tokenGasPriceV1SupportedNetworks;

      engine.permitClient = new PermitClient(
        engine,
        erc20ForwarderAddress,
        engine.daiTokenAddress
      );
      //TODO
      //Review initialisation of ERC20 Forwarder as well!
      engine.erc20ForwarderClient = new ERC20ForwarderClient({
        forwarderClientOptions: biconomyAttributes,
        networkId: engine.networkId,
        provider: ethersProvider,
        targetProvider: targetProvider,
        forwarderDomainData: requiredDomainData,
        forwarderDomainDetails,
        forwarderDomainType,
        erc20Forwarder,
        transferHandler,
        forwarder,
        oracleAggregator,
        feeManager,
        isSignerWithAccounts,
        tokenGasPriceV1SupportedNetworks,
        trustedForwarderOverhead,
        daiPermitOverhead,
        eip2612PermitOverhead
      });

      _logMessage(engine.permitClient);
      _logMessage(engine.erc20ForwarderClient);
    }
    else {
      _logMessage("ERC20 Forwarder is not supported for this network");
      //Warning : you would not be able to use ERC20ForwarderClient and PermitClient 
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
      engine.originalProvider.send(
        {
          jsonrpc: JSON_RPC_VERSION,
          id: id,
          method: "eth_accounts",
          params: [],
        },
        (error, response) => {
          cb(error, response);
        }
      );
    } else {
      return new Promise(function (resolve, reject) {
        engine.originalProvider.send(
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
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param engine Object representing biconomy provider engine
 * @param account User selected account on current wallet
 * @param api API object got from biconomy server
 * @param data Data to be sent to biconomy server having transaction data
 * @param cb Callback method to be called to pass result or send error
 **/
async function _sendTransaction(engine, account, api, data, cb, payload) {
  if (engine && account && api && data) {
    let url = api.url;
    let fetchOption = getFetchOptions("POST", engine.apiKey);
    fetchOption.body = JSON.stringify(data);
    //TODO
    /*Before making API call to the core, Using other core APIs or sysinfi, sdk can check for customisation needs and pre flights like
    1. Whitelisting of user addresses, conditional whitelisting
    2. Gas price range validations
    3. Dapp, User and Method limit breaches
    etc
    and make it fallback to default provider!
    */
    fetch(`${baseURL}${url}`, fetchOption)
      .then((response) => response.json())
      .then(function (result) {
        _logMessage(result);
        if (
          !result.txHash &&
          result.flag != BICONOMY_RESPONSE_CODES.ACTION_COMPLETE &&
          result.flag != BICONOMY_RESPONSE_CODES.SUCCESS
        ) {
          // check if conditions not met error code
          if (result.code == BICONOMY_RESPONSE_CODES.CONDITIONS_NOT_SATISFIED) {
            if (engine.strictMode) {
              let error = formatMessage(
                RESPONSE_CODES.CONDITIONS_NOT_SATISFIED,
                `Conditions not met for given webhook attributes`
              );
              return cb(error);
            } else {
              _logMessage(
                "Strict mode is off so falling back to default provider for handling transaction"
              );

              try {
                return callDefaultProvider(engine, payload, cb, `Conditions not met for given webhook attributes`);
              }
              catch (error) {
                return cb(error);
              }
            }
          }

          if (result.code == BICONOMY_RESPONSE_CODES.GAS_CAP_LIMIT_EXECEED) {
            if (engine.strictMode) {
              let error = formatMessage(
                RESPONSE_CODES.GAS_CAP_LIMIT_EXECEED,
                result.message ? result.message : "Gas Cap Limit exceeded"
              );
              return cb(error);
            } else {
              _logMessage(
                "Strict mode is off so falling back to default provider for handling transaction"
              );

              try {
                return callDefaultProvider(engine, payload, cb, result.message ? result.message : "Gas Cap Limit exceeded");
              }
              catch (error) {
                return cb(error);
              }
            }
          }


          //Any error from relayer infra
          //TODO
          //Involve fallback here with callDefaultProvider
          let error = {};
          error.code = result.flag || result.code;
          if (result.flag == BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
            error.code = RESPONSE_CODES.USER_CONTRACT_NOT_FOUND;
          }
          error.message = result.log || result.message;
          if (cb) cb(error);
        } else {
          //TODO
          //Include listerner that will itself check for resubmitted hash api and serve over a socket?
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

    engine.signer = await engine.ethersProvider.getSigner();
    // Check current network id and dapp network id registered on dashboard
    let getDappAPI = `${baseURL}/api/${config.version}/dapp`;
    fetch(getDappAPI, getFetchOptions("GET", apiKey))
      .then(function (response) {
        return response.json();
      })
      .then(async function (dappResponse) {
        _logMessage(dappResponse);
        if (dappResponse && dappResponse.dapp) {
          let dappNetworkId = dappResponse.dapp.networkId;
          let dappId = dappResponse.dapp._id;
          _logMessage(
            `Network id corresponding to dapp id ${dappId} is ${dappNetworkId}`
          );
          let getNetworkIdOption = {
            jsonrpc: JSON_RPC_VERSION,
            id: "102",
            method: "eth_chainId",
            params: [],
          };
          if (isEthersProvider(engine.originalProvider)) {
            let providerNetworkId = await engine.originalProvider.send("eth_chainId", []);
            if (providerNetworkId) {
              providerNetworkId = parseInt(providerNetworkId.toString());
              onNetworkId(engine, { providerNetworkId, dappNetworkId, apiKey, dappId });
            } else {
              return eventEmitter.emit(
                EVENTS.BICONOMY_ERROR,
                formatMessage(
                  RESPONSE_CODES.NETWORK_ID_NOT_FOUND,
                  "Could not get network version"
                ),
                "Could not get network version"
              );
            }
          } else {
            engine.originalProvider.send(getNetworkIdOption,
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
                  let providerNetworkId = parseInt(networkResponse.result.toString());
                  onNetworkId(engine, { providerNetworkId, dappNetworkId, apiKey, dappId });
                }
              }
            );
          }
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

function isEthersProvider(provider) {
  return ethers.providers.Provider.isProvider(provider);
}

async function onNetworkId(engine, { providerNetworkId, dappNetworkId, apiKey, dappId }) {
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
          forwarderDomainType = systemInfo.forwarderDomainType;
          metaInfoType = systemInfo.metaInfoType;
          relayerPaymentType = systemInfo.relayerPaymentType;
          metaTransactionType = systemInfo.metaTransactionType;
          loginDomainType = systemInfo.loginDomainType;
          loginMessageType = systemInfo.loginMessageType;
          loginDomainData = systemInfo.loginDomainData;
          forwardRequestType = systemInfo.forwardRequestType;
          forwarderDomainData = systemInfo.forwarderDomainData;
          forwarderDomainDetails = systemInfo.forwarderDomainDetails;
          trustedForwarderOverhead = systemInfo.overHeadEIP712Sign;
          daiPermitOverhead = systemInfo.overHeadDaiPermit;
          eip2612PermitOverhead = systemInfo.overHeadEIP2612Permit;
          engine.forwarderAddress =
            systemInfo.biconomyForwarderAddress;
          engine.forwarderAddresses =
            systemInfo.biconomyForwarderAddresses;
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
          engine.walletFactoryAddress = systemInfo.walletFactoryAddress;
          engine.baseWalletAddress = systemInfo.baseWalletAddress;
          engine.entryPointAddress = systemInfo.entryPointAddress;
          engine.handlerAddress = systemInfo.handlerAddress;

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

        // check if Valid trusted forwarder address is present from system info

        if (engine.forwarderAddress && engine.forwarderAddress != "") {
          //let supportedForwarders = engine.forwarderAddresses;
          // prevent initialising it here as system info could return an array of forwarder addresses
          biconomyForwarder = new ethers.Contract(
            //pick up first forwarder address from the array by default then attach to an address accordingly
            engine.forwarderAddress,
            biconomyForwarderAbi,
            engine.ethersProvider
          );
        }
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
                let contractInterface = new ethers.utils.Interface(JSON.parse(contract.abi));
                if (contract.type === config.SCW) {
                  smartContractMetaTransactionMap[config.SCW] = contract.metaTransactionType;
                  interfaceMap[config.SCW] = contractInterface;
                  smartContractMap[config.SCW] = contract.abi;
                } else {
                  smartContractMetaTransactionMap[
                    contract.address.toLowerCase()
                  ] = contract.metaTransactionType;
                  interfaceMap[
                    contract.address.toLowerCase()
                  ] = contractInterface;
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

module.exports = Biconomy;
