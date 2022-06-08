"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var Promise = require("promise");

var ethers = require("ethers");

var txDecoder = require("ethereum-tx-decoder");

var abi = require("ethereumjs-abi");

var _require = require("./util"),
    toJSONRPCPayload = _require.toJSONRPCPayload;

var _require2 = require("./abis"),
    eip2771BaseAbi = _require2.eip2771BaseAbi;

var _require3 = require("./config"),
    config = _require3.config,
    RESPONSE_CODES = _require3.RESPONSE_CODES,
    EVENTS = _require3.EVENTS,
    BICONOMY_RESPONSE_CODES = _require3.BICONOMY_RESPONSE_CODES,
    STATUS = _require3.STATUS;

var DEFAULT_PAYLOAD_ID = "99999999";
var baseURL = config.baseURL;
var JSON_RPC_VERSION = config.JSON_RPC_VERSION;
var NATIVE_META_TX_URL = config.nativeMetaTxUrl;

var PermitClient = require("./PermitClient");

var ERC20ForwarderClient = require("./ERC20ForwarderClient");

var BiconomyWalletClient = require("./BiconomyWalletClient");

var _require4 = require("./biconomyforwarder"),
    buildForwardTxRequest = _require4.buildForwardTxRequest,
    getDomainSeperator = _require4.getDomainSeperator;

var _require5 = require("./abis"),
    erc20ForwarderAbi = _require5.erc20ForwarderAbi,
    oracleAggregatorAbi = _require5.oracleAggregatorAbi,
    feeManagerAbi = _require5.feeManagerAbi,
    biconomyForwarderAbi = _require5.biconomyForwarderAbi,
    transferHandlerAbi = _require5.transferHandlerAbi;

var fetch = require("cross-fetch");

var interfaceMap = {},
    smartContractMap = {},
    smartContractMetaTransactionMap = {},
    smartContractTrustedForwarderMap = {};
var biconomyForwarder;

var events = require("events");

var eventEmitter = new events.EventEmitter();
var trustedForwarderOverhead;
var daiPermitOverhead;
var eip2612PermitOverhead;
var domainType, forwarderDomainType, metaInfoType, relayerPaymentType, metaTransactionType, forwardRequestType; //domaindata would be sourced from forwarder -> domain details mapping

var domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract
};
var daiDomainData = {
  name: config.daiDomainName,
  version: config.daiVersion
};
var forwarderDomainData, forwarderDomainDetails; // EIP712 format data for login

