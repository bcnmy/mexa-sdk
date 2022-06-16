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
    var provider = _ref.provider,
        biconomyAttributes = _ref.biconomyAttributes,
        walletFactoryAddress = _ref.walletFactoryAddress,
        baseWalletAddress = _ref.baseWalletAddress,
        entryPointAddress = _ref.entryPointAddress,
        handlerAddress = _ref.handlerAddress,
        networkId = _ref.networkId;
    (0, _classCallCheck2["default"])(this, BiconomyWalletClient);
    this.biconomyAttributes = biconomyAttributes; // this.ethersProvider = ethersProvider;

    this.walletFactoryAddress = walletFactoryAddress;
    this.baseWalletAddress = baseWalletAddress;
    this.entryPointAddress = entryPointAddress;
    this.handlerAddress = handlerAddress;

    if (isEthersProvider(provider)) {
      this.provider = provider;
    } else {
      this.provider = new ethers.providers.Web3Provider(provider);
    } // TODO
    // handle signers carefully 
    // depends on provider passed to biconomy has accounts information or not


    this.signer = this.provider.getSigner();
    this.networkId = networkId; // has to be signer connected

    this.walletFactory = new ethers.Contract(this.walletFactoryAddress, walletFactoryAbi, this.provider.getSigner()); // has to be signer connected

    this.baseWallet = new ethers.Contract(this.baseWalletAddress, baseWalletAbi, this.provider.getSigner());
    this.entryPoint = new ethers.Contract(this.entryPointAddress, entryPointAbi, this.provider.getSigner());
  }

  (0, _createClass2["default"])(BiconomyWalletClient, [{
    key: "checkIfWalletExists",
    value: function () {
      var _checkIfWalletExists = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(walletOwner, index) {
        var walletAddress, doesWalletExist;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.walletFactory.getAddressForCounterfactualWallet(walletOwner, index);

              case 2:
                walletAddress = _context.sent;
                _context.next = 5;
                return this.walletFactory.isWalletExist(walletAddress);

              case 5:
                doesWalletExist = _context.sent;

                if (!doesWalletExist) {
                  _context.next = 8;
                  break;
                }

                return _context.abrupt("return", {
                  doesWalletExist: doesWalletExist,
                  walletAddress: walletAddress
                });

              case 8:
                return _context.abrupt("return", {
                  doesWalletExist: doesWalletExist,
                  walletAddress: null
                });

              case 9:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function checkIfWalletExists(_x, _x2) {
        return _checkIfWalletExists.apply(this, arguments);
      }

      return checkIfWalletExists;
    }()
  }, {
    key: "checkIfWalletExistsAndDeploy",
    value: function () {
      var _checkIfWalletExistsAndDeploy = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(walletOwner, index) {
        var walletAddress, doesWalletExist;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.walletFactory.getAddressForCounterfactualWallet(walletOwner, index);

              case 2:
                walletAddress = _context2.sent;
                _context2.next = 5;
                return this.walletFactory.isWalletExist[walletAddress];

              case 5:
                doesWalletExist = _context2.sent;

                if (doesWalletExist) {
                  _context2.next = 9;
                  break;
                }

                _context2.next = 9;
                return this.walletFactory.deployCounterFactualWallet(walletOwner, this.entryPointAddress, this.handlerAddress, index);

              case 9:
                return _context2.abrupt("return", walletAddress);

              case 10:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function checkIfWalletExistsAndDeploy(_x3, _x4) {
        return _checkIfWalletExistsAndDeploy.apply(this, arguments);
      }

      return checkIfWalletExistsAndDeploy;
    }() // Gasless transaction
    // gasPrice and baseGas will always be zero
    // we would add separate ERC20 (Forward) payment handlers in sdk

  }, {
    key: "buildExecTransaction",
    value: function () {
      var _buildExecTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(data, to, walletAddress, batchId) {
        var nonce;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                this.baseWallet = this.baseWallet.attach(walletAddress);
                _context3.next = 3;
                return this.baseWallet.getNonce(batchId);

              case 3:
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

              case 5:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function buildExecTransaction(_x5, _x6, _x7, _x8) {
        return _buildExecTransaction.apply(this, arguments);
      }

      return buildExecTransaction;
    }() // ToDo : only take walletaddress fetched from login flow
    // TODO : keep a method to send with signature seperately
    // or have signature as optional param and take a single param as object

  }, {
    key: "sendBiconomyWalletTransaction",
    value: function () {
      var _sendBiconomyWalletTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(execTransactionBody, walletOwner, walletAddress, signatureType) {
        var signature, transactionHash, _getSignatureParamete, r, s, v, tx;

        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!(signatureType === 'PERSONAL_SIGN')) {
                  _context4.next = 13;
                  break;
                }

                _context4.next = 3;
                return this.baseWallet.getTransactionHash(execTransactionBody.to, execTransactionBody.value, execTransactionBody.data, execTransactionBody.operation, execTransactionBody.safeTxGas, execTransactionBody.baseGas, execTransactionBody.gasPrice, execTransactionBody.gasToken, execTransactionBody.refundReceiver, execTransactionBody.nonce);

              case 3:
                transactionHash = _context4.sent;
                _context4.next = 6;
                return this.signer.signMessage(ethers.utils.arrayify(transactionHash));

              case 6:
                signature = _context4.sent;
                _getSignatureParamete = getSignatureParameters(signature), r = _getSignatureParamete.r, s = _getSignatureParamete.s, v = _getSignatureParamete.v;
                v += 4;
                v = ethers.BigNumber.from(v).toHexString();
                signature = r + s.slice(2) + v.slice(2);
                _context4.next = 16;
                break;

              case 13:
                _context4.next = 15;
                return this.signer._signTypedData({
                  verifyingContract: walletAddress,
                  chainId: this.networkId
                }, config.EIP712_SAFE_TX_TYPE, execTransactionBody);

              case 15:
                signature = _context4.sent;

              case 16:
                this.baseWallet = this.baseWallet.attach(walletAddress);
                _context4.next = 19;
                return this.baseWallet.execTransaction(execTransactionBody.to, execTransactionBody.value, execTransactionBody.data, execTransactionBody.operation, execTransactionBody.safeTxGas, execTransactionBody.baseGas, execTransactionBody.gasPrice, execTransactionBody.gasToken, execTransactionBody.refundReceiver, signature);

              case 19:
                tx = _context4.sent;
                return _context4.abrupt("return", tx);

              case 21:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function sendBiconomyWalletTransaction(_x9, _x10, _x11, _x12) {
        return _sendBiconomyWalletTransaction.apply(this, arguments);
      }

      return sendBiconomyWalletTransaction;
    }()
  }]);
  return BiconomyWalletClient;
}();

module.exports = BiconomyWalletClient;