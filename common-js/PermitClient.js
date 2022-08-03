"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _require = require("./abis"),
    daiAbi = _require.daiAbi,
    erc20Eip2612Abi = _require.erc20Eip2612Abi;

var _require2 = require("ethers"),
    ethers = _require2.ethers;

var _require3 = require("./config"),
    config = _require3.config;

var daiDomainData = {
  name: config.daiDomainName,
  version: config.daiVersion
};
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

function isEthersProvider(provider) {
  return ethers.providers.Provider.isProvider(provider);
}
/**
 * Class to provide methods to give token transfer permissions to Biconomy's ERC20Forwarder smart contract
 * ERC20Forwarder contract is responsible to calculate gas cost in ERC20 tokens and making a transfer on user's behalf
 * For DAI token there is a special permit method provided
 * For Tokens that support EIP2612 standard (like USDC) users should use eip2612Permit
 * Check https://docs.biconomy.io to see examples of how to use permit client to give one time token approvals
 */


var PermitClient = /*#__PURE__*/function () {
  function PermitClient(provider, erc20ForwarderAddress, daiTokenAddress) {
    (0, _classCallCheck2["default"])(this, PermitClient);

    if (isEthersProvider(provider)) {
      this.provider = provider;
    } else {
      this.provider = new ethers.providers.Web3Provider(provider);
    }

    this.erc20ForwarderAddress = erc20ForwarderAddress;
    this.daiTokenAddress = daiTokenAddress;
    this.daiDomainData = daiDomainData;
  }
  /**
   * method to provide permission to spend dai tokens to a desired spender
   * @param {object} daiPermitOptions - dai permit options contains i) spender ii) expiry iii) user address iv) allowed
   * All of the above options are optional
   * If spender is not provided by default approval will be given to ERC20 Forwarder contract on the same network as your provider
   * When your provider does not have a signer you must pass user address
   */


  (0, _createClass2["default"])(PermitClient, [{
    key: "daiPermit",
    value: function () {
      var _daiPermit = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(daiPermitOptions) {
        var spender, expiry, allowed, userAddress, network, dai, nonce, permitDataToSign, result, signature, r, s, v, tx;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                spender = daiPermitOptions.spender || this.erc20ForwarderAddress;
                expiry = daiPermitOptions.expiry || Math.floor(Date.now() / 1000 + 3600);
                allowed = daiPermitOptions.allowed || true;
                _context.t0 = daiPermitOptions.userAddress;

                if (_context.t0) {
                  _context.next = 9;
                  break;
                }

                _context.next = 8;
                return this.provider.getSigner().getAddress();

              case 8:
                _context.t0 = _context.sent;

              case 9:
                userAddress = _context.t0;
                _context.next = 12;
                return this.provider.getNetwork();

              case 12:
                network = _context.sent;
                daiDomainData.chainId = network.chainId;
                daiDomainData.verifyingContract = this.daiTokenAddress;
                dai = new ethers.Contract(this.daiDomainData.verifyingContract, daiAbi, this.provider.getSigner());
                _context.next = 18;
                return dai.nonces(userAddress);

              case 18:
                nonce = _context.sent;
                permitDataToSign = {
                  types: {
                    EIP712Domain: config.domainType,
                    Permit: config.daiPermitType
                  },
                  domain: this.daiDomainData,
                  primaryType: "Permit",
                  message: {
                    holder: userAddress,
                    spender: spender,
                    nonce: parseInt(nonce),
                    expiry: parseInt(expiry),
                    allowed: true
                  }
                };
                _context.next = 22;
                return this.provider.send("eth_signTypedData_v4", [userAddress, JSON.stringify(permitDataToSign)]);

              case 22:
                result = _context.sent;

                _logMessage("success", result);

                signature = result.substring(2);
                r = "0x" + signature.substring(0, 64);
                s = "0x" + signature.substring(64, 128);
                v = parseInt(signature.substring(128, 130), 16);
                _context.next = 30;
                return dai.permit(userAddress, spender, parseInt(nonce), parseInt(expiry.toString()), allowed, v, r, s);

              case 30:
                tx = _context.sent;
                return _context.abrupt("return", tx);

              case 34:
                _context.prev = 34;
                _context.t1 = _context["catch"](0);

                _logMessage(_context.t1);

                throw _context.t1;

              case 38:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 34]]);
      }));

      function daiPermit(_x) {
        return _daiPermit.apply(this, arguments);
      }

      return daiPermit;
    }()
    /**
     * method to provide permission to spend tokens that support EIP2612 Permit
     * @param {object} permitOptions - permit options contain domainData, spender, value, deadline, userAddress
     * domainData and value are manadatory options (check https://biconomy.docs.io to see a working example of this)
     * If spender is not provided by default approval will be given to ERC20 Forwarder contract on the same network as your provider
     * When your provider does not have a signer you must pass user address
     */

  }, {
    key: "eip2612Permit",
    value: function () {
      var _eip2612Permit = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(permitOptions) {
        var tokenDomainData, tokenDomainType, spender, value, deadline, userAddress, token, nonce, permitDataToSign, result, signature, r, s, v, tx;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.prev = 0;
                tokenDomainData = permitOptions.domainData;
                tokenDomainType = permitOptions.domainType || config.domainType;
                spender = permitOptions.spender || this.erc20ForwarderAddress;
                value = permitOptions.value;
                deadline = permitOptions.deadline || Math.floor(Date.now() / 1000 + 3600);
                _context2.t0 = permitOptions.userAddress;

                if (_context2.t0) {
                  _context2.next = 11;
                  break;
                }

                _context2.next = 10;
                return this.provider.getSigner().getAddress();

              case 10:
                _context2.t0 = _context2.sent;

              case 11:
                userAddress = _context2.t0;
                token = new ethers.Contract(tokenDomainData.verifyingContract, erc20Eip2612Abi, this.provider.getSigner());
                _context2.next = 15;
                return token.nonces(userAddress);

              case 15:
                nonce = _context2.sent;
                permitDataToSign = {
                  types: {
                    EIP712Domain: tokenDomainType,
                    Permit: config.eip2612PermitType
                  },
                  domain: tokenDomainData,
                  primaryType: "Permit",
                  message: {
                    owner: userAddress,
                    spender: spender,
                    nonce: parseInt(nonce),
                    value: value,
                    deadline: parseInt(deadline)
                  }
                };
                _context2.next = 19;
                return this.provider.send("eth_signTypedData_v4", [userAddress, JSON.stringify(permitDataToSign)]);

              case 19:
                result = _context2.sent;

                _logMessage("success", result);

                signature = result.substring(2);
                r = "0x" + signature.substring(0, 64);
                s = "0x" + signature.substring(64, 128);
                v = parseInt(signature.substring(128, 130), 16);
                _context2.next = 27;
                return token.permit(userAddress, spender, value, parseInt(deadline.toString()), v, r, s);

              case 27:
                tx = _context2.sent;
                return _context2.abrupt("return", tx);

              case 31:
                _context2.prev = 31;
                _context2.t1 = _context2["catch"](0);

                _logMessage(_context2.t1);

                throw _context2.t1;

              case 35:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this, [[0, 31]]);
      }));

      function eip2612Permit(_x2) {
        return _eip2612Permit.apply(this, arguments);
      }

      return eip2612Permit;
    }()
  }]);
  return PermitClient;
}();

module.exports = PermitClient;