var loginDomainType, loginMessageType, loginDomainData;

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
    messageId: 0
  };
  this.originalProvider = provider;
  this.isEthersProviderPresent = false;
  this.canSignMessages = false;

  if (options.debug) {
    config.logsEnabled = true;
  }

  if (options.walletProvider) {
    if (isEthersProvider(options.walletProvider)) {
      throw new Error("Wallet Provider in options can't be an ethers provider. Please pass the provider you get from your wallet directly.");
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

    var proto = Object.getPrototypeOf(provider);
    var keys = Object.getOwnPropertyNames(proto);

    for (var i = 0; i < keys.length; i++) {
      this[keys[i]] = provider[keys[i]];
    }

    for (var key in provider) {
      if (!this[key]) {
        this[key] = provider[key];
      }
    }

    var self = this;

    this.send = function (payload, cb) {
      var _this = this;

      if (typeof payload === "string") {
        // Ethers provider is being used to call methods, so payload is actually method, and cb is params
        payload = {
          id: 1,
          jsonrpc: "2.0",
          method: payload,
          params: cb
        };
      }

      if (payload.method == "eth_sendTransaction") {
        return new Promise(function (resolve, reject) {
          handleSendTransaction(_this, payload, function (error, result) {
            var response = _this._createJsonRpcResponse(payload, error, result);

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
        return new Promise(function (resolve, reject) {
          sendSignedTransaction(_this, payload, function (error, result) {
            var response = _this._createJsonRpcResponse(payload, error, result);

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
      var payload = {
        method: args.method,
        params: args.params
      };

      if (payload.method == "eth_sendTransaction") {
        return new Promise(function (resolve, reject) {
          handleSendTransaction(self, payload, function (error, result) {
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
        return new Promise(function (resolve, reject) {
          sendSignedTransaction(self, payload, function (error, result) {
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
          return new Promise( /*#__PURE__*/function () {
            var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(resolve, reject) {
              var jsonRPCPaylod, localResult;
              return _regenerator["default"].wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      jsonRPCPaylod = toJSONRPCPayload(self, payload.method, payload.params);

                      if (!self.isEthersProviderPresent) {
                        _context.next = 14;
                        break;
                      }

                      _context.prev = 2;
                      _context.next = 5;
                      return self.originalProvider.send(jsonRPCPaylod.method, jsonRPCPaylod.params);

                    case 5:
                      localResult = _context.sent;
                      resolve(localResult);
                      _context.next = 12;
                      break;

                    case 9:
                      _context.prev = 9;
                      _context.t0 = _context["catch"](2);
                      reject(_context.t0);

                    case 12:
                      _context.next = 15;
                      break;

                    case 14:
                      self.originalProvider.send(jsonRPCPaylod, function (err, response) {
                        if (err) {
                          return reject(err);
                        }

                        if (response.result) {
                          resolve(response.result);
                        } else {
                          resolve(response);
                        }
                      });

                    case 15:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee, null, [[2, 9]]);
            }));

            return function (_x, _x2) {
              return _ref.apply(this, arguments);
            };
          }());
        } else {
          return Promise.reject("Invalid provider object passed to Biconomy as it doesn't support request or send method");
        }
      }
    };

    this.sendAsync = this.send;
  } else {
    throw new Error("Please pass a provider to Biconomy.");
  }
}

Biconomy.prototype.getSignerByAddress = function (userAddress) {
  var provider = this.getEthersProvider();
  var signer = provider.getSigner();
  signer = signer.connectUnchecked();
  signer.getAddress = /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            return _context2.abrupt("return", userAddress);

          case 1:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return signer;
};

Biconomy.prototype.getEthersProvider = function () {
  return new ethers.providers.Web3Provider(this);
}; //TODO
//Allow to provide custom txGas


Biconomy.prototype.getForwardRequestAndMessageToSign = function (rawTransaction, tokenAddress, customBatchId, customDomainName, customDomainVersion, cb) {
  try {
    var engine = this;
    return new Promise( /*#__PURE__*/function () {
      var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(resolve, reject) {
        var decodedTx, to, methodInfo, error, methodName, token, api, metaTxApproach, contractAddr, _error, parsedTransaction, account, gasLimit, gasLimitNum, contractABI, contract, _contract$estimateGas, _error2, request, cost, forwarderToUse, buildTxResponse, _error3, domainDataToUse, eip712DataToSign, hashToSign, dataToSign, _error4;

        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!rawTransaction) {
                  _context3.next = 80;
                  break;
                }

                decodedTx = txDecoder.decodeTx(rawTransaction);

                if (!(decodedTx.to && decodedTx.data && decodedTx.value)) {
                  _context3.next = 77;
                  break;
                }

                to = decodedTx.to.toLowerCase();
                methodInfo = decodeMethod(to, decodedTx.data);

                if (methodInfo) {
                  _context3.next = 9;
                  break;
                }

                error = formatMessage(RESPONSE_CODES.DASHBOARD_DATA_MISMATCH, "Smart Contract address registered on dashboard is different than what is sent(".concat(decodedTx.to, ") in current transaction"));
                if (cb) cb(error);
                return _context3.abrupt("return", reject(error));

              case 9:
                methodName = methodInfo.name; //token address needs to be passed otherwise fees will be charged in DAI by default, given DAI permit is given

                token = tokenAddress ? tokenAddress : engine.daiTokenAddress;

                _logMessage(tokenAddress);

                api = engine.dappAPIMap[to] ? engine.dappAPIMap[to][methodName] : undefined;

                if (!api) {
                  api = engine.dappAPIMap[config.SCW] ? engine.dappAPIMap[config.SCW][methodName] : undefined;
                  metaTxApproach = smartContractMetaTransactionMap[config.SCW];
                } else {
                  contractAddr = api.contractAddress.toLowerCase();
                  metaTxApproach = smartContractMetaTransactionMap[contractAddr];
                }

                if (api) {
                  _context3.next = 19;
                  break;
                }

                _logMessage("API not found for method ".concat(methodName));

                _error = formatMessage(RESPONSE_CODES.API_NOT_FOUND, "No API found on dashboard for called method ".concat(methodName));
                if (cb) cb(_error);
                return _context3.abrupt("return", reject(_error));

              case 19:
                _logMessage("API found");

                parsedTransaction = ethers.utils.parseTransaction(rawTransaction);
                account = parsedTransaction.from;

                _logMessage("Signer is ".concat(account));

                gasLimit = decodedTx.gasLimit;

                if (!(!gasLimit || parseInt(gasLimit) == 0)) {
                  _context3.next = 41;
                  break;
                }

                contractABI = smartContractMap[to];

                if (!contractABI) {
                  _context3.next = 39;
                  break;
                }

                contract = new ethers.Contract(to, JSON.parse(contractABI), engine.ethersProvider);
                _context3.prev = 28;
                _context3.next = 31;
                return (_contract$estimateGas = contract.estimateGas)[methodInfo.signature].apply(_contract$estimateGas, (0, _toConsumableArray2["default"])(methodInfo.args).concat([{
                  from: account
                }]));

              case 31:
                gasLimit = _context3.sent;
                _context3.next = 37;
                break;

              case 34:
                _context3.prev = 34;
                _context3.t0 = _context3["catch"](28);
                return _context3.abrupt("return", reject(_context3.t0));

              case 37:
                // Do not send this value in API call. only meant for txGas
                gasLimitNum = ethers.BigNumber.from(gasLimit.toString()).add(ethers.BigNumber.from(5000)).toNumber();

                _logMessage("Gas limit number ".concat(gasLimitNum));

              case 39:
                _context3.next = 42;
                break;

              case 41:
                gasLimitNum = ethers.BigNumber.from(gasLimit.toString()).toNumber();

              case 42:
                if (account) {
                  _context3.next = 45;
                  break;
                }

                _error2 = formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Not able to get user account from signed transaction");
                return _context3.abrupt("return", end(_error2));

              case 45:
                if (!(metaTxApproach == engine.TRUSTED_FORWARDER)) {
                  _context3.next = 54;
                  break;
                }

                _context3.next = 48;
                return findTheRightForwarder(engine, to);

              case 48:
                forwarderToUse = _context3.sent;
                _context3.next = 51;
                return buildForwardTxRequest(account, to, gasLimitNum, decodedTx.data, biconomyForwarder.attach(forwarderToUse), customBatchId);

              case 51:
                request = _context3.sent.request;
                _context3.next = 64;
                break;

              case 54:
                if (!(metaTxApproach == engine.ERC20_FORWARDER)) {
                  _context3.next = 61;
                  break;
                }

                _context3.next = 57;
                return engine.erc20ForwarderClient.buildTx({
                  userAddress: account,
                  to: to,
                  txGas: gasLimitNum,
                  data: decodedTx.data,
                  token: token
                });

              case 57:
                buildTxResponse = _context3.sent;

                if (buildTxResponse) {
                  request = buildTxResponse.request;
                  cost = buildTxResponse.cost;
                } else {
                  reject(formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Unable to build forwarder request"));
                }

                _context3.next = 64;
                break;

              case 61:
                _error3 = formatMessage(RESPONSE_CODES.INVALID_OPERATION, "Smart contract is not registered in the dashboard for this meta transaction approach. Kindly use biconomy.getUserMessageToSign");
                if (cb) cb(_error3);
                return _context3.abrupt("return", reject(_error3));

              case 64:
                _logMessage("Forward Request is: ");

                _logMessage(request); // Update the verifyingContract field of domain data based on the current request


                forwarderDomainData.verifyingContract = forwarderToUse;
                domainDataToUse = forwarderDomainDetails[forwarderToUse];

                if (customDomainName) {
                  domainDataToUse.name = customDomainName.toString();
                }

                if (customDomainVersion) {
                  domainDataToUse.version = customDomainVersion.toString();
                }

                eip712DataToSign = {
                  types: {
                    EIP712Domain: forwarderDomainType,
                    ERC20ForwardRequest: forwardRequestType
                  },
                  domain: domainDataToUse,
                  primaryType: "ERC20ForwardRequest",
                  message: request
                };
                hashToSign = abi.soliditySHA3(["address", "address", "address", "uint256", "uint256", "uint256", "uint256", "uint256", "bytes32"], [request.from, request.to, request.token, request.txGas, request.tokenGasPrice, request.batchId, request.batchNonce, request.deadline, ethers.utils.keccak256(request.data)]);
                dataToSign = {
                  eip712Format: eip712DataToSign,
                  personalSignatureFormat: hashToSign,
                  request: request,
                  cost: cost
                };
                if (cb) cb(null, dataToSign);
                return _context3.abrupt("return", resolve(dataToSign));

              case 77:
                _error4 = formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED, "Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard");
                if (cb) cb(_error4);
                return _context3.abrupt("return", reject(_error4));

              case 80:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, null, [[28, 34]]);
      }));

      return function (_x3, _x4) {
        return _ref3.apply(this, arguments);
      };
    }());
  } catch (error) {
    return end(error);
  }
};
/**
 * Method used to listen to events emitted from the SDK
 */


Biconomy.prototype.onEvent = function (type, callback) {
  if (type == this.READY || type == this.ERROR || type == this.LOGIN_CONFIRMATION) {
    eventEmitter.on(type, callback);
    return this;
  } else {
    throw formatMessage(RESPONSE_CODES.EVENT_NOT_SUPPORTED, "".concat(type, " event is not supported."));
  }
};
/**
 * Create a JSON RPC response from the given error and result parameter.
 **/


Biconomy.prototype._createJsonRpcResponse = function (payload, error, result) {
  var response = {};
  response.id = payload.id;
  response.jsonrpc = JSON_RPC_VERSION;

  if ((!error || error == null) && !result) {
    response.error = "Unexpected error has occurred. Please contact Biconomy Team";
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
};

function decodeMethod(to, data) {
  if (to && data && interfaceMap[to]) {
    return interfaceMap[to].parseTransaction({
      data: data
    });
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


function sendSignedTransaction(_x5, _x6, _x7) {
  return _sendSignedTransaction.apply(this, arguments);
}
/**
 * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v4
 * method and send the request to biconomy for processing and call the callback method 'end'
 * with transaction hash.
 *
 * This is an internal function that is called while intercepting eth_sendTransaction RPC method call.
 **/


function _sendSignedTransaction() {
  _sendSignedTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(engine, payload, end) {
    var data, rawTransaction, signature, request, signatureType, customDomainName, customDomainVersion, decodedTx, to, methodInfo, error, methodName, api, metaTxApproach, contractAddr, _error5, paramArray, parsedTransaction, account, _error6, forwardedData, gasLimitNum, gasLimit, contractABI, _contract$estimateGas2, contract, forwarderToUse, domainDataToUse, domainSeparator, _data, _data2, relayerPayment, _data3, _error7, _error8, _error9, _error10;

    return _regenerator["default"].wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            if (!(payload && payload.params[0])) {
              _context7.next = 114;
              break;
            }

            data = payload.params[0];

            // user would need to pass token address as well!
            // OR they could pass the symbol and engine will provide the address for you..
            // default is DAI
            if (typeof data == "string") {
              // Here user send the rawTransaction in the payload directly. Probably the case of native meta transaction
              // Handle this scenario differently?
              rawTransaction = data;
            } else if ((0, _typeof2["default"])(data) == "object") {
              // Here user wrapped raw Transaction in json object along with signature
              signature = data.signature;
              rawTransaction = data.rawTransaction;
              signatureType = data.signatureType;
              request = data.forwardRequest;
              customDomainName = data.domainName;
              customDomainVersion = data.domainVersion;
            }

            if (!rawTransaction) {
              _context7.next = 109;
              break;
            }

            decodedTx = txDecoder.decodeTx(rawTransaction);

            if (!(decodedTx.to && decodedTx.data && decodedTx.value)) {
              _context7.next = 104;
              break;
            }

            to = decodedTx.to.toLowerCase();
            methodInfo = decodeMethod(to, decodedTx.data);

            if (methodInfo) {
              _context7.next = 25;
              break;
            }

            methodInfo = decodeMethod(config.SCW, decodedTx.data);

            if (methodInfo) {
              _context7.next = 25;
              break;
            }

            if (!engine.strictMode) {
              _context7.next = 16;
              break;
            }

            error = formatMessage(RESPONSE_CODES.DASHBOARD_DATA_MISMATCH, "No smart contract wallet or smart contract registered on dashboard with address (".concat(decodedTx.to, ")"));
            return _context7.abrupt("return", end(error));

          case 16:
            _logMessage("Strict mode is off so falling back to default provider for handling transaction");

            if ((0, _typeof2["default"])(data) == "object" && data.rawTransaction) {
              payload.params = [data.rawTransaction];
            }

            _context7.prev = 18;
            return _context7.abrupt("return", callDefaultProvider(engine, payload, end, "No smart contract wallet or smart contract registered on dashboard with address (".concat(decodedTx.to, ")")));

          case 22:
            _context7.prev = 22;
            _context7.t0 = _context7["catch"](18);
            return _context7.abrupt("return", end(_context7.t0));

          case 25:
            methodName = methodInfo.name;
            api = engine.dappAPIMap[to] ? engine.dappAPIMap[to][methodName] : undefined;

            if (!api) {
              api = engine.dappAPIMap[config.SCW] ? engine.dappAPIMap[config.SCW][methodName] : undefined;
              metaTxApproach = smartContractMetaTransactionMap[config.SCW];
            } else {
              contractAddr = api.contractAddress.toLowerCase();
              metaTxApproach = smartContractMetaTransactionMap[contractAddr];
            }

            if (api) {
              _context7.next = 45;
              break;
            }

            _logMessage("API not found for method ".concat(methodName));

            _logMessage("Strict mode ".concat(engine.strictMode));

            if (!engine.strictMode) {
              _context7.next = 36;
              break;
            }

            _error5 = formatMessage(RESPONSE_CODES.API_NOT_FOUND, "Biconomy strict mode is on. No registered API found for method ".concat(methodName, ". Please register API from developer dashboard."));
            return _context7.abrupt("return", end(_error5, null));

          case 36:
            _logMessage("Falling back to default provider as strict mode is false in biconomy");

            if ((0, _typeof2["default"])(data) == "object" && data.rawTransaction) {
              payload.params = [data.rawTransaction];
            }

            _context7.prev = 38;
            return _context7.abrupt("return", callDefaultProvider(engine, payload, end, "Current provider can not sign transactions. Make sure to register method ".concat(methodName, " on Biconomy Dashboard")));

          case 42:
            _context7.prev = 42;
            _context7.t1 = _context7["catch"](38);
            return _context7.abrupt("return", end(_context7.t1));

          case 45:
            _logMessage("API found");

            paramArray = [];
            parsedTransaction = ethers.utils.parseTransaction(rawTransaction);
            account = parsedTransaction ? parsedTransaction.from : undefined;

            _logMessage("signer is ".concat(account));

            if (account) {
              _context7.next = 53;
              break;
            }

            _error6 = formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Not able to get user account from signed transaction");
            return _context7.abrupt("return", end(_error6));

          case 53:
            gasLimit = decodedTx.gasLimit;

            if (!(api.url == NATIVE_META_TX_URL)) {
              _context7.next = 101;
              break;
            }

            if (!(metaTxApproach != engine.DEFAULT)) {
              _context7.next = 90;
              break;
            }

            // forwardedData = payload.params[0].data;
            forwardedData = decodedTx.data;

            if (!(!gasLimit || parseInt(gasLimit) == 0)) {
              _context7.next = 68;
              break;
            }

            contractABI = smartContractMap[to];

            if (!contractABI) {
              _context7.next = 66;
              break;
            }

            contract = new ethers.Contract(to, JSON.parse(contractABI), engine.ethersProvider);
            _context7.next = 63;
            return (_contract$estimateGas2 = contract.estimateGas)[methodInfo.signature].apply(_contract$estimateGas2, (0, _toConsumableArray2["default"])(methodInfo.args).concat([{
              from: account
            }]));

          case 63:
            gasLimit = _context7.sent;
            // do not send this value in API call. only meant for txGas
            gasLimitNum = ethers.BigNumber.from(gasLimit.toString()).add(ethers.BigNumber.from(5000)).toNumber();

            _logMessage("gas limit number" + gasLimitNum);

          case 66:
            _context7.next = 69;
            break;

          case 68:
            gasLimitNum = ethers.BigNumber.from(gasLimit.toString()).toNumber();

          case 69:
            _logMessage(request);

            paramArray.push(request);
            _context7.next = 73;
            return findTheRightForwarder(engine, to);

          case 73:
            forwarderToUse = _context7.sent;
            //Update the verifyingContract in domain data
            forwarderDomainData.verifyingContract = forwarderToUse;
            domainDataToUse = forwarderDomainDetails[forwarderToUse];

            if (customDomainName) {
              domainDataToUse.name = customDomainName.toString();
            }

            if (customDomainVersion) {
              domainDataToUse.version = customDomainVersion.toString();
            } // Update the verifyingContract field of domain data based on the current request


            if (signatureType && signatureType == engine.EIP712_SIGN) {
              domainSeparator = getDomainSeperator(domainDataToUse);

              _logMessage(domainSeparator);

              paramArray.push(domainSeparator);
            }

            paramArray.push(signature);
            _data = {};
            _data.from = account;
            _data.apiId = api.id;
            _data.params = paramArray;
            _data.to = to;

            if (signatureType && signatureType == engine.EIP712_SIGN) {
              _data.signatureType = engine.EIP712_SIGN;
            }

            _context7.next = 88;
            return _sendTransaction(engine, account, api, _data, end);

          case 88:
            _context7.next = 99;
            break;

          case 90:
            paramArray.push.apply(paramArray, (0, _toConsumableArray2["default"])(methodInfo.args));
            _data2 = {};
            _data2.from = account;
            _data2.apiId = api.id;
            _data2.params = paramArray;
            _data2.gasLimit = decodedTx.gasLimit.toString(); //verify

            _data2.to = decodedTx.to.toLowerCase();
            _context7.next = 99;
            return _sendTransaction(engine, account, api, _data2, end);

          case 99:
            _context7.next = 102;
            break;

          case 101:
            if (signature) {
              relayerPayment = {};
              relayerPayment.token = config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS;
              relayerPayment.amount = config.DEFAULT_RELAYER_PAYMENT_AMOUNT;
              _data3 = {};
              _data3.rawTx = rawTransaction;
              _data3.signature = signature;
              _data3.to = to;
              _data3.from = account;
              _data3.apiId = api.id;
              _data3.data = decodedTx.data;
              _data3.value = ethers.utils.hexValue(decodedTx.value);
              _data3.gasLimit = decodedTx.gasLimit.toString();
              _data3.nonceBatchId = config.NONCE_BATCH_ID;
              _data3.expiry = config.EXPIRY;
              _data3.baseGas = config.BASE_GAS;
              _data3.relayerPayment = {
                token: relayerPayment.token,
                amount: relayerPayment.amount
              };

              _sendTransaction(engine, account, api, _data3, end);
            } else {
              _error7 = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD, "Invalid payload data ".concat(JSON.stringify(payload.params[0]), ". message and signature are required in param object"));
              eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error7);
              end(_error7);
            }

          case 102:
            _context7.next = 107;
            break;

          case 104:
            _error8 = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD, "Not able to deode the data in rawTransaction using ethereum-tx-decoder. Please check the data sent.");
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error8);
            end(_error8);

          case 107:
            _context7.next = 112;
            break;

          case 109:
            _error9 = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD, "Invalid payload data ".concat(JSON.stringify(payload.params[0]), ".rawTransaction is required in param object"));
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error9);
            end(_error9);

          case 112:
            _context7.next = 117;
            break;

          case 114:
            _error10 = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD, "Invalid payload data ".concat(JSON.stringify(payload.params[0]), ". Non empty Array expected in params key"));
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error10);
            end(_error10);

          case 117:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7, null, [[18, 22], [38, 42]]);
  }));
  return _sendSignedTransaction.apply(this, arguments);
}

function handleSendTransaction(_x8, _x9, _x10) {
  return _handleSendTransaction.apply(this, arguments);
}

function _handleSendTransaction() {
  _handleSendTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(engine, payload, end) {
    var to, methodInfo, error, methodName, api, metaTxApproach, customBatchId, customDomainName, customDomainVersion, signTypedDataType, contractAddr, gasLimit, txGas, signatureType, _error11, account, paramArray, _error12, forwardedData, gasLimitNum, signatureFromPayload, contractABI, _contract$estimateGas3, contract, _error13, forwarderToAttach, request, domainDataToUse, domainSeparator, signatureEIP712, signaturePersonal, data, _data4, _error14, _error15, _error16;

    return _regenerator["default"].wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.prev = 0;

            _logMessage("Handle transaction with payload");

            _logMessage(payload);

            if (!(payload.params && payload.params[0] && payload.params[0].to)) {
              _context8.next = 169;
              break;
            }

            to = payload.params[0].to.toLowerCase();

            if (!(interfaceMap[to] || interfaceMap[config.SCW])) {
              _context8.next = 153;
              break;
            }

            methodInfo = decodeMethod(to, payload.params[0].data); // Check if the Smart Contract Wallet is registered on dashboard

            if (!methodInfo) {
              methodInfo = decodeMethod(config.SCW, payload.params[0].data);
            }

            if (methodInfo) {
              _context8.next = 13;
              break;
            }

            error = {};
            error.code = RESPONSE_CODES.WRONG_ABI;
            error.message = "Can't decode method information from payload. Make sure you have uploaded correct ABI on Biconomy Dashboard";
            return _context8.abrupt("return", end(error, null));

          case 13:
            methodName = methodInfo.name;
            api = engine.dappAPIMap[to] ? engine.dappAPIMap[to][methodName] : undefined; // Information we get here is contractAddress, methodName, methodType, ApiId

            if (!api) {
              api = engine.dappAPIMap[config.SCW] ? engine.dappAPIMap[config.SCW][methodName] : undefined;
              metaTxApproach = smartContractMetaTransactionMap[config.SCW];
            } else {
              contractAddr = api.contractAddress.toLowerCase();
              metaTxApproach = smartContractMetaTransactionMap[contractAddr];
            } //Sanitise gas limit here. big number / hex / number -> hex


            gasLimit = payload.params[0].gas || payload.params[0].gasLimit;

            if (gasLimit) {
              gasLimit = ethers.BigNumber.from(gasLimit.toString()).toHexString();
            }

            txGas = payload.params[0].txGas;
            signatureType = payload.params[0].signatureType;

            if (payload.params[0].batchId) {
              customBatchId = Number(payload.params[0].batchId);
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

            _logMessage("gas limit : ".concat(gasLimit));

            if (txGas) {
              _logMessage("tx gas supplied : ".concat(txGas));
            }

            if (api) {
              _context8.next = 46;
              break;
            }

            _logMessage("API not found for method ".concat(methodName));

            _logMessage("Strict mode ".concat(engine.strictMode));

            if (!engine.strictMode) {
              _context8.next = 38;
              break;
            }

            _error11 = {};
            _error11.code = RESPONSE_CODES.API_NOT_FOUND;
            _error11.message = "Biconomy strict mode is on. No registered API found for method ".concat(methodName, ". Please register API from developer dashboard.");
            return _context8.abrupt("return", end(_error11, null));

          case 38:
            _logMessage("Falling back to default provider as strict mode is false in biconomy");

            _context8.prev = 39;
            return _context8.abrupt("return", callDefaultProvider(engine, payload, end, "No registered API found for method ".concat(methodName, ". Please register API from developer dashboard.")));

          case 43:
            _context8.prev = 43;
            _context8.t0 = _context8["catch"](39);
            return _context8.abrupt("return", end(_context8.t0));

          case 46:
            _logMessage("API found");

            _logMessage("Getting user account");

            account = payload.params[0].from;

            if (account) {
              _context8.next = 51;
              break;
            }

            return _context8.abrupt("return", end("Not able to get user account"));

          case 51:
            _logMessage("User account fetched");

            _logMessage(methodInfo.args);

            paramArray = [];

            if (!(metaTxApproach == engine.ERC20_FORWARDER)) {
              _context8.next = 58;
              break;
            }

            _error12 = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD, "This operation is not allowed for contracts registered on dashboard as \"ERC20Forwarder\". Use ERC20Forwarder client instead!");
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error12);
            return _context8.abrupt("return", end(_error12));

          case 58:
            if (!(api.url == NATIVE_META_TX_URL)) {
              _context8.next = 148;
              break;
            }

            if (!(metaTxApproach == engine.TRUSTED_FORWARDER)) {
              _context8.next = 138;
              break;
            }

            _logMessage("Smart contract is configured to use Trusted Forwarder as meta transaction type");

            forwardedData = payload.params[0].data;
            signatureFromPayload = payload.params[0].signature; // Check if txGas is present, if not calculate gas limit for txGas

            if (!(!txGas || parseInt(txGas) == 0)) {
              _context8.next = 79;
              break;
            }

            contractABI = smartContractMap[to];

            if (!contractABI) {
              _context8.next = 74;
              break;
            }

            contract = new ethers.Contract(to, JSON.parse(contractABI), engine.ethersProvider);
            _context8.next = 69;
            return (_contract$estimateGas3 = contract.estimateGas)[methodInfo.signature].apply(_contract$estimateGas3, (0, _toConsumableArray2["default"])(methodInfo.args).concat([{
              from: account
            }]));

          case 69:
            txGas = _context8.sent;
            // do not send this value in API call. only meant for txGas
            gasLimitNum = ethers.BigNumber.from(txGas.toString()).add(ethers.BigNumber.from(5000)).toNumber();

            _logMessage("Gas limit (txGas) calculated for method ".concat(methodName, " in SDK: ").concat(gasLimitNum));

            _context8.next = 77;
            break;

          case 74:
            _error13 = formatMessage(RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND, "Smart contract ABI not found!");
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error13);
            end(_error13);

          case 77:
            _context8.next = 82;
            break;

          case 79:
            _logMessage("txGas supplied for this Trusted Forwarder call is ".concat(Number(txGas)));

            gasLimitNum = ethers.BigNumber.from(txGas.toString()).toNumber();

            _logMessage("gas limit number for txGas " + gasLimitNum);

          case 82:
            _context8.next = 84;
            return findTheRightForwarder(engine, to);

          case 84:
            forwarderToAttach = _context8.sent;
            _context8.next = 87;
            return buildForwardTxRequest(account, to, parseInt(gasLimitNum), //txGas
            forwardedData, biconomyForwarder.attach(forwarderToAttach), customBatchId);

          case 87:
            request = _context8.sent.request;

            _logMessage(request);

            paramArray.push(request);
            forwarderDomainData.verifyingContract = forwarderToAttach;
            domainDataToUse = forwarderDomainDetails[forwarderToAttach];

            if (customDomainName) {
              domainDataToUse.name = customDomainName.toString();
            }

            if (customDomainVersion) {
              domainDataToUse.version = customDomainVersion.toString();
            }

            if (!(signatureType && signatureType == engine.EIP712_SIGN)) {
              _context8.next = 112;
              break;
            }

            _logMessage("EIP712 signature flow"); // Update the verifyingContract field of domain data based on the current request


            domainSeparator = getDomainSeperator(domainDataToUse);

            _logMessage("Domain separator to be used:");

            _logMessage(domainSeparator);

            paramArray.push(domainSeparator);

            if (!signatureFromPayload) {
              _context8.next = 105;
              break;
            }

            signatureEIP712 = signatureFromPayload;

            _logMessage("EIP712 signature from payload is ".concat(signatureEIP712));

            _context8.next = 109;
            break;

          case 105:
            _context8.next = 107;
            return getSignatureEIP712(engine, account, request, forwarderToAttach, domainDataToUse, signTypedDataType);

          case 107:
            signatureEIP712 = _context8.sent;

            _logMessage("EIP712 signature is ".concat(signatureEIP712));

          case 109:
            paramArray.push(signatureEIP712);
            _context8.next = 127;
            break;

          case 112:
            _logMessage("Personal signature flow");

            if (!signatureFromPayload) {
              _context8.next = 118;
              break;
            }

            signaturePersonal = signatureFromPayload;

            _logMessage("Personal signature from payload is ".concat(signaturePersonal));

            _context8.next = 122;
            break;

          case 118:
            _context8.next = 120;
            return getSignaturePersonal(engine, request);

          case 120:
            signaturePersonal = _context8.sent;

            _logMessage("Personal signature is ".concat(signaturePersonal));

          case 122:
            if (!signaturePersonal) {
              _context8.next = 126;
              break;
            }

            paramArray.push(signaturePersonal);
            _context8.next = 127;
            break;

          case 126:
            throw new Error("Could not get personal signature while processing transaction in Mexa SDK. Please check the providers you have passed to Biconomy");

          case 127:
            data = {};
            data.from = account;
            data.apiId = api.id;
            data.params = paramArray;
            data.to = to; //gasLimit for entire transaction
            //This will be calculated at the backend again

            data.gasLimit = gasLimit;

            if (signatureType && signatureType == engine.EIP712_SIGN) {
              data.signatureType = engine.EIP712_SIGN;
            }

            _context8.next = 136;
            return _sendTransaction(engine, account, api, data, end);

          case 136:
            _context8.next = 146;
            break;

          case 138:
            paramArray.push.apply(paramArray, (0, _toConsumableArray2["default"])(methodInfo.args));
            _data4 = {};
            _data4.from = account;
            _data4.apiId = api.id;
            _data4.params = paramArray;
            _data4.gasLimit = gasLimit;
            _data4.to = to;

            _sendTransaction(engine, account, api, _data4, end);

          case 146:
            _context8.next = 151;
            break;

          case 148:
            _error14 = formatMessage(RESPONSE_CODES.INVALID_OPERATION, "Biconomy smart contract wallets are not supported now. On dashboard, re-register your smart contract methods with \"native meta tx\" checkbox selected.");
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error14);
            return _context8.abrupt("return", end(_error14));

          case 151:
            _context8.next = 167;
            break;

          case 153:
            if (!engine.strictMode) {
              _context8.next = 159;
              break;
            }

            _error15 = formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED, "Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard");
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error15);
            end(_error15);
            _context8.next = 167;
            break;

          case 159:
            _logMessage("Smart contract not found on dashbaord. Strict mode is off, so falling back to normal transaction mode");

            _context8.prev = 160;
            return _context8.abrupt("return", callDefaultProvider(engine, payload, end, "Current provider can't send transactions and smart contract ".concat(to, " not found on Biconomy Dashbaord")));

          case 164:
            _context8.prev = 164;
            _context8.t1 = _context8["catch"](160);
            return _context8.abrupt("return", end(_context8.t1));

          case 167:
            _context8.next = 172;
            break;

          case 169:
            _error16 = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD, "Invalid payload data ".concat(JSON.stringify(payload), ". Expecting params key to be an array with first element having a 'to' property"));
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, _error16);
            end(_error16);

          case 172:
            _context8.next = 177;
            break;

          case 174:
            _context8.prev = 174;
            _context8.t2 = _context8["catch"](0);
            return _context8.abrupt("return", end(_context8.t2));

          case 177:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee8, null, [[0, 174], [39, 43], [160, 164]]);
  }));
  return _handleSendTransaction.apply(this, arguments);
}

