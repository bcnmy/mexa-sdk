"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _require = require("ethers"),
    ethers = _require.ethers;

var _require2 = require("./config"),
    config = _require2.config;

var abi = require("ethereumjs-abi");

var _require3 = require("./abis"),
    tokenAbi = _require3.tokenAbi,
    erc20Eip2612Abi = _require3.erc20Eip2612Abi;

var erc20ForwardRequestType = config.forwardRequestType;
var customForwardRequestType = config.customForwardRequestType;
/**
 * Method to get the gas price for a given network that'll be used to
 * send the transaction by Biconomy Relayer Network.
 *
 * @param {number} networkId Network id for which gas price is needed
 */

var getGasPrice = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(networkId) {
    var gasPriceURL, response, responseJson;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            gasPriceURL = "".concat(config.baseURL, "/api/v1/gas-price?networkId=").concat(networkId);
            _context.prev = 1;
            _context.next = 4;
            return fetch(gasPriceURL);

          case 4:
            response = _context.sent;

            if (!(response && response.json)) {
              _context.next = 12;
              break;
            }

            _context.next = 8;
            return response.json();

          case 8:
            responseJson = _context.sent;

            _logMessage("Gas Price Response JSON " + JSON.stringify(responseJson));

            if (!(responseJson && responseJson.gasPrice && responseJson.gasPrice.value)) {
              _context.next = 12;
              break;
            }

            return _context.abrupt("return", ethers.utils.parseUnits(responseJson.gasPrice.value.toString(), "gwei").toString());

          case 12:
            throw new Error("Error getting gas price from url ".concat(gasPriceURL));

          case 15:
            _context.prev = 15;
            _context.t0 = _context["catch"](1);

            _logMessage(_context.t0);

            throw _context.t0;

          case 19:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[1, 15]]);
  }));

  return function getGasPrice(_x) {
    return _ref.apply(this, arguments);
  };
}();
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
/**
 * Class to provide methods to interact with Biconomy's ERC20Forwarder smart contract
 * to send meta transactions and let end users pay the gas fee in ERC20 tokens.
 * Check https://docs.biconomy.io to see list of supported tokens and guides on how to use this.
 *
 * This class supports both EIP712 and personal signatures.
 */


