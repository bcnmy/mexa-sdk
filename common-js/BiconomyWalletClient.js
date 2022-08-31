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
  }

  (0, _createClass2["default"])(BiconomyWalletClient, [{
    key: "deployWallet",
    value: function () {
      var _deployWallet = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(_ref2) {
        var eoa, _ref2$index, index, walletAddress, executionData, dispatchProvider, txParams, tx;

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
                return this.walletFactory.populateTransaction.deployCounterFactualWallet(eoa, this.entryPointAddress, this.handlerAddress, index);

              case 6:
                executionData = _context.sent;
                dispatchProvider = this.engine.getEthersProvider();
                txParams = {
                  data: executionData.data,
                  to: this.walletFactory.address,
                  from: eoa
                };
                _context.prev = 9;
                _context.next = 12;
                return dispatchProvider.send("eth_sendTransaction", [txParams]);

              case 12:
                tx = _context.sent;
                _context.next = 19;
                break;

              case 15:
                _context.prev = 15;
                _context.t0 = _context["catch"](9);
                // handle conditional rejections in this stack trace
                console.log(_context.t0);
                throw _context.t0;

              case 19:
                return _context.abrupt("return", walletAddress);

              case 20:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[9, 15]]);
      }));

      function deployWallet(_x) {
        return _deployWallet.apply(this, arguments);
      }

      return deployWallet;
    }()
  }, {
    key: "checkIfWalletExists",
    value: function () {
      var _checkIfWalletExists = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(_ref3) {
        var eoa, _ref3$index, index, walletFactoryAddress, walletFactory, _walletAddress, _doesWalletExist, walletAddress, doesWalletExist;

        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                eoa = _ref3.eoa, _ref3$index = _ref3.index, index = _ref3$index === void 0 ? 0 : _ref3$index, walletFactoryAddress = _ref3.walletFactoryAddress;

                if (!walletFactoryAddress) {
                  _context2.next = 10;
                  break;
                }

                walletFactory = new ethers.Contract(walletFactoryAddress, walletFactoryAbi, this.providerOrSigner);
                _context2.next = 5;
                return walletFactory.getAddressForCounterfactualWallet(eoa, index);

              case 5:
                _walletAddress = _context2.sent;
                _context2.next = 8;
                return this.walletFactory.isWalletExist(_walletAddress);

              case 8:
                _doesWalletExist = _context2.sent;
                return _context2.abrupt("return", {
                  doesWalletExist: _doesWalletExist,
                  walletAddress: _walletAddress
                });

              case 10:
                _context2.next = 12;
                return this.walletFactory.getAddressForCounterfactualWallet(eoa, index);

              case 12:
                walletAddress = _context2.sent;
                _context2.next = 15;
                return this.walletFactory.isWalletExist(walletAddress);

              case 15:
                doesWalletExist = _context2.sent;
                return _context2.abrupt("return", {
                  doesWalletExist: doesWalletExist,
                  walletAddress: walletAddress
                });

              case 17:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function checkIfWalletExists(_x2) {
        return _checkIfWalletExists.apply(this, arguments);
      }

      return checkIfWalletExists;
    }()
  }, {
    key: "checkIfWalletExistsAndDeploy",
    value: function () {
      var _checkIfWalletExistsAndDeploy = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(_ref4) {
        var eoa, webHookAttributes, _ref4$index, index, txHash, walletAddress, doesWalletExist, executionData, dispatchProvider, txParams;

        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                eoa = _ref4.eoa, webHookAttributes = _ref4.webHookAttributes, _ref4$index = _ref4.index, index = _ref4$index === void 0 ? 0 : _ref4$index;
                _context3.next = 3;
                return this.walletFactory.getAddressForCounterfactualWallet(eoa, index);

              case 3:
                walletAddress = _context3.sent;
                _context3.next = 6;
                return this.walletFactory.isWalletExist[walletAddress];

              case 6:
                doesWalletExist = _context3.sent;
                this.walletFactory = this.walletFactory.connect(this.engine.getSignerByAddress(eoa));

                if (doesWalletExist) {
                  _context3.next = 25;
                  break;
                }

                _context3.next = 11;
                return this.walletFactory.populateTransaction.deployCounterFactualWallet(eoa, this.entryPointAddress, this.handlerAddress, index);

              case 11:
                executionData = _context3.sent;
                dispatchProvider = this.engine.getEthersProvider();

                if (webHookAttributes && webHookAttributes.webHookData) {
                  webHookAttributes.webHookData.webwallet_address = eoa;
                }

                txParams = {
                  data: executionData.data,
                  to: this.walletFactory.address,
                  from: eoa,
                  webHookAttributes: webHookAttributes || null
                };
                _context3.prev = 15;
                _context3.next = 18;
                return dispatchProvider.send("eth_sendTransaction", [txParams]);

              case 18:
                txHash = _context3.sent;
                _context3.next = 25;
                break;

              case 21:
                _context3.prev = 21;
                _context3.t0 = _context3["catch"](15);
                // handle conditional rejections in this stack trace
                console.log(_context3.t0);
                throw _context3.t0;

              case 25:
                return _context3.abrupt("return", {
                  walletAddress: walletAddress,
                  txHash: txHash
                });

              case 26:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this, [[15, 21]]);
      }));

      function checkIfWalletExistsAndDeploy(_x3) {
        return _checkIfWalletExistsAndDeploy.apply(this, arguments);
      }

      return checkIfWalletExistsAndDeploy;
    }() // Gasless transaction
    // gasPrice and baseGas will always be zero
    // we would add separate ERC20 (Forward) payment handlers in sdk

  }, {
    key: "buildExecTransaction",
    value: function () {
      var _buildExecTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(_ref5) {
        var data, to, walletAddress, _ref5$batchId, batchId, nonce;

        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                data = _ref5.data, to = _ref5.to, walletAddress = _ref5.walletAddress, _ref5$batchId = _ref5.batchId, batchId = _ref5$batchId === void 0 ? 0 : _ref5$batchId;
                this.baseWallet = this.baseWallet.attach(walletAddress);
                _context4.next = 4;
                return this.baseWallet.getNonce(batchId);

              case 4:
                nonce = _context4.sent;
                return _context4.abrupt("return", {
                  to: to,
                  value: 0,
                  data: data,
                  operation: 0,
                  targetTxGas: 0,
                  baseGas: 0,
                  gasPrice: 0,
                  gasToken: config.ZERO_ADDRESS,
                  refundReceiver: config.ZERO_ADDRESS,
                  nonce: nonce
                });

              case 6:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function buildExecTransaction(_x4) {
        return _buildExecTransaction.apply(this, arguments);
      }

      return buildExecTransaction;
    }()
  }, {
    key: "sendBiconomyWalletTransaction",
    value: function () {
      var _sendBiconomyWalletTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(_ref6) {
        var execTransactionBody, _ref6$batchId, batchId, walletAddress, signatureType, _ref6$signature, signature, webHookAttributes, transaction, refundInfo, transactionHash, _getSignatureParamete, r, s, v, executionData, dispatchProvider, owner, txParams, txHash;

        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                execTransactionBody = _ref6.execTransactionBody, _ref6$batchId = _ref6.batchId, batchId = _ref6$batchId === void 0 ? 0 : _ref6$batchId, walletAddress = _ref6.walletAddress, signatureType = _ref6.signatureType, _ref6$signature = _ref6.signature, signature = _ref6$signature === void 0 ? null : _ref6$signature, webHookAttributes = _ref6.webHookAttributes;

                if (this.isSignerWithAccounts) {
                  _context5.next = 4;
                  break;
                }

                if (signature) {
                  _context5.next = 4;
                  break;
                }

                throw new Error("Either pass signature param or pass a provider to Biconomy with user accounts information");

              case 4:
                transaction = {
                  to: execTransactionBody.to,
                  value: execTransactionBody.value,
                  data: execTransactionBody.data,
                  operation: execTransactionBody.operation,
                  targetTxGas: execTransactionBody.targetTxGas
                };
                refundInfo = {
                  baseGas: execTransactionBody.baseGas,
                  gasPrice: execTransactionBody.gasPrice,
                  gasToken: execTransactionBody.gasToken,
                  refundReceiver: execTransactionBody.refundReceiver
                };

                if (signature) {
                  _context5.next = 23;
                  break;
                }

                if (!(signatureType === 'PERSONAL_SIGN')) {
                  _context5.next = 20;
                  break;
                }

                _context5.next = 10;
                return this.baseWallet.getTransactionHash(execTransactionBody.to, execTransactionBody.value, execTransactionBody.data, execTransactionBody.operation, execTransactionBody.targetTxGas, execTransactionBody.baseGas, execTransactionBody.gasPrice, execTransactionBody.gasToken, execTransactionBody.refundReceiver, execTransactionBody.nonce);

              case 10:
                transactionHash = _context5.sent;
                _context5.next = 13;
                return this.provider.getSigner().signMessage(ethers.utils.arrayify(transactionHash));

              case 13:
                signature = _context5.sent;
                _getSignatureParamete = getSignatureParameters(signature), r = _getSignatureParamete.r, s = _getSignatureParamete.s, v = _getSignatureParamete.v;
                v += 4;
                v = ethers.BigNumber.from(v).toHexString();
                signature = r + s.slice(2) + v.slice(2);
                _context5.next = 23;
                break;

              case 20:
                _context5.next = 22;
                return this.provider.getSigner()._signTypedData({
                  verifyingContract: walletAddress,
                  chainId: this.networkId
                }, config.EIP712_WALLET_TX_TYPE, execTransactionBody);

              case 22:
                signature = _context5.sent;

              case 23:
                this.baseWallet = this.baseWallet.attach(walletAddress);
                this.baseWallet = this.baseWallet.connect(this.engine.getSignerByAddress(walletAddress));
                _context5.next = 27;
                return this.baseWallet.populateTransaction.execTransaction(transaction, batchId, refundInfo, signature);

              case 27:
                executionData = _context5.sent;
                dispatchProvider = this.engine.getEthersProvider(); //append webwallet_address key in this object webHookAttributes

                _context5.next = 31;
                return this.baseWallet.owner();

              case 31:
                owner = _context5.sent;

                //eoa
                if (webHookAttributes && webHookAttributes.webHookData) {
                  webHookAttributes.webHookData.webwallet_address = owner;
                }

                txParams = {
                  data: executionData.data,
                  to: this.baseWallet.address,
                  from: owner,
                  webHookAttributes: webHookAttributes || null
                };
                _context5.prev = 34;
                _context5.next = 37;
                return dispatchProvider.send("eth_sendTransaction", [txParams]);

              case 37:
                txHash = _context5.sent;
                _context5.next = 44;
                break;

              case 40:
                _context5.prev = 40;
                _context5.t0 = _context5["catch"](34);
                // handle conditional rejections in this stack trace
                console.log(_context5.t0);
                throw _context5.t0;

              case 44:
                return _context5.abrupt("return", txHash);

              case 45:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this, [[34, 40]]);
      }));

      function sendBiconomyWalletTransaction(_x5) {
        return _sendBiconomyWalletTransaction.apply(this, arguments);
      }

      return sendBiconomyWalletTransaction;
    }()
  }]);
  return BiconomyWalletClient;
}();

module.exports = BiconomyWalletClient;