function callDefaultProvider(_x11, _x12, _x13, _x14) {
  return _callDefaultProvider.apply(this, arguments);
}

function _callDefaultProvider() {
  _callDefaultProvider = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(engine, payload, callback, errorMessage) {
    var targetProvider, responseFromProvider;
    return _regenerator["default"].wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.prev = 0;
            targetProvider = getTargetProvider(engine);

            if (!targetProvider) {
              _context9.next = 15;
              break;
            }

            if (!isEthersProvider(targetProvider)) {
              _context9.next = 12;
              break;
            }

            _context9.next = 6;
            return targetProvider.send(payload.method, payload.params);

          case 6:
            responseFromProvider = _context9.sent;

            _logMessage("Response from original provider", responseFromProvider);

            callback(null, responseFromProvider);
            return _context9.abrupt("return", responseFromProvider);

          case 12:
            return _context9.abrupt("return", targetProvider.send(payload, callback));

          case 13:
            _context9.next = 17;
            break;

          case 15:
            _logMessage("No provider present in Biconomy that can sign messages");

            throw new Error(errorMessage);

          case 17:
            _context9.next = 24;
            break;

          case 19:
            _context9.prev = 19;
            _context9.t0 = _context9["catch"](0);

            _logMessage("Unexpected error occured when calling default provider");

            _logMessage(_context9.t0);

            return _context9.abrupt("return", callback(_context9.t0));

          case 24:
          case "end":
            return _context9.stop();
        }
      }
    }, _callee9, null, [[0, 19]]);
  }));
  return _callDefaultProvider.apply(this, arguments);
}