var ERC20ForwarderClient = /*#__PURE__*/function () {
  function ERC20ForwarderClient(_ref2) {
    var forwarderClientOptions = _ref2.forwarderClientOptions,
        networkId = _ref2.networkId,
        provider = _ref2.provider,
        targetProvider = _ref2.targetProvider,
        forwarderDomainData = _ref2.forwarderDomainData,
        forwarderDomainDetails = _ref2.forwarderDomainDetails,
        forwarderDomainType = _ref2.forwarderDomainType,
        erc20Forwarder = _ref2.erc20Forwarder,
        transferHandler = _ref2.transferHandler,
        forwarder = _ref2.forwarder,
        oracleAggregator = _ref2.oracleAggregator,
        feeManager = _ref2.feeManager,
        isSignerWithAccounts = _ref2.isSignerWithAccounts,
        tokenGasPriceV1SupportedNetworks = _ref2.tokenGasPriceV1SupportedNetworks,
        trustedForwarderOverhead = _ref2.trustedForwarderOverhead,
        daiPermitOverhead = _ref2.daiPermitOverhead,
        eip2612PermitOverhead = _ref2.eip2612PermitOverhead;
    (0, _classCallCheck2["default"])(this, ERC20ForwarderClient);
    this.biconomyAttributes = forwarderClientOptions;
    this.networkId = networkId;
    this.provider = provider;
    this.targetProvider = targetProvider;
    this.forwarderDomainData = forwarderDomainData;
    this.forwarderDomainDetails = forwarderDomainDetails;
    this.forwarderDomainType = forwarderDomainType;
    this.erc20Forwarder = erc20Forwarder;
    this.oracleAggregator = oracleAggregator;
    this.feeManager = feeManager;
    this.forwarder = forwarder;
    this.transferHandler = transferHandler;
    this.isSignerWithAccounts = isSignerWithAccounts;
    this.tokenGasPriceV1SupportedNetworks = tokenGasPriceV1SupportedNetworks;
    this.trustedForwarderOverhead = trustedForwarderOverhead;
    this.daiPermitOverhead = daiPermitOverhead;
    this.eip2612PermitOverhead = eip2612PermitOverhead;
  }
  /**
   * Check if given token address is supported by Biconomy or not.
   *
   * @param {address} token Token address to check
   */


  (0, _createClass2["default"])(ERC20ForwarderClient, [{
    key: "checkTokenSupport",
    value: function () {
      var _checkTokenSupport = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(token) {
        var isTokenSupported;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (ethers.utils.isAddress(token)) {
                  _context2.next = 2;
                  break;
                }

                throw new Error("\"token\" address ".concat(token, " is not a valid ethereum address"));

              case 2:
                if (this.feeManager) {
                  _context2.next = 4;
                  break;
                }

                throw new Error("Biconomy Fee Manager contract is not initialized properly.");

              case 4:
                _context2.next = 6;
                return this.feeManager.getTokenAllowed(token);

              case 6:
                isTokenSupported = _context2.sent;

                if (isTokenSupported) {
                  _context2.next = 9;
                  break;
                }

                throw new Error("Token with address ".concat(token, " is not supported. Please refer https://docs.biconomy.io to see list of supported tokens"));

              case 9:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function checkTokenSupport(_x2) {
        return _checkTokenSupport.apply(this, arguments);
      }

      return checkTokenSupport;
    }()
  }, {
    key: "isEthersProvider",
    value: function isEthersProvider(provider) {
      return ethers.providers.Provider.isProvider(provider);
    }
  }, {
    key: "callDefaultProvider",
    value: function () {
      var _callDefaultProvider = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(payload) {
        var targetProvider, response, _response;

        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.prev = 0;
                targetProvider = this.targetProvider;

                if (!targetProvider) {
                  _context3.next = 17;
                  break;
                }

                if (!this.isEthersProvider(targetProvider)) {
                  _context3.next = 11;
                  break;
                }

                _logMessage("default provider call"); //call using ethers provider using payload data, to, from
                //return response;


                _context3.next = 7;
                return targetProvider.send("eth_sendTransaction", [payload]);

              case 7:
                response = _context3.sent;
                return _context3.abrupt("return", response);

              case 11:
                _context3.next = 13;
                return targetProvider.send({
                  jsonrpc: "2.0",
                  id: 999999999999,
                  method: "eth_sendTransaction",
                  params: [payload]
                }, function (error, res) {
                  if (error) {
                    reject(error);
                  } else {
                    var transactionHash = res.result;
                    resolve(transactionHash);
                  }
                });

              case 13:
                _response = _context3.sent;
                return _context3.abrupt("return", _response);

              case 15:
                _context3.next = 19;
                break;

              case 17:
                _logMessage("No provider present in Biconomy that can sign messages");

                throw new Error("No provider present in Biconomy that can sign messages");

              case 19:
                _context3.next = 26;
                break;

              case 21:
                _context3.prev = 21;
                _context3.t0 = _context3["catch"](0);

                _logMessage("Unexpected error occured when calling default provider");

                _logMessage(_context3.t0);

                throw _context3.t0;

              case 26:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this, [[0, 21]]);
      }));

      function callDefaultProvider(_x3) {
        return _callDefaultProvider.apply(this, arguments);
      }

      return callDefaultProvider;
    }()
    /**
     * Method returns the apiId corresponding to the method being called as
     * given in the request object. The same apiId you can find on Biconomy
     * Dashboard under Manage API section.
     *
     * @param {object} req Request object containing required fields
     */

  }, {
    key: "getApiId",
    value: function getApiId(req) {
      try {
        if (!this.biconomyAttributes) throw new Error("Biconomy is not initialized properly. 'biconomyAttributes'  is missing in ERC20ForwarderClient");
        if (!this.biconomyAttributes.decoderMap) throw new Error("Biconomy is not initialized properly. 'decoderMap' is missing in ERC20ForwarderClient.biconomyAttributes");

        if (!req || !req.to || !req.data) {
          throw new Error("'to' and 'data' field is mandatory in the request object parameter");
        }

        var decoder = this.biconomyAttributes.decoderMap[req.to.toLowerCase()];

        if (decoder) {
          var method = decoder.decodeMethod(req.data);
          var contractData = this.biconomyAttributes.dappAPIMap[req.to.toLowerCase()];

          if (method && method.name) {
            if (contractData) {
              return this.biconomyAttributes.dappAPIMap[req.to.toLowerCase()][method.name.toString()];
            } else {
              throw new Error("Method ".concat(method.name, " is not registerd on Biconomy Dashboard. Please refer https://docs.biconomy.io to see how to register smart contract methods on dashboard."));
            }
          } else {
            throw new Error("Unable to decode the method. The method you are calling might not be registered on Biconomy dashboard. Please check.");
          }
        } else {
          throw new Error("Your smart contract with address ".concat(req.to, " might not be registered on Biconomy dashboard. Please check."));
        }
      } catch (error) {
        _logMessage(error);

        throw error;
      }
    }
  }, {
    key: "getCustomApiId",
    value: function getCustomApiId(req) {
      try {
        if (!this.biconomyAttributes) throw new Error("Biconomy is not initialized properly. 'biconomyAttributes'  is missing in ERC20ForwarderClient");
        if (!this.biconomyAttributes.decoderMap) throw new Error("Biconomy is not initialized properly. 'decoderMap' is missing in ERC20ForwarderClient.biconomyAttributes");

        if (!req.request || !req.request.to || !req.request.data) {
          throw new Error("'to' and 'data' field is mandatory in the request object parameter");
        }

        var decoder = this.biconomyAttributes.decoderMap[req.request.to.toLowerCase()];

        if (decoder) {
          var method = decoder.decodeMethod(req.request.data);
          var contractData = this.biconomyAttributes.dappAPIMap[req.request.to.toLowerCase()];

          if (method && method.name) {
            if (contractData) {
              return this.biconomyAttributes.dappAPIMap[req.request.to.toLowerCase()][method.name.toString()];
            } else {
              throw new Error("Method ".concat(method.name, " is not registerd on Biconomy Dashboard. Please refer https://docs.biconomy.io to see how to register smart contract methods on dashboard."));
            }
          } else {
            throw new Error("Unable to decode the method. The method you are calling might not be registered on Biconomy dashboard. Please check.");
          }
        } else {
          throw new Error("Your smart contract with address ".concat(req.request.to, " might not be registered on Biconomy dashboard. Please check."));
        }
      } catch (error) {
        _logMessage(error);

        throw error;
      }
    }
    /**
     * Method returns the gas price in the given ERC20 token based on
     * current gas price of the blockchain. It refers to a oracleAgggregator
     * smart contract that fetches the token price from onchain price oracles like
     * ChainLink, Uniswap etc.
     * @notice this method also checks if token gas price is supported for current provider network otherwise result is fetched form the server
     * @param {string} tokenAddress Token Address
     */

  }, {
    key: "getTokenGasPrice",
    value: function () {
      var _getTokenGasPrice = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(tokenAddress) {
        var tokenGasPriceURL, networkId, isRegularTokenGasPriceSupported, gasPrice, response, responseJson, tokenPrice, tokenOracleDecimals;
        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.prev = 0;
                networkId = this.networkId;
                isRegularTokenGasPriceSupported = this.tokenGasPriceV1SupportedNetworks.indexOf(parseInt(networkId)) == -1 ? false : true;

                if (ethers.utils.isAddress(tokenAddress)) {
                  _context4.next = 5;
                  break;
                }

                throw new Error("Invalid token address: ".concat(tokenAddress, " Please passs a valid ethereum address"));

              case 5:
                if (this.oracleAggregator) {
                  _context4.next = 7;
                  break;
                }

                throw new Error("Oracle Aggregator contract is not initialized properly");

              case 7:
                _context4.t0 = ethers.BigNumber;
                _context4.next = 10;
                return getGasPrice(this.networkId);

              case 10:
                _context4.t1 = _context4.sent;
                gasPrice = _context4.t0.from.call(_context4.t0, _context4.t1);

                if (!(gasPrice == undefined || gasPrice == 0)) {
                  _context4.next = 14;
                  break;
                }

                throw new Error("Invalid gasPrice value ".concat(gasPrice, ". Unable to fetch gas price."));

              case 14:
                if (isRegularTokenGasPriceSupported) {
                  _context4.next = 36;
                  break;
                }

                _context4.prev = 15;
                tokenGasPriceURL = "".concat(config.baseURL, "/api/v1/token-gas-price?tokenAddress=").concat(tokenAddress, "&networkId=").concat(networkId);
                _context4.next = 19;
                return fetch(tokenGasPriceURL);

              case 19:
                response = _context4.sent;

                if (!(response && response.json)) {
                  _context4.next = 29;
                  break;
                }

                _context4.next = 23;
                return response.json();

              case 23:
                responseJson = _context4.sent;

                _logMessage("Token Gas Price Response JSON " + JSON.stringify(responseJson));

                if (!(responseJson && responseJson.tokenGasPrice && responseJson.tokenGasPrice.value)) {
                  _context4.next = 27;
                  break;
                }

                return _context4.abrupt("return", responseJson.tokenGasPrice.value.toString());

              case 27:
                _context4.next = 30;
                break;

              case 29:
                throw new Error("Error getting gas price from url ".concat(tokenGasPriceURL));

              case 30:
                _context4.next = 36;
                break;

              case 32:
                _context4.prev = 32;
                _context4.t2 = _context4["catch"](15);

                _logMessage(_context4.t2);

                throw _context4.t2;

              case 36:
                _context4.next = 38;
                return this.oracleAggregator.getTokenPrice(tokenAddress);

              case 38:
                tokenPrice = _context4.sent;
                _context4.next = 41;
                return this.oracleAggregator.getTokenOracleDecimals(tokenAddress);

              case 41:
                tokenOracleDecimals = _context4.sent;

                if (!(!tokenPrice || !tokenOracleDecimals)) {
                  _context4.next = 44;
                  break;
                }

                throw new Error("Invalid tokenPrice ".concat(tokenPrice, " or tokenOracleDecimals ").concat(tokenOracleDecimals, " from oracle aggregator contract"));

              case 44:
                return _context4.abrupt("return", gasPrice.mul(ethers.BigNumber.from(10).pow(tokenOracleDecimals)).div(tokenPrice).toString());

              case 47:
                _context4.prev = 47;
                _context4.t3 = _context4["catch"](0);

                _logMessage(_context4.t3);

                throw new Error("Error getting token gas price inside SDK");

              case 51:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this, [[0, 47], [15, 32]]);
      }));

      function getTokenGasPrice(_x4) {
        return _getTokenGasPrice.apply(this, arguments);
      }

      return getTokenGasPrice;
    }()
    /**
     * Method builds a request object based on the input parameters.
     * Method fetches the user nonce from Biconomy Forwarder contract.
     * If you want to perform parallel transactions from same user account,
     * use different batchIds.
     *
     * It returns the request object to be signed by the user and also gas estimation
     * in the given token to be used to pay transaction gas fee from user's account.
     *
     * @param {string} to Target Smart contract address
     * @param {string} token Token address in which gas payment is to be made
     * @param {number|string} txGas Estimated transaction gas for target method
     * @param {string} data Encoded target method data to be called
     * @param {number} batchId Batch id used to determine user nonce on Biconomy Forwarder contract
     * @param {number} deadlineInSec Deadline in seconds after which transaction will fail
     * @param {string} userAddress <Optional> If provider is not signer with accounts userAddress must be passed
     * @param {string} permitType <Optional> only to be passed if intended for permit chained execution.
     */
    //todo
    //needs changes in checking token approval and cost calculation to be moved elsewhere

  }, {
    key: "buildTx",
    value: function () {
      var _buildTx = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(_ref3) {
        var to, token, txGas, data, _ref3$batchId, batchId, _ref3$deadlineInSec, deadlineInSec, userAddress, permitType, nonce, tokenGasPrice, req, feeMultiplier, tokenOracleDecimals, transferHandlerGas, tokenContract, tokenDecimals, permitFees, overHead, permitCost, tokenSpendValue, cost, spendValue, fee, totalFees, allowedToSpend;

        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                to = _ref3.to, token = _ref3.token, txGas = _ref3.txGas, data = _ref3.data, _ref3$batchId = _ref3.batchId, batchId = _ref3$batchId === void 0 ? 0 : _ref3$batchId, _ref3$deadlineInSec = _ref3.deadlineInSec, deadlineInSec = _ref3$deadlineInSec === void 0 ? 3600 : _ref3$deadlineInSec, userAddress = _ref3.userAddress, permitType = _ref3.permitType;
                _context5.prev = 1;

                if (this.forwarder) {
                  _context5.next = 4;
                  break;
                }

                throw new Error("Biconomy Forwarder contract is not initialized properly.");

              case 4:
                if (this.feeManager) {
                  _context5.next = 6;
                  break;
                }

                throw new Error("Biconomy Fee Manager contract is not initialized properly.");

              case 6:
                if (this.oracleAggregator) {
                  _context5.next = 8;
                  break;
                }

                throw new Error("Biconomy Oracle Aggregator contract is not initialized properly.");

              case 8:
                if (this.erc20Forwarder) {
                  _context5.next = 10;
                  break;
                }

                throw new Error("Biconomy Fee Proxy contract is not initialized properly.");

              case 10:
                if (!permitType) {
                  _context5.next = 13;
                  break;
                }

                if (!(!permitType == config.DAI || !permitType == config.EIP2612)) {
                  _context5.next = 13;
                  break;
                }

                throw new Error("permit type passed is not matching expected possible values");

              case 13:
                if (ethers.utils.isAddress(to)) {
                  _context5.next = 15;
                  break;
                }

                throw new Error("\"to\" address ".concat(to, " is not a valid ethereum address"));

              case 15:
                if (ethers.utils.isAddress(token)) {
                  _context5.next = 17;
                  break;
                }

                throw new Error("\"token\" address ".concat(token, " is not a valid ethereum address"));

              case 17:
                if (txGas) {
                  _context5.next = 19;
                  break;
                }

                throw new Error("'txGas' parameter is mandatory");

              case 19:
                _context5.next = 21;
                return this.checkTokenSupport(token);

              case 21:
                if (userAddress) {
                  _context5.next = 29;
                  break;
                }

                if (this.isSignerWithAccounts) {
                  _context5.next = 26;
                  break;
                }

                throw new Error("Provider object passed to Biconomy does neither have user account information nor userAddress is passed. Refer to docs or contact Biconomy team to know how to use ERC20ForwarderClient properly");

              case 26:
                _context5.next = 28;
                return this.provider.getSigner().getAddress();

              case 28:
                userAddress = _context5.sent;

              case 29:
                _context5.next = 31;
                return this.forwarder.getNonce(userAddress, batchId);

              case 31:
                nonce = _context5.sent;
                _context5.next = 34;
                return this.getTokenGasPrice(token);

              case 34:
                tokenGasPrice = _context5.sent;
                req = {
                  from: userAddress,
                  to: to,
                  token: token,
                  txGas: txGas,
                  tokenGasPrice: tokenGasPrice,
                  batchId: batchId,
                  batchNonce: Number(nonce),
                  deadline: Math.floor(Date.now() / 1000 + deadlineInSec),
                  data: data
                };
                _context5.next = 38;
                return this.feeManager.getFeeMultiplier(userAddress, token);

              case 38:
                feeMultiplier = _context5.sent;
                _context5.next = 41;
                return this.oracleAggregator.getTokenOracleDecimals(token);

              case 41:
                tokenOracleDecimals = _context5.sent;
                _context5.next = 44;
                return this.erc20Forwarder.transferHandlerGas(token);

              case 44:
                transferHandlerGas = _context5.sent;

                _logMessage("TransferHandler gas from ERC20erc20Forwarder contract is ".concat(transferHandlerGas.toString()));

                if (!(feeMultiplier == undefined || tokenOracleDecimals == undefined || transferHandlerGas == undefined)) {
                  _context5.next = 48;
                  break;
                }

                throw new Error("One of the values is undefined. feeMultiplier: ".concat(feeMultiplier, " tokenOracleDecimals: ").concat(tokenOracleDecimals, " transferHandlerGas: ").concat(transferHandlerGas));

              case 48:
                // if intended for permit chained execution then should add gas usage cost of each type of permit
                tokenContract = new ethers.Contract(token, tokenAbi, this.provider);
                _context5.next = 51;
                return tokenContract.decimals();

              case 51:
                tokenDecimals = _context5.sent;

                if (permitType) {
                  overHead = permitType == config.DAI ? this.daiPermitOverhead : this.eip2612PermitOverhead;
                  permitCost = ethers.BigNumber.from(overHead.toString()).mul(ethers.BigNumber.from(req.tokenGasPrice)).mul(ethers.BigNumber.from(feeMultiplier.toString())).div(ethers.BigNumber.from(10000));
                  tokenSpendValue = parseFloat(permitCost).toString();
                  permitCost = (parseFloat(permitCost) / parseFloat(ethers.BigNumber.from(10).pow(tokenDecimals))).toFixed(3);
                  permitFees = parseFloat(permitCost.toString()); // Exact amount in tokens

                  _logMessage("Estimated Permit Transaction Fee in token address ".concat(token, " is ").concat(permitFees));
                }

                cost = ethers.BigNumber.from(req.txGas.toString()).add(ethers.BigNumber.from(this.trustedForwarderOverhead.toString())) // Estimate on the higher end
                .add(transferHandlerGas).mul(ethers.BigNumber.from(req.tokenGasPrice)).mul(ethers.BigNumber.from(feeMultiplier.toString())).div(ethers.BigNumber.from(10000));
                spendValue = parseFloat(cost).toString();
                cost = (parseFloat(cost) / parseFloat(ethers.BigNumber.from(10).pow(tokenDecimals))).toFixed(3);
                fee = parseFloat(cost.toString()); // Exact amount in tokens

                _logMessage("Estimated Transaction Fee in token address ".concat(token, " is ").concat(fee));

                totalFees = fee;

                if (permitFees) {
                  totalFees = parseFloat(fee + permitFees).toFixed(3);
                } // if intended for permit chained execution then should not check allowance


                if (permitType) {
                  _context5.next = 69;
                  break;
                }

                _context5.next = 63;
                return this.erc20ForwarderApproved(req.token, userAddress, spendValue);

              case 63:
                allowedToSpend = _context5.sent;

                if (allowedToSpend) {
                  _context5.next = 68;
                  break;
                }

                throw new Error("You have not given approval to ERC Forwarder contract to spend tokens");

              case 68:
                _logMessage("".concat(userAddress, " has given permission ").concat(this.erc20Forwarder.address, " to spend required amount of tokens"));

              case 69:
                return _context5.abrupt("return", {
                  request: req,
                  cost: totalFees
                });

              case 72:
                _context5.prev = 72;
                _context5.t0 = _context5["catch"](1);

                _logMessage(_context5.t0);

                throw _context5.t0;

              case 76:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this, [[1, 72]]);
      }));

      function buildTx(_x5) {
        return _buildTx.apply(this, arguments);
      }

      return buildTx;
    }()
  }, {
    key: "checkTokenBalance",
    value: function () {
      var _checkTokenBalance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(tokenAddress, userAddress, spendValue) {
        var providerOrSigner, token, balance;
        return _regenerator["default"].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if (this.isSignerWithAccounts) {
                  providerOrSigner = this.provider.getSigner();
                } else {
                  providerOrSigner = this.provider;
                }

                token = new ethers.Contract(tokenAddress, tokenAbi, providerOrSigner);
                spendValue = Number(spendValue);
                _context6.next = 5;
                return token.balanceOf(userAddress);

              case 5:
                balance = _context6.sent;

                if (!(balance > spendValue)) {
                  _context6.next = 10;
                  break;
                }

                return _context6.abrupt("return", true);

              case 10:
                return _context6.abrupt("return", false);

              case 11:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function checkTokenBalance(_x6, _x7, _x8) {
        return _checkTokenBalance.apply(this, arguments);
      }

      return checkTokenBalance;
    }()
  }, {
    key: "buildCustomTx",
    value: function () {
      var _buildCustomTx = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(_ref4) {
        var to, token, txGas, data, _ref4$batchId, batchId, _ref4$deadlineInSec, deadlineInSec, userAddress, permitType, _ref4$forwardInfo, forwardInfo, nonce, tokenGasPrice, req, feeMultiplier, tokenOracleDecimals, transferHandlerGas, tokenContract, tokenDecimals, permitFees, overHead, permitCost, tokenSpendValue, cost, spendValue, fee, totalFees, allowedToSpend, tokenSymbol, finalReq, userCanPay;

        return _regenerator["default"].wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                to = _ref4.to, token = _ref4.token, txGas = _ref4.txGas, data = _ref4.data, _ref4$batchId = _ref4.batchId, batchId = _ref4$batchId === void 0 ? 0 : _ref4$batchId, _ref4$deadlineInSec = _ref4.deadlineInSec, deadlineInSec = _ref4$deadlineInSec === void 0 ? 3600 : _ref4$deadlineInSec, userAddress = _ref4.userAddress, permitType = _ref4.permitType, _ref4$forwardInfo = _ref4.forwardInfo, forwardInfo = _ref4$forwardInfo === void 0 ? {} : _ref4$forwardInfo;
                _context7.prev = 1;

                if (this.forwarder) {
                  _context7.next = 4;
                  break;
                }

                throw new Error("Biconomy Forwarder contract is not initialized properly.");

              case 4:
                if (this.feeManager) {
                  _context7.next = 6;
                  break;
                }

                throw new Error("Biconomy Fee Manager contract is not initialized properly.");

              case 6:
                if (this.oracleAggregator) {
                  _context7.next = 8;
                  break;
                }

                throw new Error("Biconomy Oracle Aggregator contract is not initialized properly.");

              case 8:
                if (this.erc20Forwarder) {
                  _context7.next = 10;
                  break;
                }

                throw new Error("Biconomy Fee Proxy contract is not initialized properly.");

              case 10:
                if (!permitType) {
                  _context7.next = 13;
                  break;
                }

                if (!(!permitType == config.DAI || !permitType == config.EIP2612)) {
                  _context7.next = 13;
                  break;
                }

                throw new Error("permit type passed is not matching expected possible values");

              case 13:
                if (ethers.utils.isAddress(to)) {
                  _context7.next = 15;
                  break;
                }

                throw new Error("\"to\" address ".concat(to, " is not a valid ethereum address"));

              case 15:
                if (ethers.utils.isAddress(token)) {
                  _context7.next = 17;
                  break;
                }

                throw new Error("\"token\" address ".concat(token, " is not a valid ethereum address"));

              case 17:
                if (txGas) {
                  _context7.next = 19;
                  break;
                }

                throw new Error("'txGas' parameter is mandatory");

              case 19:
                _context7.next = 21;
                return this.checkTokenSupport(token);

              case 21:
                if (userAddress) {
                  _context7.next = 29;
                  break;
                }

                if (this.isSignerWithAccounts) {
                  _context7.next = 26;
                  break;
                }

                throw new Error("Provider object passed to Biconomy does neither have user account information nor userAddress is passed. Refer to docs or contact Biconomy team to know how to use ERC20ForwarderClient properly");

              case 26:
                _context7.next = 28;
                return this.provider.getSigner().getAddress();

              case 28:
                userAddress = _context7.sent;

              case 29:
                _context7.next = 31;
                return this.forwarder.getNonce(userAddress, batchId);

              case 31:
                nonce = _context7.sent;
                _context7.next = 34;
                return this.getTokenGasPrice(token);

              case 34:
                tokenGasPrice = _context7.sent;
                req = {
                  from: userAddress,
                  to: to,
                  token: token,
                  txGas: txGas,
                  tokenGasPrice: tokenGasPrice,
                  batchId: batchId,
                  batchNonce: Number(nonce),
                  deadline: Math.floor(Date.now() / 1000 + deadlineInSec),
                  data: data
                };
                _context7.next = 38;
                return this.feeManager.getFeeMultiplier(userAddress, token);

              case 38:
                feeMultiplier = _context7.sent;
                _context7.next = 41;
                return this.oracleAggregator.getTokenOracleDecimals(token);

              case 41:
                tokenOracleDecimals = _context7.sent;
                _context7.next = 44;
                return this.erc20Forwarder.transferHandlerGas(token);

              case 44:
                transferHandlerGas = _context7.sent;

                _logMessage("TransferHandler gas from ERC20erc20Forwarder contract is ".concat(transferHandlerGas.toString()));

                if (!(feeMultiplier == undefined || tokenOracleDecimals == undefined || transferHandlerGas == undefined)) {
                  _context7.next = 48;
                  break;
                }

                throw new Error("One of the values is undefined. feeMultiplier: ".concat(feeMultiplier, " tokenOracleDecimals: ").concat(tokenOracleDecimals, " transferHandlerGas: ").concat(transferHandlerGas));

              case 48:
                // if intended for permit chained execution then should add gas usage cost of each type of permit
                tokenContract = new ethers.Contract(token, tokenAbi, this.provider);
                _context7.next = 51;
                return tokenContract.decimals();

              case 51:
                tokenDecimals = _context7.sent;

                if (permitType) {
                  overHead = permitType == config.DAI ? this.daiPermitOverhead : this.eip2612PermitOverhead;
                  permitCost = ethers.BigNumber.from(overHead.toString()).mul(ethers.BigNumber.from(req.tokenGasPrice)).mul(ethers.BigNumber.from(feeMultiplier.toString())).div(ethers.BigNumber.from(10000));
                  tokenSpendValue = parseFloat(permitCost).toString();
                  permitCost = (parseFloat(permitCost) / parseFloat(ethers.BigNumber.from(10).pow(tokenDecimals))).toFixed(5);
                  permitFees = parseFloat(permitCost.toString()); // Exact amount in tokens

                  _logMessage("Estimated Permit Transaction Fee in token address ".concat(token, " is ").concat(permitFees));
                }

                cost = ethers.BigNumber.from(req.txGas.toString()).add(ethers.BigNumber.from(this.trustedForwarderOverhead.toString())) // Estimate on the higher end
                .add(transferHandlerGas).mul(ethers.BigNumber.from(req.tokenGasPrice)).mul(ethers.BigNumber.from(feeMultiplier.toString())).div(ethers.BigNumber.from(10000));
                spendValue = parseFloat(cost).toString();
                cost = (parseFloat(cost) / parseFloat(ethers.BigNumber.from(10).pow(tokenDecimals))).toFixed(5);
                fee = parseFloat(cost.toString()); // Exact amount in tokens

                _logMessage("Estimated Transaction Fee in token address ".concat(token, " is ").concat(fee));

                totalFees = fee;

                if (permitFees) {
                  totalFees = parseFloat(fee + permitFees).toFixed(5);
                } // if intended for permit chained execution then should not check allowance


                if (permitType) {
                  _context7.next = 69;
                  break;
                }

                _context7.next = 63;
                return this.erc20ForwarderApproved(req.token, userAddress, spendValue);

              case 63:
                allowedToSpend = _context7.sent;

                if (allowedToSpend) {
                  _context7.next = 68;
                  break;
                }

                throw new Error("You have not given approval to ERC Forwarder contract to spend tokens");

              case 68:
                _logMessage("".concat(userAddress, " has given permission ").concat(this.erc20Forwarder.address, " to spend required amount of tokens"));

              case 69:
                tokenSymbol = forwardInfo.feeToken || 'SAND'; //call it fee token?

                finalReq = {
                  warning: forwardInfo.warning || '-',
                  info: "Estimated gas fee                ".concat(totalFees.toString(), " ").concat(tokenSymbol),
                  action: forwardInfo.action || 'Stake',
                  request: req
                };
                _context7.next = 73;
                return this.checkTokenBalance(req.token, userAddress, spendValue);

              case 73:
                userCanPay = _context7.sent;

                if (!userCanPay) {
                  /*throw new Error(
                    "User does not have enough token balance to pay for the fees"
                  );*/
                  finalReq.warning = forwardInfo.warning || "You don't have enough ".concat(tokenSymbol, " in your wallet!");
                } else {
                  _logMessage("".concat(userAddress, " has sufficient balance in tokens to cover the gas fees"));
                }

                return _context7.abrupt("return", {
                  request: finalReq,
                  cost: totalFees
                });

              case 78:
                _context7.prev = 78;
                _context7.t0 = _context7["catch"](1);

                _logMessage(_context7.t0);

                throw _context7.t0;

              case 82:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this, [[1, 78]]);
      }));

      function buildCustomTx(_x9) {
        return _buildCustomTx.apply(this, arguments);
      }

      return buildCustomTx;
    }()
  }, {
    key: "buildTransferTx",
    value: function () {
      var _buildTransferTx = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(_ref5) {
        var token, to, amount, userAddress, txCall, gasLimit;
        return _regenerator["default"].wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                token = _ref5.token, to = _ref5.to, amount = _ref5.amount, userAddress = _ref5.userAddress;
                _context8.prev = 1;
                _context8.next = 4;
                return this.transferHandler.populateTransaction.transfer(token, to, amount);

              case 4:
                txCall = _context8.sent;

                if (userAddress) {
                  _context8.next = 9;
                  break;
                }

                _context8.next = 8;
                return this.provider.getSigner().getAddress();

              case 8:
                userAddress = _context8.sent;

              case 9:
                _context8.next = 11;
                return this.provider.estimateGas({
                  from: userAddress,
                  to: this.transferHandler.address,
                  data: txCall.data
                });

              case 11:
                gasLimit = _context8.sent;

                _logMessage("Transfer handler gas limit is ".concat(gasLimit.toNumber()));

                _context8.next = 15;
                return this.buildTx({
                  to: this.transferHandler.address,
                  token: token,
                  txGas: gasLimit.toNumber(),
                  data: txCall.data
                });

              case 15:
                return _context8.abrupt("return", _context8.sent);

              case 18:
                _context8.prev = 18;
                _context8.t0 = _context8["catch"](1);

                _logMessage(_context8.t0);

                throw _context8.t0;

              case 22:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this, [[1, 18]]);
      }));

      function buildTransferTx(_x10) {
        return _buildTransferTx.apply(this, arguments);
      }

      return buildTransferTx;
    }()
  }, {
    key: "erc20ForwarderApproved",
    value: function () {
      var _erc20ForwarderApproved = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(tokenAddress, userAddress, spendValue) {
        var providerOrSigner, token, allowance;
        return _regenerator["default"].wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                if (this.isSignerWithAccounts) {
                  providerOrSigner = this.provider.getSigner();
                } else {
                  providerOrSigner = this.provider;
                }

                token = new ethers.Contract(tokenAddress, tokenAbi, providerOrSigner);
                spendValue = Number(spendValue);
                _context9.next = 5;
                return token.allowance(userAddress, this.erc20Forwarder.address);

              case 5:
                allowance = _context9.sent;

                if (!(allowance > spendValue)) {
                  _context9.next = 10;
                  break;
                }

                return _context9.abrupt("return", true);

              case 10:
                return _context9.abrupt("return", false);

              case 11:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function erc20ForwarderApproved(_x11, _x12, _x13) {
        return _erc20ForwarderApproved.apply(this, arguments);
      }

      return erc20ForwarderApproved;
    }()
    /**
     * Method gets the user signature in EIP712 format and send the transaction
     * via Biconomy meta transaction API .
     * Check buildTx() method to see how to build the req object.
     * Signature param and userAddress are optional if you have initialized biconomy
     * with a provider that has user account information.
     *
     * @param {object} req Request object to be signed and sent
     * @param {string} signature Signature string singed from user account
     * @param {string} userAddress User blockchain address (optional) must pass when you have signer without accounts
     * @param {number} gasLimit custom gasLimit (optional) to pass for this transaction
     */

  }, {
    key: "sendTxEIP712",
    value: function () {
      var _sendTxEIP = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10(_ref6) {
        var req, _ref6$signature, signature, userAddress, gasLimit, domainSeparator, dataToSign, sig, api, apiId, metaTxBody, txResponse;

        return _regenerator["default"].wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                req = _ref6.req, _ref6$signature = _ref6.signature, signature = _ref6$signature === void 0 ? null : _ref6$signature, userAddress = _ref6.userAddress, gasLimit = _ref6.gasLimit;
                _context10.prev = 1;
                //possibly check allowance here
                domainSeparator = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "bytes32", "address", "bytes32"], [ethers.utils.id("EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)"), ethers.utils.id(this.forwarderDomainData.name), ethers.utils.id(this.forwarderDomainData.version), this.forwarderDomainData.verifyingContract, this.forwarderDomainData.salt]));

                if (!this.isSignerWithAccounts) {
                  _context10.next = 9;
                  break;
                }

                _context10.next = 6;
                return this.provider.getSigner().getAddress();

              case 6:
                userAddress = _context10.sent;
                _context10.next = 11;
                break;

              case 9:
                if (signature) {
                  _context10.next = 11;
                  break;
                }

                throw new Error("Either pass signature param or pass a provider to Biconomy with user accounts information");

              case 11:
                if (userAddress) {
                  _context10.next = 13;
                  break;
                }

                throw new Error("Either pass userAddress param or pass a provider to Biconomy with user accounts information");

              case 13:
                dataToSign = {
                  types: {
                    EIP712Domain: this.forwarderDomainType,
                    ERC20ForwardRequest: erc20ForwardRequestType
                  },
                  domain: this.forwarderDomainData,
                  primaryType: "ERC20ForwardRequest",
                  message: req
                };

                if (!(signature == null)) {
                  _context10.next = 20;
                  break;
                }

                _context10.next = 17;
                return this.provider.send("eth_signTypedData_v3", [req.from, JSON.stringify(dataToSign)]);

              case 17:
                _context10.t0 = _context10.sent;
                _context10.next = 21;
                break;

              case 20:
                _context10.t0 = signature;

              case 21:
                sig = _context10.t0;
                api = this.getApiId(req);

                if (!(!api || !api.id)) {
                  _context10.next = 25;
                  break;
                }

                throw new Error("Could not find the method information on Biconomy Dashboard. Check if you have registered your method on the Dashboard.");

              case 25:
                apiId = api.id;
                metaTxBody = {
                  to: req.to,
                  from: userAddress,
                  apiId: apiId,
                  params: [req, domainSeparator, sig],
                  gasLimit: gasLimit,
                  signatureType: this.biconomyAttributes.signType.EIP712_SIGN
                };
                _context10.next = 29;
                return fetch("".concat(config.baseURL, "/api/v2/meta-tx/native"), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.biconomyAttributes.apiKey
                  },
                  body: JSON.stringify(metaTxBody)
                });

              case 29:
                txResponse = _context10.sent;
                _context10.next = 32;
                return txResponse.json();

              case 32:
                return _context10.abrupt("return", _context10.sent);

              case 35:
                _context10.prev = 35;
                _context10.t1 = _context10["catch"](1);

                _logMessage(_context10.t1);

                throw _context10.t1;

              case 39:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this, [[1, 35]]);
      }));

      function sendTxEIP712(_x14) {
        return _sendTxEIP.apply(this, arguments);
      }

      return sendTxEIP712;
    }()
  }, {
    key: "sendCustomTxEIP712",
    value: function () {
      var _sendCustomTxEIP = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee11(_ref7) {
        var req, _ref7$signature, signature, userAddress, gasLimit, metaInfo, domainSeparator, dataToSign, sig, api, apiId, metaTxBody, txResponse, response, payload, hash, finalResponse;

        return _regenerator["default"].wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                req = _ref7.req, _ref7$signature = _ref7.signature, signature = _ref7$signature === void 0 ? null : _ref7$signature, userAddress = _ref7.userAddress, gasLimit = _ref7.gasLimit, metaInfo = _ref7.metaInfo;
                _context11.prev = 1;
                domainSeparator = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "bytes32", "address", "bytes32"], [ethers.utils.id("EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)"), ethers.utils.id(this.forwarderDomainData.name), ethers.utils.id(this.forwarderDomainData.version), this.forwarderDomainData.verifyingContract, this.forwarderDomainData.salt])); // TODO : isSignerWithAccounts check could be removed
                // Use this.targetProvider instead

                if (!this.isSignerWithAccounts) {
                  _context11.next = 9;
                  break;
                }

                _context11.next = 6;
                return this.provider.getSigner().getAddress();

              case 6:
                userAddress = _context11.sent;
                _context11.next = 11;
                break;

              case 9:
                if (signature) {
                  _context11.next = 11;
                  break;
                }

                throw new Error("Either pass signature param or pass a provider to Biconomy with user accounts information");

              case 11:
                if (userAddress) {
                  _context11.next = 13;
                  break;
                }

                throw new Error("Either pass userAddress param or pass a provider to Biconomy with user accounts information");

              case 13:
                dataToSign = {
                  types: {
                    EIP712Domain: this.forwarderDomainType,
                    ERC20ForwardRequest: erc20ForwardRequestType,
                    CustomForwardRequest: customForwardRequestType
                  },
                  domain: this.forwarderDomainData,
                  primaryType: "CustomForwardRequest",
                  message: req
                };

                if (!(signature == null)) {
                  _context11.next = 20;
                  break;
                }

                _context11.next = 17;
                return this.provider.send("eth_signTypedData_v3", [req.request.from, JSON.stringify(dataToSign)]);

              case 17:
                _context11.t0 = _context11.sent;
                _context11.next = 21;
                break;

              case 20:
                _context11.t0 = signature;

              case 21:
                sig = _context11.t0;
                api = this.getCustomApiId(req);

                if (!(!api || !api.id)) {
                  _context11.next = 25;
                  break;
                }

                throw new Error("Could not find the method information on Biconomy Dashboard. Check if you have registered your method on the Dashboard.");

              case 25:
                apiId = api.id;
                metaTxBody = {
                  to: req.request.to,
                  from: userAddress,
                  apiId: apiId,
                  params: [req, domainSeparator, sig],
                  metaInfo: metaInfo,
                  // just pass it on
                  gasLimit: gasLimit,
                  signatureType: this.biconomyAttributes.signType.EIP712_SIGN
                };
                _context11.next = 29;
                return fetch("".concat(config.baseURL, "/api/v2/meta-tx/native"), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.biconomyAttributes.apiKey
                  },
                  body: JSON.stringify(metaTxBody)
                });

              case 29:
                txResponse = _context11.sent;
                _context11.next = 32;
                return txResponse.json();

              case 32:
                response = _context11.sent;

                if (!(response.code != 200)) {
                  _context11.next = 52;
                  break;
                }

                payload = {};
                payload.from = userAddress;
                payload.to = req.request.to;
                payload.gasLimit = req.request.txGas;
                payload.data = req.request.data;
                _context11.prev = 39;
                hash = this.callDefaultProvider(payload);
                finalResponse = {};
                finalResponse.code = 200;
                finalResponse.txHash = hash;
                finalResponse.message = "Transaction went successfully through default provider";
                return _context11.abrupt("return", finalResponse);

              case 48:
                _context11.prev = 48;
                _context11.t1 = _context11["catch"](39);

                _logMessage(_context11.t1);

                throw _context11.t1;

              case 52:
                return _context11.abrupt("return", response);

              case 55:
                _context11.prev = 55;
                _context11.t2 = _context11["catch"](1);

                _logMessage(_context11.t2);

                throw _context11.t2;

              case 59:
              case "end":
                return _context11.stop();
            }
          }
        }, _callee11, this, [[1, 55], [39, 48]]);
      }));

      function sendCustomTxEIP712(_x15) {
        return _sendCustomTxEIP.apply(this, arguments);
      }

      return sendCustomTxEIP712;
    }()
    /**
     * Method gets the user signature in EIP712 format and send the transaction
     * via Biconomy meta transaction API .
     * Check buildTx() method to see how to build the req object.
     * Signature param and userAddress are optional if you have initialized biconomy
     * with a provider that has user account information.
     *
     * @param {object} req Request object to be signed and sent
     * @param {string} signature Signature string singed from user account
     * @param {string} userAddress User blockchain address (optional) must pass when you have signer without accounts
     * @param {number} gasLimit custom gasLimit (optional) to pass for this transaction
     * @param {object} metaInfo For permit chained execution clients can pass permitType {string} constant and permitData {object} containing permit options.
     */

  }, {
    key: "permitAndSendTxEIP712",
    value: function () {
      var _permitAndSendTxEIP = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee12(_ref8) {
        var req, _ref8$signature, signature, userAddress, metaInfo, gasLimit, domainSeparator, dataToSign, sig, api, apiId, metaTxBody, txResponse;

        return _regenerator["default"].wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                req = _ref8.req, _ref8$signature = _ref8.signature, signature = _ref8$signature === void 0 ? null : _ref8$signature, userAddress = _ref8.userAddress, metaInfo = _ref8.metaInfo, gasLimit = _ref8.gasLimit;
                _context12.prev = 1;
                domainSeparator = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "bytes32", "address", "bytes32"], [ethers.utils.id("EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)"), ethers.utils.id(this.forwarderDomainData.name), ethers.utils.id(this.forwarderDomainData.version), this.forwarderDomainData.verifyingContract, this.forwarderDomainData.salt]));

                if (!this.isSignerWithAccounts) {
                  _context12.next = 9;
                  break;
                }

                _context12.next = 6;
                return this.provider.getSigner().getAddress();

              case 6:
                userAddress = _context12.sent;
                _context12.next = 11;
                break;

              case 9:
                if (signature) {
                  _context12.next = 11;
                  break;
                }

                throw new Error("Either pass signature param or pass a provider to Biconomy with user accounts information");

              case 11:
                if (userAddress) {
                  _context12.next = 13;
                  break;
                }

                throw new Error("Either pass userAddress param or pass a provider to Biconomy with user accounts information");

              case 13:
                dataToSign = {
                  types: {
                    EIP712Domain: this.forwarderDomainType,
                    ERC20ForwardRequest: erc20ForwardRequestType
                  },
                  domain: this.forwarderDomainData,
                  primaryType: "ERC20ForwardRequest",
                  message: req
                };

                if (!(signature == null)) {
                  _context12.next = 20;
                  break;
                }

                _context12.next = 17;
                return this.provider.send("eth_signTypedData_v3", [req.from, JSON.stringify(dataToSign)]);

              case 17:
                _context12.t0 = _context12.sent;
                _context12.next = 21;
                break;

              case 20:
                _context12.t0 = signature;

              case 21:
                sig = _context12.t0;
                api = this.getApiId(req);

                if (!(!api || !api.id)) {
                  _context12.next = 25;
                  break;
                }

                throw new Error("Could not find the method information on Biconomy Dashboard. Check if you have registered your method on the Dashboard.");

              case 25:
                apiId = api.id;
                metaTxBody = {
                  to: req.to,
                  from: userAddress,
                  apiId: apiId,
                  params: [req, domainSeparator, sig],
                  metaInfo: metaInfo,
                  // just pass it on
                  gasLimit: gasLimit,
                  signatureType: this.biconomyAttributes.signType.EIP712_SIGN
                };
                _context12.next = 29;
                return fetch("".concat(config.baseURL, "/api/v2/meta-tx/native"), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.biconomyAttributes.apiKey
                  },
                  body: JSON.stringify(metaTxBody)
                });

              case 29:
                txResponse = _context12.sent;
                _context12.next = 32;
                return txResponse.json();

              case 32:
                return _context12.abrupt("return", _context12.sent);

              case 35:
                _context12.prev = 35;
                _context12.t1 = _context12["catch"](1);

                _logMessage(_context12.t1);

                throw _context12.t1;

              case 39:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12, this, [[1, 35]]);
      }));

      function permitAndSendTxEIP712(_x16) {
        return _permitAndSendTxEIP.apply(this, arguments);
      }

      return permitAndSendTxEIP712;
    }()
    /**
     * Method gets the user signature in personal_sign format and send the transaction
     * via Biconomy meta transaction API .
     * Check buildTx() method to see how to build the req object.
     * Signature param and userAddress are optional if you have initialized biconomy
     * with a provider that has user account information.
     *
     * @param {object} req Request object to be signed and sent
     * @param {string} signature Signature string singed from user account
     * @param {string} userAddress User blockchain address (optional) must pass when you have signer without accounts
     * @param {number} gasLimit custom gasLimit (optional) to pass for this transaction
     */

  }, {
    key: "sendTxPersonalSign",
    value: function () {
      var _sendTxPersonalSign = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee13(_ref9) {
        var req, _ref9$signature, signature, userAddress, gasLimit, hashToSign, signer, sig, api, apiId, metaTxBody, txResponse;

        return _regenerator["default"].wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                req = _ref9.req, _ref9$signature = _ref9.signature, signature = _ref9$signature === void 0 ? null : _ref9$signature, userAddress = _ref9.userAddress, gasLimit = _ref9.gasLimit;
                _context13.prev = 1;
                hashToSign = abi.soliditySHA3(["address", "address", "address", "uint256", "uint256", "uint256", "uint256", "uint256", "bytes32"], [req.from, req.to, req.token, req.txGas, req.tokenGasPrice, req.batchId, req.batchNonce, req.deadline, ethers.utils.keccak256(req.data)]);
                signer = this.provider.getSigner();

                if (!this.isSignerWithAccounts) {
                  _context13.next = 10;
                  break;
                }

                _context13.next = 7;
                return signer.getAddress();

              case 7:
                userAddress = _context13.sent;
                _context13.next = 12;
                break;

              case 10:
                if (signature) {
                  _context13.next = 12;
                  break;
                }

                throw new Error("Either pass signature param or pass a provider to Biconomy with user accounts information");

              case 12:
                if (userAddress) {
                  _context13.next = 14;
                  break;
                }

                throw new Error("Either pass userAddress param or pass a provider to Biconomy with user accounts information");

              case 14:
                if (!(signature == null && this.isSignerWithAccounts)) {
                  _context13.next = 20;
                  break;
                }

                _context13.next = 17;
                return signer.signMessage(hashToSign);

              case 17:
                _context13.t0 = _context13.sent;
                _context13.next = 21;
                break;

              case 20:
                _context13.t0 = signature;

              case 21:
                sig = _context13.t0;

                if (!(sig == null || sig == undefined)) {
                  _context13.next = 24;
                  break;
                }

                throw new Error("Either pass signature param or pass a provider to Biconomy with user accounts information");

              case 24:
                api = this.getApiId(req);

                if (!(!api || !api.id)) {
                  _context13.next = 27;
                  break;
                }

                throw new Error("Could not find the method information on Biconomy Dashboard. Check if you have registered your method on the Dashboard.");

              case 27:
                apiId = api.id;
                metaTxBody = {
                  to: req.to,
                  from: userAddress,
                  apiId: apiId,
                  params: [req, sig],
                  gasLimit: gasLimit,
                  signatureType: this.biconomyAttributes.signType.PERSONAL_SIGN
                };
                _context13.next = 31;
                return fetch("".concat(config.baseURL, "/api/v2/meta-tx/native"), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.biconomyAttributes.apiKey
                  },
                  body: JSON.stringify(metaTxBody)
                });

              case 31:
                txResponse = _context13.sent;
                _context13.next = 34;
                return txResponse.json();

              case 34:
                return _context13.abrupt("return", _context13.sent);

              case 37:
                _context13.prev = 37;
                _context13.t1 = _context13["catch"](1);

                _logMessage(_context13.t1);

                throw _context13.t1;

              case 41:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this, [[1, 37]]);
      }));

      function sendTxPersonalSign(_x17) {
        return _sendTxPersonalSign.apply(this, arguments);
      }

      return sendTxPersonalSign;
    }()
  }]);
  return ERC20ForwarderClient;
}();

module.exports = ERC20ForwarderClient;