"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _require = require("ethers"),
    ethers = _require.ethers;

var _require2 = require("./config"),
    config = _require2.config;

var ZERO_ADDRESS = config.ZERO_ADDRESS;

var buildForwardTxRequest = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(account, to, gasLimitNum, data, biconomyForwarder) {
    var newBatch,
        batchId,
        batchNonce,
        req,
        _args = arguments;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            newBatch = _args.length > 5 && _args[5] !== undefined ? _args[5] : false;

            if (!newBatch) {
              _context.next = 7;
              break;
            }

            _context.next = 4;
            return biconomyForwarder.getBatch(userAddress);

          case 4:
            _context.t0 = _context.sent;
            _context.next = 8;
            break;

          case 7:
            _context.t0 = 0;

          case 8:
            batchId = _context.t0;
            _context.next = 11;
            return biconomyForwarder.getNonce(account, batchId);

          case 11:
            batchNonce = _context.sent;
            req = {
              from: account,
              to: to,
              token: ZERO_ADDRESS,
              txGas: gasLimitNum,
              tokenGasPrice: "0",
              batchId: batchId,
              batchNonce: parseInt(batchNonce),
              deadline: Math.floor(Date.now() / 1000 + 3600),
              data: data
            };
            return _context.abrupt("return", {
              request: req
            });

          case 14:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function buildForwardTxRequest(_x, _x2, _x3, _x4, _x5) {
    return _ref.apply(this, arguments);
  };
}();

var getDomainSeperator = function getDomainSeperator(biconomyForwarderDomainData) {
  var domainSeparator = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "bytes32", "uint256", "address"], [ethers.utils.id("EIP712Domain(string name,string version,uint256 salt,address verifyingContract)"), ethers.utils.id(biconomyForwarderDomainData.name), ethers.utils.id(biconomyForwarderDomainData.version), biconomyForwarderDomainData.salt, biconomyForwarderDomainData.verifyingContract]));
  return domainSeparator;
};

module.exports = {
  buildForwardTxRequest: buildForwardTxRequest,
  getDomainSeperator: getDomainSeperator
};