function _getEIP712ForwardMessageToSign(request, forwarder, domainData) {
  // Update the verifyingContract field of domain data based on the current request
  if (!forwarderDomainType || !forwardRequestType || !forwarderDomainData || !forwarder) {
    throw new Error("Biconomy is not properly initialized");
  }

  if (!forwarderDomainDetails || Object.keys(forwarderDomainDetails).length === 0) {
    throw new Error("Biconomy is not properly initialized");
  } //Override domainData


  var domainDataToUse = domainData; //Might update version as well

  var dataToSign = JSON.stringify({
    types: {
      EIP712Domain: forwarderDomainType,
      ERC20ForwardRequest: forwardRequestType
    },
    domain: domainDataToUse,
    primaryType: "ERC20ForwardRequest",
    message: request
  });
  return dataToSign;
}

function _getPersonalForwardMessageToSign(request) {
  return abi.soliditySHA3(["address", "address", "address", "uint256", "uint256", "uint256", "uint256", "uint256", "bytes32"], [request.from, request.to, request.token, request.txGas, request.tokenGasPrice, request.batchId, request.batchNonce, request.deadline, ethers.utils.keccak256(request.data)]);
}

function getTargetProvider(engine) {
  var provider;

  if (engine) {
    provider = engine.originalProvider;

    if (!engine.canSignMessages) {
      if (!engine.walletProvider) {
        //comment this out and just log
        //throw new Error(`Please pass a provider connected to a wallet that can sign messages in Biconomy options.`);
        _logMessage("Please pass a provider connected to a wallet that can sign messages in Biconomy options");
      }

      provider = engine.walletProvider;
    }
  }

  return provider;
}

