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

var EIP712_SAFE_TX_TYPE = {
  // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
  SafeTx: [{
    type: "address",
    name: "to"
  }, {
    type: "uint256",
    name: "value"
  }, {
    type: "bytes",
    name: "data"
  }, {
    type: "uint8",
    name: "operation"
  }, {
    type: "uint256",
    name: "safeTxGas"
  }, {
    type: "uint256",
    name: "baseGas"
  }, {
    type: "uint256",
    name: "gasPrice"
  }, {
    type: "address",
    name: "gasToken"
  }, {
    type: "address",
    name: "refundReceiver"
  }, {
    type: "uint256",
    name: "nonce"
  }]
};
/**
 * Class to provide methods for biconomy wallet deployment, signature building and sending the transaction
 */

var BiconomyWalletClient = /*#__PURE__*/function () {
  function BiconomyWalletClient(_ref) {
    var ethersProvider = _ref.ethersProvider,
        biconomyAttributes = _ref.biconomyAttributes,
        walletFactoryAddress = _ref.walletFactoryAddress,
        baseWalletAddress = _ref.baseWalletAddress,
        entryPointAddress = _ref.entryPointAddress,
        networkId = _ref.networkId;
    (0, _classCallCheck2["default"])(this, BiconomyWalletClient);
    this.biconomyAttributes = biconomyAttributes;
    this.ethersProvider = ethersProvider;
    this.walletFactoryAddress = walletFactoryAddress;
    this.baseWalletAddress = baseWalletAddress;
    this.entryPointAddress = entryPointAddress;
    this.signer = this.ethersProvider.getSigner();
    this.networkId = networkId;
    this.walletFactory = new ethers.Contract(this.walletFactoryAddress, walletFactoryAbi, ethersProvider);
    this.baseWallet = new ethers.Contract(this.baseWalletAddress, baseWalletAbi, ethersProvider);
    this.entryPoint = new ethers.Contract(this.entryPointAddress, entryPointAbi, ethersProvider);
  }

  (0, _createClass2["default"])(BiconomyWalletClient, [{
    key: "checkIfWalletExists",
    value: function () {
      var _checkIfWalletExists = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(walletOwner) {
        var doesWalletExist, walletAddress;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.walletFactory.isWalletExist[walletOwner];

              case 2:
                doesWalletExist = _context.sent;

                if (!doesWalletExist) {
                  _context.next = 8;
                  break;
                }

                _context.next = 6;
                return this.walletFactory.getAddressForCounterfactualWallet(walletOwner);

              case 6:
                walletAddress = _context.sent;
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

      function checkIfWalletExists(_x) {
        return _checkIfWalletExists.apply(this, arguments);
      }

      return checkIfWalletExists;
    }()
  }, {
    key: "checkIfWalletExistsAndDeploy",
    value: function () {
      var _checkIfWalletExistsAndDeploy = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(walletOwner) {
        var isWalletDeployed;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.walletFactory.isWalletExist[walletOwner];

              case 2:
                isWalletDeployed = _context2.sent;

                if (isWalletDeployed) {
                  _context2.next = 7;
                  break;
                }

                _context2.next = 6;
                return this._deployWallet(walletOwner);

              case 6:
                return _context2.abrupt("return", _context2.sent);

              case 7:
                _context2.next = 9;
                return this.walletFactory.getAddressForCounterfactualWallet(walletOwner);

              case 9:
                return _context2.abrupt("return", _context2.sent);

              case 10:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function checkIfWalletExistsAndDeploy(_x2) {
        return _checkIfWalletExistsAndDeploy.apply(this, arguments);
      }

      return checkIfWalletExistsAndDeploy;
    }()
  }, {
    key: "_deployWallet",
    value: function () {
      var _deployWallet2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(walletOwner) {
        var deployWalletMetaTxApiId, deployWalletRequest, metaTxDeployWalletBody, txResponse;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this._getDeployWalletMetaTxApiId();

              case 2:
                deployWalletMetaTxApiId = _context3.sent;
                _context3.next = 5;
                return this._buildDeployWalletRequest(walletOwner);

              case 5:
                deployWalletRequest = _context3.sent;
                metaTxDeployWalletBody = {
                  from: walletOwner,
                  apiId: deployWalletMetaTxApiId,
                  params: [deployWalletRequest, signature],
                  to: walletFactoryAddress,
                  signatureType: this.biconomyAttributes.signType.PERSONAL_SIGN
                };
                _context3.next = 9;
                return fetch("".concat(config.baseURL, "/api/v2/meta-tx/native"), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.biconomyAttributes.apiKey
                  },
                  body: JSON.stringify(metaTxDeployWalletBody)
                });

              case 9:
                txResponse = _context3.sent;
                _context3.next = 12;
                return txResponse.json();

              case 12:
                return _context3.abrupt("return", _context3.sent);

              case 13:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function _deployWallet(_x3) {
        return _deployWallet2.apply(this, arguments);
      }

      return _deployWallet;
    }()
  }, {
    key: "_buildDeployWalletRequest",
    value: function () {
      var _buildDeployWalletRequest2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(walletOwner) {
        var _yield$this$walletFac, data, to, from, txGas;

        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.walletFactory.populateTransaction.deployCounterFactualWallet(walletOwner, this.entryPointAddress);

              case 2:
                _yield$this$walletFac = _context4.sent;
                data = _yield$this$walletFac.data;
                to = this.walletFactoryAddress;
                from = walletOwner;
                txGas = Number(2100000);
                return _context4.abrupt("return", {
                  to: to,
                  from: from,
                  txGas: txGas,
                  data: data
                });

              case 8:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function _buildDeployWalletRequest(_x4) {
        return _buildDeployWalletRequest2.apply(this, arguments);
      }

      return _buildDeployWalletRequest;
    }()
  }, {
    key: "_getDeployWalletMetaTxApiId",
    value: function () {
      var _getDeployWalletMetaTxApiId2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5() {
        var method;
        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                method = 'deployCounterFactualWallet';
                return _context5.abrupt("return", this.biconomyAttributes.dappAPIMap[this.walletFactory.toLowerCase()][method.name.toString()]);

              case 2:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function _getDeployWalletMetaTxApiId() {
        return _getDeployWalletMetaTxApiId2.apply(this, arguments);
      }

      return _getDeployWalletMetaTxApiId;
    }() // build transaction
    // sign transaction
    // send transaction to backend

  }, {
    key: "sendBiconomyWalletTransaction",
    value: function () {
      var _sendBiconomyWalletTransaction = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(data, signature, walletOwner, walletAddress) {
        var req, execTransactionMetaTxApiId, metaTxBody, txResponse;
        return _regenerator["default"].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                // const biconomyWalletMetaTransactionBody = {
                //     to: '0xB32992b4110257a451Af3c2ED6AC78776DD8C26b',
                //     value: 0,
                //     data: data || "0x",
                //     operation: 0,
                //     safeTxGas: 2100000, // review
                //     baseGas: 66909, // review
                //     gasPrice: 0,
                //     gasToken: config.ZERO_ADDRESS,
                //     refundReceiver: config.ZERO_ADDRESS,
                //     nonce: 0,
                //   };
                // const { signature } = await this.safeSignTypedData(
                //     walletAddress,
                //     biconomyWalletMetaTransactionBody
                // );
                req = {
                  to: '0xB32992b4110257a451Af3c2ED6AC78776DD8C26b',
                  value: 0,
                  data: data,
                  operation: 0,
                  safeTxGas: 0,
                  // review
                  baseGas: 66909,
                  // review
                  gasPrice: 0,
                  gasToken: config.ZERO_ADDRESS,
                  refundReceiver: config.ZERO_ADDRESS,
                  signatures: signature
                };
                execTransactionMetaTxApiId = '6fdc23f8-4d25-40f8-b750-7ae2fd1234ac';
                metaTxBody = {
                  from: walletOwner,
                  apiId: execTransactionMetaTxApiId,
                  params: [req.to, req.value, req.data, req.operation, req.safeTxGas, req.baseGas, req.gasPrice, req.gasToken, req.refundReceiver, req.signatures],
                  to: walletAddress
                }; // .execTransaction(
                //     safeTx.to,
                //     safeTx.value,
                //     safeTx.data,
                //     safeTx.operation,
                //     safeTx.safeTxGas,
                //     safeTx.baseGas,
                //     safeTx.gasPrice,
                //     safeTx.gasToken,
                //     safeTx.refundReceiver,
                //     signature
                //   )

                _context6.next = 5;
                return fetch("".concat(config.baseURL, "/api/v2/meta-tx/native"), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.biconomyAttributes.apiKey
                  },
                  body: JSON.stringify(metaTxBody)
                });

              case 5:
                txResponse = _context6.sent;
                _context6.next = 8;
                return txResponse.json();

              case 8:
                return _context6.abrupt("return", _context6.sent);

              case 9:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function sendBiconomyWalletTransaction(_x5, _x6, _x7, _x8) {
        return _sendBiconomyWalletTransaction.apply(this, arguments);
      }

      return sendBiconomyWalletTransaction;
    }()
  }, {
    key: "_getExecTransactionMetaTxApiId",
    value: function () {
      var _getExecTransactionMetaTxApiId2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7() {
        var method;
        return _regenerator["default"].wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                method = 'execTransaction';
                return _context7.abrupt("return", this.biconomyAttributes.dappAPIMap[this.walletFactoryAddress.toLowerCase()][method.toString()]);

              case 2:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function _getExecTransactionMetaTxApiId() {
        return _getExecTransactionMetaTxApiId2.apply(this, arguments);
      }

      return _getExecTransactionMetaTxApiId;
    }()
  }, {
    key: "safeSignTypedData",
    value: function () {
      var _safeSignTypedData = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(walletAddress, biconomyWalletMetaTransactionBody) {
        var signer;
        return _regenerator["default"].wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                signer = this.signer;
                console.log("signer", this.signer);
                _context8.next = 4;
                return signer._signTypedData({
                  verifyingContract: walletAddress,
                  chainId: this.networkId
                }, EIP712_SAFE_TX_TYPE, biconomyWalletMetaTransactionBody);

              case 4:
                _context8.t0 = _context8.sent;
                return _context8.abrupt("return", {
                  data: _context8.t0
                });

              case 6:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function safeSignTypedData(_x9, _x10) {
        return _safeSignTypedData.apply(this, arguments);
      }

      return safeSignTypedData;
    }()
  }]);
  return BiconomyWalletClient;
}();

module.exports = BiconomyWalletClient;