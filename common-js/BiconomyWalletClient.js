"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var ethers = require("ethers");

var _require = require("./config"),
    config = _require.config;

var _require2 = require('./abis'),
    baseWalletAbi = _require2.baseWalletAbi,
    walletFactoryAbi = _require2.walletFactoryAbi,
    entryPointAbi = _require2.entryPointAbi;

function isEthersProvider(provider) {
  return ethers.providers.Provider.isProvider(provider);
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
/**
 * Class to provide methods for biconomy wallet deployment, signature building and sending the transaction
 */


var BiconomyWalletClient = /*#__PURE__*/function () {
  function BiconomyWalletClient(_ref) {
    var biconomyProvider = _ref.biconomyProvider,
        provider = _ref.provider,
        targetProvider = _ref.targetProvider,
        biconomyAttributes = _ref.biconomyAttributes,
        isSignerWithAccounts = _ref.isSignerWithAccounts,
        walletFactoryAddress = _ref.walletFactoryAddress,
        baseWalletAddress = _ref.baseWalletAddress,
        entryPointAddress = _ref.entryPointAddress,
        handlerAddress = _ref.handlerAddress,
        networkId = _ref.networkId;
    (0, _classCallCheck2["default"])(this, BiconomyWalletClient);
    this.engine = biconomyProvider; // Marked for removal

    this.biconomyAttributes = biconomyAttributes;
    this.isSignerWithAccounts = isSignerWithAccounts;
    this.provider = provider;
    this.targetProvider = targetProvider;
    this.walletFactoryAddress = walletFactoryAddress;
    this.baseWalletAddress = baseWalletAddress;
    this.entryPointAddress = entryPointAddress;
    this.handlerAddress = handlerAddress;
    var providerOrSigner;

    if (this.isSignerWithAccounts) {
      providerOrSigner = this.provider.getSigner();
    } else {
      providerOrSigner = this.provider;
    }

    this.providerOrSigner = providerOrSigner;
    this.networkId = networkId;
    this.walletFactory = new ethers.Contract(this.walletFactoryAddress, walletFactoryAbi, this.providerOrSigner);
    this.baseWallet = new ethers.Contract(this.baseWalletAddress, baseWalletAbi, this.providerOrSigner);
    this.entryPoint = new ethers.Contract(this.entryPointAddress, entryPointAbi, this.providerOrSigner);
  }

  (0, _createClass2["default"])(BiconomyWalletClient, [{
    key: "checkIfWalletExists",
    value: function () {
      var _checkIfWalletExists = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(_ref2) {
        var eoa, _ref2$index, index, walletAddress, doesWalletExist;

        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                eoa = _ref2.eoa, _ref2$index = _ref2.index, index = _ref2$index === void 0 ? 0 : _ref2$index;
                _context.next = 3;
                return this.walletFactory.getAddressForCounterfactualWallet(eoa, index);

              case 3:
                walletAddress = _context.sent;
                _context.next = 6;
                return this.walletFactory.isWalletExist(walletAddress);

              case 6:
                doesWalletExist = _context.sent;

                if (!doesWalletExist) {
                  _context.next = 9;
                  break;
                }

                return _context.abrupt("return", {
                  doesWalletExist: doesWalletExist,
                  walletAddress: walletAddress
                });

              case 9:
                return _context.abrupt("return", {
                  doesWalletExist: doesWalletExist,
                  walletAddress: null
                });

              case 10:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function checkIfWalletExists(_x) {
        return _checkIfWalletExists.apply(this, arguments);
      }

      return checkIfWalletExists;
    }()
  }, {
    key: "checkIfWalletExistsAndDeploy",
    value: function () {
      var _checkIfWalletExistsAndDeploy = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(_ref3) {
        var eoa, _ref3$index, index, webHookAttributes, walletAddress, doesWalletExist, executionData, dispatchProvider, txParams, tx;

        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                eoa = _ref3.eoa, _ref3$index = _ref3.index, index = _ref3$index === void 0 ? 0 : _ref3$index, webHookAttributes = _ref3.webHookAttributes;
                _context2.next = 3;
                return this.walletFactory.getAddressForCounterfactualWallet(eoa, index);

              case 3:
                walletAddress = _context2.sent;
                _context2.next = 6;
                return this.walletFactory.isWalletExist[walletAddress];

              case 6:
                doesWalletExist = _context2.sent;
                this.walletFactory = this.walletFactory.connect(this.engine.getSignerByAddress(eoa));

                if (doesWalletExist) {
                  _context2.next = 24;
                  break;
                }

                _context2.next = 11;
                return this.walletFactory.populateTransaction.deployCounterFactualWallet(eoa, this.entryPointAddress, this.handlerAddress, index);

              case 11:
                executionData = _context2.sent;
                dispatchProvider = this.engine.getEthersProvider();
                txParams = {
                  data: executionData.data,
                  to: this.walletFactory.address,
                  from: eoa,
                  webHookAttributes: webHookAttributes
                };
                _context2.prev = 14;
                _context2.next = 17;
                return dispatchProvider.send("eth_sendTransaction", [txParams]);

              case 17:
                tx = _context2.sent;
                _context2.next = 24;
                break;

              case 20:
                _context2.prev = 20;
                _context2.t0 = _context2["catch"](14);
                // handle conditional rejections in this stack trace
                console.log(_context2.t0);
                throw _context2.t0;

              case 24:
                return _context2.abrupt("return", walletAddress);

              case 25:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this, [[14, 20]]);
      }));

      function checkIfWalletExistsAndDeploy(_x2) {
        return _checkIfWalletExistsAndDeploy.apply(this, arguments);
      }

      return checkIfWalletExistsAndDeploy;
    }() // Gasless transaction
    // gasPrice and baseGas will always be zero
    // we would add separate ERC20 (Forward) payment handlers in sdk

  }, {
    key: "buildExecTransaction",
    value: function () {
      var _buildExecTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(_ref4) {
        var data, to, walletAddress, _ref4$batchId, batchId, nonce;

        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                data = _ref4.data, to = _ref4.to, walletAddress = _ref4.walletAddress, _ref4$batchId = _ref4.batchId, batchId = _ref4$batchId === void 0 ? 0 : _ref4$batchId;
                this.baseWallet = this.baseWallet.attach(walletAddress);
                _context3.next = 4;
                return this.baseWallet.getNonce(batchId);

              case 4:
                nonce = _context3.sent;
                return _context3.abrupt("return", {
                  to: to,
                  value: 0,
                  data: data,
                  operation: 0,
                  safeTxGas: 0,
                  baseGas: 0,
                  gasPrice: 0,
                  gasToken: config.ZERO_ADDRESS,
                  refundReceiver: config.ZERO_ADDRESS,
                  nonce: nonce
                });

              case 6:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function buildExecTransaction(_x3) {
        return _buildExecTransaction.apply(this, arguments);
      }

      return buildExecTransaction;
    }()
  }, {
    key: "sendBiconomyWalletTransaction",
    value: function () {
      var _sendBiconomyWalletTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(_ref5) {
        var execTransactionBody, walletAddress, signatureType, _ref5$signature, signature, webHookAttributes, transactionHash, _getSignatureParamete, r, s, v, executionData, dispatchProvider, txParams, tx;

        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                execTransactionBody = _ref5.execTransactionBody, walletAddress = _ref5.walletAddress, signatureType = _ref5.signatureType, _ref5$signature = _ref5.signature, signature = _ref5$signature === void 0 ? null : _ref5$signature, webHookAttributes = _ref5.webHookAttributes;

                if (this.isSignerWithAccounts) {
                  _context4.next = 4;
                  break;
                }

                if (signature) {
                  _context4.next = 4;
                  break;
                }

                throw new Error("Either pass signature param or pass a provider to Biconomy with user accounts information");

              case 4:
                if (signature) {
                  _context4.next = 21;
                  break;
                }

                if (!(signatureType === 'PERSONAL_SIGN')) {
                  _context4.next = 18;
                  break;
                }

                _context4.next = 8;
                return this.baseWallet.getTransactionHash(execTransactionBody.to, execTransactionBody.value, execTransactionBody.data, execTransactionBody.operation, execTransactionBody.safeTxGas, execTransactionBody.baseGas, execTransactionBody.gasPrice, execTransactionBody.gasToken, execTransactionBody.refundReceiver, execTransactionBody.nonce);

              case 8:
                transactionHash = _context4.sent;
                _context4.next = 11;
                return this.provider.getSigner().signMessage(ethers.utils.arrayify(transactionHash));

              case 11:
                signature = _context4.sent;
                _getSignatureParamete = getSignatureParameters(signature), r = _getSignatureParamete.r, s = _getSignatureParamete.s, v = _getSignatureParamete.v;
                v += 4;
                v = ethers.BigNumber.from(v).toHexString();
                signature = r + s.slice(2) + v.slice(2);
                _context4.next = 21;
                break;

              case 18:
                _context4.next = 20;
                return this.provider.getSigner()._signTypedData({
                  verifyingContract: walletAddress,
                  chainId: this.networkId
                }, config.EIP712_SAFE_TX_TYPE, execTransactionBody);

              case 20:
                signature = _context4.sent;

              case 21:
                this.baseWallet = this.baseWallet.attach(walletAddress);
                this.baseWallet = this.baseWallet.connect(this.engine.getSignerByAddress(walletAddress));
                _context4.next = 25;
                return this.baseWallet.populateTransaction.execTransaction(execTransactionBody.to, execTransactionBody.value, execTransactionBody.data, execTransactionBody.operation, execTransactionBody.safeTxGas, execTransactionBody.baseGas, execTransactionBody.gasPrice, execTransactionBody.gasToken, execTransactionBody.refundReceiver, signature);

              case 25:
                executionData = _context4.sent;
                dispatchProvider = this.engine.getEthersProvider(); //TODO
                //Check if webhook attributes are passed before forwarding ?

                txParams = {
                  data: executionData.data,
                  to: this.baseWallet.address,
                  from: walletAddress,
                  webHookAttributes: webHookAttributes
                };
                _context4.prev = 28;
                _context4.next = 31;
                return dispatchProvider.send("eth_sendTransaction", [txParams]);

              case 31:
                tx = _context4.sent;
                _context4.next = 38;
                break;

              case 34:
                _context4.prev = 34;
                _context4.t0 = _context4["catch"](28);
                // handle conditional rejections in this stack trace
                console.log(_context4.t0);
                throw _context4.t0;

              case 38:
                return _context4.abrupt("return", tx);

              case 39:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this, [[28, 34]]);
      }));

      function sendBiconomyWalletTransaction(_x4) {
        return _sendBiconomyWalletTransaction.apply(this, arguments);
      }

      return sendBiconomyWalletTransaction;
    }()
  }]);
  return BiconomyWalletClient;
}();

module.exports = BiconomyWalletClient;