function getSignatureParameters(signature) {
  if (!ethers.utils.isHexString(signature)) {
    throw new Error('Given value "'.concat(signature, '" is not a valid hex string.'));
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

function findTheRightForwarder(_x15, _x16) {
  return _findTheRightForwarder.apply(this, arguments);
} //take parameter for chosen signature type V3 or V4


function _findTheRightForwarder() {
  _findTheRightForwarder = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10(engine, to) {
    var forwarderToUse, ethersProvider, contract, supportedForwarders, forwarder, i, isTrustedForwarder;
    return _regenerator["default"].wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            if (!smartContractTrustedForwarderMap[to]) {
              _context10.next = 4;
              break;
            }

            forwarderToUse = smartContractTrustedForwarderMap[to];
            _context10.next = 41;
            break;

          case 4:
            if (engine.isEthersProviderPresent) {
              ethersProvider = engine.originalProvider;
            } else {
              ethersProvider = new ethers.providers.Web3Provider(engine.originalProvider);
            }

            contract = new ethers.Contract(to, eip2771BaseAbi, ethersProvider);
            supportedForwarders = engine.forwarderAddresses;
            forwarderToUse = engine.forwarderAddress; //default forwarder
            // Attempt to find out forwarder that 'to' contract trusts

            _context10.prev = 8;
            _context10.next = 11;
            return contract.trustedForwarder();

          case 11:
            forwarder = _context10.sent;
            _context10.next = 18;
            break;

          case 14:
            _context10.prev = 14;
            _context10.t0 = _context10["catch"](8);

            _logMessage("Could not find read method 'trustedForwarder' in the contract abi");

            _logMessage(_context10.t0);

          case 18:
            i = 0;

          case 19:
            if (!(i < supportedForwarders.length)) {
              _context10.next = 40;
              break;
            }

            if (!forwarder) {
              _context10.next = 24;
              break;
            }

            if (!(supportedForwarders[i].toString() == forwarder.toString())) {
              _context10.next = 24;
              break;
            }

            forwarderToUse = supportedForwarders[i];
            return _context10.abrupt("break", 40);

          case 24:
            _context10.prev = 24;
            _context10.next = 27;
            return contract.isTrustedForwarder(supportedForwarders[i]);

          case 27:
            isTrustedForwarder = _context10.sent;

            if (!isTrustedForwarder) {
              _context10.next = 31;
              break;
            }

            forwarderToUse = supportedForwarders[i];
            return _context10.abrupt("break", 40);

          case 31:
            _context10.next = 37;
            break;

          case 33:
            _context10.prev = 33;
            _context10.t1 = _context10["catch"](24);

            _logMessage("Could not find read method 'isTrustedForwarder' in the contract abi");

            _logMessage(_context10.t1);

          case 37:
            i++;
            _context10.next = 19;
            break;

          case 40:
            smartContractTrustedForwarderMap[to] = forwarderToUse;

          case 41:
            return _context10.abrupt("return", forwarderToUse);

          case 42:
          case "end":
            return _context10.stop();
        }
      }
    }, _callee10, null, [[8, 14], [24, 33]]);
  }));
  return _findTheRightForwarder.apply(this, arguments);
}

function getSignatureEIP712(engine, account, request, forwarder, domainData, type) {
  //default V4 now   
  var signTypedDataType = "eth_signTypedData_v4";

  if (type === "v3" || type === "V3") {
    signTypedDataType = "eth_signTypedData_v3";
  }

  var dataToSign = _getEIP712ForwardMessageToSign(request, forwarder, domainData);

  var targetProvider = getTargetProvider(engine);

  if (!targetProvider) {
    throw new Error("Unable to get provider information passed to Biconomy");
  }

  var promise = new Promise( /*#__PURE__*/function () {
    var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(resolve, reject) {
      var signature, _getSignatureParamete, r, s, v, newSignature;

      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              if (!targetProvider) {
                _context4.next = 21;
                break;
              }

              if (!isEthersProvider(targetProvider)) {
                _context4.next = 17;
                break;
              }

              _context4.prev = 2;
              _context4.next = 5;
              return targetProvider.send(signTypedDataType, [account, dataToSign]);

            case 5:
              signature = _context4.sent;
              _getSignatureParamete = getSignatureParameters(signature), r = _getSignatureParamete.r, s = _getSignatureParamete.s, v = _getSignatureParamete.v;
              v = ethers.BigNumber.from(v).toHexString();
              newSignature = r + s.slice(2) + v.slice(2);
              resolve(newSignature);
              _context4.next = 15;
              break;

            case 12:
              _context4.prev = 12;
              _context4.t0 = _context4["catch"](2);
              reject(_context4.t0);

            case 15:
              _context4.next = 19;
              break;

            case 17:
              _context4.next = 19;
              return targetProvider.send({
                jsonrpc: "2.0",
                id: 999999999999,
                method: signTypedDataType,
                params: [account, dataToSign]
              }, function (error, res) {
                if (error) {
                  reject(error);
                } else {
                  var oldSignature = res.result;

                  var _getSignatureParamete2 = getSignatureParameters(oldSignature),
                      _r = _getSignatureParamete2.r,
                      _s = _getSignatureParamete2.s,
                      _v = _getSignatureParamete2.v;

                  _v = ethers.BigNumber.from(_v).toHexString();

                  var _newSignature = _r + _s.slice(2) + _v.slice(2);

                  resolve(_newSignature);
                }
              });

            case 19:
              _context4.next = 22;
              break;

            case 21:
              reject("Could not get signature from the provider passed to Biconomy. Check if you have passed a walletProvider in Biconomy Options.");

            case 22:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, null, [[2, 12]]);
    }));

    return function (_x17, _x18) {
      return _ref4.apply(this, arguments);
    };
  }());
  return promise;
}

function getSignaturePersonal(_x19, _x20) {
  return _getSignaturePersonal.apply(this, arguments);
} // On getting smart contract data get the API data also


function _getSignaturePersonal() {
  _getSignaturePersonal = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee12(engine, req) {
    var hashToSign, signature, targetProvider, providerWithSigner, signer, promise;
    return _regenerator["default"].wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            hashToSign = _getPersonalForwardMessageToSign(req);

            if (!(!engine.signer && !engine.walletProvider)) {
              _context12.next = 3;
              break;
            }

            throw new Error("Can't sign messages with current provider. Did you forget to pass walletProvider in Biconomy options?");

          case 3:
            targetProvider = getTargetProvider(engine);

            if (targetProvider) {
              _context12.next = 6;
              break;
            }

            throw new Error("Unable to get provider information passed to Biconomy");

          case 6:
            if (isEthersProvider(targetProvider)) {
              providerWithSigner = targetProvider;
            } else {
              providerWithSigner = new ethers.providers.Web3Provider(targetProvider);
            }

            signer = providerWithSigner.getSigner();
            promise = new Promise( /*#__PURE__*/function () {
              var _ref8 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee11(resolve, reject) {
                var _getSignatureParamete3, r, s, v, newSignature;

                return _regenerator["default"].wrap(function _callee11$(_context11) {
                  while (1) {
                    switch (_context11.prev = _context11.next) {
                      case 0:
                        _context11.prev = 0;
                        _context11.next = 3;
                        return signer.signMessage(ethers.utils.arrayify(hashToSign));

                      case 3:
                        signature = _context11.sent;
                        _getSignatureParamete3 = getSignatureParameters(signature), r = _getSignatureParamete3.r, s = _getSignatureParamete3.s, v = _getSignatureParamete3.v;
                        v = ethers.BigNumber.from(v).toHexString();
                        newSignature = r + s.slice(2) + v.slice(2);
                        resolve(newSignature);
                        _context11.next = 13;
                        break;

                      case 10:
                        _context11.prev = 10;
                        _context11.t0 = _context11["catch"](0);
                        reject(_context11.t0);

                      case 13:
                      case "end":
                        return _context11.stop();
                    }
                  }
                }, _callee11, null, [[0, 10]]);
              }));

              return function (_x33, _x34) {
                return _ref8.apply(this, arguments);
              };
            }());
            return _context12.abrupt("return", promise);

          case 10:
          case "end":
            return _context12.stop();
        }
      }
    }, _callee12);
  }));
  return _getSignaturePersonal.apply(this, arguments);
}

eventEmitter.on(EVENTS.SMART_CONTRACT_DATA_READY, function (dappId, engine) {
  // Get DApp API information from Database
  var getAPIInfoAPI = "".concat(baseURL, "/api/").concat(config.version, "/meta-api");
  fetch(getAPIInfoAPI, getFetchOptions("GET", engine.apiKey)).then(function (response) {
    return response.json();
  }).then(function (response) {
    if (response && response.listApis) {
      var apiList = response.listApis;

      for (var i = 0; i < apiList.length; i++) {
        var contractAddress = apiList[i].contractAddress; // TODO: In case of SCW(Smart Contract Wallet) there'll be no contract address. Save SCW as key in that case.

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
  })["catch"](function (error) {
    _logMessage(error);
  });
});
eventEmitter.on(EVENTS.HELPER_CLENTS_READY, /*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(engine) {
    var biconomyAttributes, targetProvider, ethersProvider, signer, signerOrProvider, isSignerWithAccounts, erc20ForwarderAddress, transferHandlerAddress, erc20Forwarder, oracleAggregatorAddress, feeManagerAddress, forwarderAddress, oracleAggregator, feeManager, forwarder, requiredDomainData, transferHandler, tokenGasPriceV1SupportedNetworks;
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.prev = 0;
            biconomyAttributes = {
              apiKey: engine.apiKey,
              dappAPIMap: engine.dappAPIMap,
              interfaceMap: interfaceMap,
              signType: {
                EIP712_SIGN: engine.EIP712_SIGN,
                PERSONAL_SIGN: engine.PERSONAL_SIGN
              }
            };
            targetProvider = getTargetProvider(engine);
            /*if(!targetProvider) {
              throw new Error(`Unable to get provider information passed to Biconomy`);
            }*/

            if (engine.isEthersProviderPresent) {
              ethersProvider = engine.originalProvider;
            } else {
              ethersProvider = new ethers.providers.Web3Provider(engine.originalProvider);
            }

            signer = ethersProvider.getSigner();
            signerOrProvider = signer;
            isSignerWithAccounts = true;
            _context5.prev = 7;
            _context5.next = 10;
            return signer.getAddress();

          case 10:
            engine.canSignMessages = true;
            _context5.next = 19;
            break;

          case 13:
            _context5.prev = 13;
            _context5.t0 = _context5["catch"](7);

            _logMessage("Given provider does not have accounts information");

            signerOrProvider = ethersProvider;
            isSignerWithAccounts = false;
            engine.canSignMessages = false;

          case 19:
            erc20ForwarderAddress = engine.options.erc20ForwarderAddress || engine.erc20ForwarderAddress;
            transferHandlerAddress = engine.options.transferHandlerAddress || engine.transferHandlerAddress;

            if (!erc20ForwarderAddress) {
              _context5.next = 46;
              break;
            }

            erc20Forwarder = new ethers.Contract(erc20ForwarderAddress, erc20ForwarderAbi, signerOrProvider);
            _context5.next = 25;
            return erc20Forwarder.oracleAggregator();

          case 25:
            oracleAggregatorAddress = _context5.sent;
            _context5.next = 28;
            return erc20Forwarder.feeManager();

          case 28:
            feeManagerAddress = _context5.sent;
            _context5.next = 31;
            return erc20Forwarder.forwarder();

          case 31:
            forwarderAddress = _context5.sent;
            oracleAggregator = new ethers.Contract(oracleAggregatorAddress, oracleAggregatorAbi, signerOrProvider);
            feeManager = new ethers.Contract(feeManagerAddress, feeManagerAbi, signerOrProvider); //If ERC20 Forwarder Address exits then it would have configured Forwarder 

            forwarder = new ethers.Contract(forwarderAddress, biconomyForwarderAbi, signerOrProvider);
            requiredDomainData = forwarderDomainDetails[forwarderAddress];
            transferHandler = new ethers.Contract(transferHandlerAddress, transferHandlerAbi, signerOrProvider);
            tokenGasPriceV1SupportedNetworks = engine.tokenGasPriceV1SupportedNetworks;
            engine.permitClient = new PermitClient(engine, erc20ForwarderAddress, engine.daiTokenAddress); //TODO
            //Review initialisation of ERC20 Forwarder as well!

            engine.erc20ForwarderClient = new ERC20ForwarderClient({
              forwarderClientOptions: biconomyAttributes,
              networkId: engine.networkId,
              provider: ethersProvider,
              targetProvider: targetProvider,
              forwarderDomainData: requiredDomainData,
              forwarderDomainDetails: forwarderDomainDetails,
              forwarderDomainType: forwarderDomainType,
              erc20Forwarder: erc20Forwarder,
              transferHandler: transferHandler,
              forwarder: forwarder,
              oracleAggregator: oracleAggregator,
              feeManager: feeManager,
              isSignerWithAccounts: isSignerWithAccounts,
              tokenGasPriceV1SupportedNetworks: tokenGasPriceV1SupportedNetworks,
              trustedForwarderOverhead: trustedForwarderOverhead,
              daiPermitOverhead: daiPermitOverhead,
              eip2612PermitOverhead: eip2612PermitOverhead
            });
            engine.biconomyWalletClient = new BiconomyWalletClient({
              ethersProvider: ethersProvider,
              biconomyAttributes: biconomyAttributes,
              walletFactoryAddress: engine.walletFactoryAddress,
              baseWalletAddress: engine.baseWalletAddress,
              entryPointAddress: engine.entryPointAddress,
              networkId: engine.networkId
            });

            _logMessage(engine.permitClient);

            _logMessage(engine.erc20ForwarderClient);

            _logMessage(engine.biconomyWalletClient);

            _context5.next = 47;
            break;

          case 46:
            _logMessage("ERC20 Forwarder is not supported for this network"); //Warning : you would not be able to use ERC20ForwarderClient and PermitClient 


          case 47:
            engine.status = STATUS.BICONOMY_READY;
            eventEmitter.emit(STATUS.BICONOMY_READY);
            _context5.next = 54;
            break;

          case 51:
            _context5.prev = 51;
            _context5.t1 = _context5["catch"](0);

            _logMessage(_context5.t1);

          case 54:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, null, [[0, 51], [7, 13]]);
  }));

  return function (_x21) {
    return _ref5.apply(this, arguments);
  };
}());
eventEmitter.on(EVENTS.DAPP_API_DATA_READY, function (engine) {
  eventEmitter.emit(EVENTS.HELPER_CLENTS_READY, engine);
});
/**
 * Get user account from current provider using eth_accounts method.
 **/

function _getUserAccount(engine, payload, cb) {
  if (engine) {
    var id = DEFAULT_PAYLOAD_ID;

    if (payload) {
      id = payload.id;
    }

    if (cb) {
      engine.originalProvider.send({
        jsonrpc: JSON_RPC_VERSION,
        id: id,
        method: "eth_accounts",
        params: []
      }, function (error, response) {
        cb(error, response);
      });
    } else {
      return new Promise(function (resolve, reject) {
        engine.originalProvider.send({
          jsonrpc: JSON_RPC_VERSION,
          id: id,
          method: "eth_accounts",
          params: []
        }, function (error, res) {
          if (error) {
            reject(error);
          } else if (!res.result) {
            reject("Invalid response ".concat(res));
          } else {
            resolve(res.result[0]);
          }
        });
      });
    }
  }
}
/**
 * Validate parameters passed to biconomy object. Dapp id and api key are mandatory.
 **/


function _validate(options) {
  if (!options) {
    throw new Error("Options object needs to be passed to Biconomy Object with apiKey as mandatory key");
  }

  if (!options.apiKey) {
    throw new Error("apiKey is required in options object when creating Biconomy object");
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


function _sendTransaction(_x22, _x23, _x24, _x25, _x26) {
  return _sendTransaction2.apply(this, arguments);
}
/**
 * Function to initialize the biconomy object with DApp information.
 * It fetches the dapp's smart contract from biconomy database and initialize the decoders for each smart
 * contract which will be used to decode information during function calls.
 * @param dappId Id for dapp whos information is to be fetched
 * @param apiKey API key used to authenticate the request at biconomy server
 * @param _this object representing biconomy provider
 **/


function _sendTransaction2() {
  _sendTransaction2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee13(engine, account, api, data, cb) {
    var url, fetchOption;
    return _regenerator["default"].wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            if (engine && account && api && data) {
              url = api.url;
              fetchOption = getFetchOptions("POST", engine.apiKey);
              fetchOption.body = JSON.stringify(data); //TODO

              /*Before making API call to the core, Using other core APIs or sysinfi, sdk can check for customisation needs and pre flights like
              1. Whitelisting of user addresses, conditional whitelisting
              2. Gas price range validations
              3. Dapp, User and Method limit breaches
              etc
              and make it fallback to default provider!
              */

              fetch("".concat(baseURL).concat(url), fetchOption).then(function (response) {
                return response.json();
              }).then(function (result) {
                _logMessage(result);

                if (!result.txHash && result.flag != BICONOMY_RESPONSE_CODES.ACTION_COMPLETE && result.flag != BICONOMY_RESPONSE_CODES.SUCCESS) {
                  //Any error from relayer infra
                  //TODO
                  //Involve fallback here with callDefaultProvider
                  var error = {};
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
              })["catch"](function (error) {
                _logMessage(error);

                if (cb) cb(error);
              });
            } else {
              _logMessage("Invalid arguments, provider: ".concat(engine, " account: ").concat(account, " api: ").concat(api, " data: ").concat(data));

              if (cb) cb("Invalid arguments, provider: ".concat(engine, " account: ").concat(account, " api: ").concat(api, " data: ").concat(data), null);
            }

          case 1:
          case "end":
            return _context13.stop();
        }
      }
    }, _callee13);
  }));
  return _sendTransaction2.apply(this, arguments);
}

function _init(_x27, _x28) {
  return _init2.apply(this, arguments);
}

function _init2() {
  _init2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee15(apiKey, engine) {
    var getDappAPI;
    return _regenerator["default"].wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            _context15.prev = 0;
            _context15.next = 3;
            return engine.ethersProvider.getSigner();

          case 3:
            engine.signer = _context15.sent;
            // Check current network id and dapp network id registered on dashboard
            getDappAPI = "".concat(baseURL, "/api/").concat(config.version, "/dapp");
            fetch(getDappAPI, getFetchOptions("GET", apiKey)).then(function (response) {
              return response.json();
            }).then( /*#__PURE__*/function () {
              var _ref9 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee14(dappResponse) {
                var dappNetworkId, dappId, getNetworkIdOption, providerNetworkId;
                return _regenerator["default"].wrap(function _callee14$(_context14) {
                  while (1) {
                    switch (_context14.prev = _context14.next) {
                      case 0:
                        _logMessage(dappResponse);

                        if (!(dappResponse && dappResponse.dapp)) {
                          _context14.next = 21;
                          break;
                        }

                        dappNetworkId = dappResponse.dapp.networkId;
                        dappId = dappResponse.dapp._id;

                        _logMessage("Network id corresponding to dapp id ".concat(dappId, " is ").concat(dappNetworkId));

                        getNetworkIdOption = {
                          jsonrpc: JSON_RPC_VERSION,
                          id: "102",
                          method: "eth_chainId",
                          params: []
                        };

                        if (!isEthersProvider(engine.originalProvider)) {
                          _context14.next = 18;
                          break;
                        }

                        _context14.next = 9;
                        return engine.originalProvider.send("eth_chainId", []);

                      case 9:
                        providerNetworkId = _context14.sent;

                        if (!providerNetworkId) {
                          _context14.next = 15;
                          break;
                        }

                        providerNetworkId = parseInt(providerNetworkId.toString());
                        onNetworkId(engine, {
                          providerNetworkId: providerNetworkId,
                          dappNetworkId: dappNetworkId,
                          apiKey: apiKey,
                          dappId: dappId
                        });
                        _context14.next = 16;
                        break;

                      case 15:
                        return _context14.abrupt("return", eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.NETWORK_ID_NOT_FOUND, "Could not get network version"), "Could not get network version"));

                      case 16:
                        _context14.next = 19;
                        break;

                      case 18:
                        engine.originalProvider.send(getNetworkIdOption, function (error, networkResponse) {
                          if (error || networkResponse && networkResponse.error) {
                            return eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.NETWORK_ID_NOT_FOUND, "Could not get network version"), error || networkResponse.error);
                          } else {
                            var _providerNetworkId = parseInt(networkResponse.result.toString());

                            onNetworkId(engine, {
                              providerNetworkId: _providerNetworkId,
                              dappNetworkId: dappNetworkId,
                              apiKey: apiKey,
                              dappId: dappId
                            });
                          }
                        });

                      case 19:
                        _context14.next = 22;
                        break;

                      case 21:
                        if (dappResponse.log) {
                          eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.ERROR_RESPONSE, dappResponse.log));
                        } else {
                          eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.DAPP_NOT_FOUND, "No Dapp Registered with apikey ".concat(apiKey)));
                        }

                      case 22:
                      case "end":
                        return _context14.stop();
                    }
                  }
                }, _callee14);
              }));

              return function (_x35) {
                return _ref9.apply(this, arguments);
              };
            }())["catch"](function (error) {
              eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Error while initializing Biconomy"), error);
            });
            _context15.next = 11;
            break;

          case 8:
            _context15.prev = 8;
            _context15.t0 = _context15["catch"](0);
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Error while initializing Biconomy"), _context15.t0);

          case 11:
          case "end":
            return _context15.stop();
        }
      }
    }, _callee15, null, [[0, 8]]);
  }));
  return _init2.apply(this, arguments);
}

function isEthersProvider(provider) {
  return ethers.providers.Provider.isProvider(provider);
}

function onNetworkId(_x29, _x30) {
  return _onNetworkId.apply(this, arguments);
}

function _onNetworkId() {
  _onNetworkId = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee16(engine, _ref6) {
    var providerNetworkId, dappNetworkId, apiKey, dappId;
    return _regenerator["default"].wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            providerNetworkId = _ref6.providerNetworkId, dappNetworkId = _ref6.dappNetworkId, apiKey = _ref6.apiKey, dappId = _ref6.dappId;
            engine.networkId = providerNetworkId;

            _logMessage("Current provider network id: ".concat(providerNetworkId));

            if (!(providerNetworkId != dappNetworkId)) {
              _context16.next = 7;
              break;
            }

            return _context16.abrupt("return", eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.NETWORK_ID_MISMATCH, "Current networkId ".concat(providerNetworkId, " is different from dapp network id registered on mexa dashboard ").concat(dappNetworkId))));

          case 7:
            domainData.chainId = providerNetworkId;
            daiDomainData.chainId = providerNetworkId;
            fetch("".concat(baseURL, "/api/").concat(config.version2, "/meta-tx/systemInfo?networkId=").concat(providerNetworkId)).then(function (response) {
              return response.json();
            }).then(function (systemInfo) {
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
                engine.forwarderAddress = systemInfo.biconomyForwarderAddress;
                engine.forwarderAddresses = systemInfo.biconomyForwarderAddresses;
                engine.erc20ForwarderAddress = systemInfo.erc20ForwarderAddress;
                engine.transferHandlerAddress = systemInfo.transferHandlerAddress;
                engine.daiTokenAddress = systemInfo.daiTokenAddress;
                engine.usdtTokenAddress = systemInfo.usdtTokenAddress;
                engine.usdcTokenAddress = systemInfo.usdcTokenAddress;
                engine.TRUSTED_FORWARDER = systemInfo.trustedForwarderMetaTransaction;
                engine.ERC20_FORWARDER = systemInfo.erc20ForwarderMetaTransaction;
                engine.DEFAULT = systemInfo.defaultMetaTransaction;
                engine.EIP712_SIGN = systemInfo.eip712Sign;
                engine.PERSONAL_SIGN = systemInfo.personalSign;
                engine.tokenGasPriceV1SupportedNetworks = systemInfo.tokenGasPriceV1SupportedNetworks;
                engine.walletFactoryAddress = systemInfo.walletFactoryAddress;
                engine.baseWalletAddress = systemInfo.baseWalletAddress;
                engine.entryPointAddress = systemInfo.entryPointAddress;
                daiDomainData.verifyingContract = engine.daiTokenAddress;

                if (systemInfo.relayHubAddress) {
                  domainData.verifyingContract = systemInfo.relayHubAddress;
                }
              } else {
                return eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.INVALID_DATA, "Could not get signature types from server. Contact Biconomy Team"));
              } // check if Valid trusted forwarder address is present from system info


              if (engine.forwarderAddress && engine.forwarderAddress != "") {
                //let supportedForwarders = engine.forwarderAddresses;
                // prevent initialising it here as system info could return an array of forwarder addresses
                biconomyForwarder = new ethers.Contract( //pick up first forwarder address from the array by default then attach to an address accordingly
                engine.forwarderAddress, biconomyForwarderAbi, engine.ethersProvider);
              } // Get dapps smart contract data from biconomy servers


              var getDAppInfoAPI = "".concat(baseURL, "/api/").concat(config.version, "/smart-contract");
              fetch(getDAppInfoAPI, getFetchOptions("GET", apiKey)).then(function (response) {
                return response.json();
              }).then(function (result) {
                if (!result && result.flag != 143) {
                  return eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND, "Error getting smart contract for dappId ".concat(dappId)));
                }

                var smartContractList = result.smartContracts;
                console.log('smartContractList', smartContractList);

                if (smartContractList && smartContractList.length > 0) {
                  smartContractList.forEach(function (contract) {
                    var contractInterface = new ethers.utils.Interface(JSON.parse(contract.abi));

                    if (contract.type === config.SCW) {
                      smartContractMetaTransactionMap[config.SCW] = contract.metaTransactionType;
                      interfaceMap[config.SCW] = contractInterface;
                      smartContractMap[config.SCW] = contract.abi;
                    } else {
                      smartContractMetaTransactionMap[contract.address.toLowerCase()] = contract.metaTransactionType;
                      interfaceMap[contract.address.toLowerCase()] = contractInterface;
                      smartContractMap[contract.address.toLowerCase()] = contract.abi;
                    }
                  });
                  console.log("interfaceMap", interfaceMap);

                  _logMessage(smartContractMetaTransactionMap);

                  _checkUserLogin(engine, dappId);
                } else {
                  if (engine.strictMode) {
                    engine.status = STATUS.NO_DATA;
                    eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND, "No smart contract registered for dappId ".concat(dappId, " on Mexa Dashboard")));
                  } else {
                    _checkUserLogin(engine, dappId);
                  }
                }
              })["catch"](function (error) {
                eventEmitter.emit(EVENTS.BICONOMY_ERROR, formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Error while initializing Biconomy"), error);
              });
            });

          case 10:
          case "end":
            return _context16.stop();
        }
      }
    }, _callee16);
  }));
  return _onNetworkId.apply(this, arguments);
}

function _checkUserLogin(_x31, _x32) {
  return _checkUserLogin2.apply(this, arguments);
}

function _checkUserLogin2() {
  _checkUserLogin2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee17(engine, dappId) {
    return _regenerator["default"].wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            eventEmitter.emit(EVENTS.SMART_CONTRACT_DATA_READY, dappId, engine);

          case 1:
          case "end":
            return _context17.stop();
        }
      }
    }, _callee17);
  }));
  return _checkUserLogin2.apply(this, arguments);
}

Biconomy.prototype.isReady = function () {
  return this.status === STATUS.BICONOMY_READY;
};

Biconomy.prototype.getUserAccount = /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6() {
  return _regenerator["default"].wrap(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return _getUserAccount(this);

        case 2:
          return _context6.abrupt("return", _context6.sent);

        case 3:
        case "end":
          return _context6.stop();
      }
    }
  }, _callee6, this);
}));

function getFetchOptions(method, apiKey) {
  return {
    method: method,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json;charset=utf-8"
    }
  };
}

function formatMessage(code, message) {
  return {
    code: code,
    message: message
  };
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