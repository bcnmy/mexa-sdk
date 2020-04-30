var express = require('express');
var router = express.Router();
var namehash = require('eth-ens-namehash').hash;

require('dotenv').config();
var erc20Name = process.env.ERC20NAME;
var bep2Name = process.env.BEP2NAME;

console.log(namehash)

router.get('/', function(req, res, next) {
  res.json({
    node: namehash(req.query.address)
  });
});

module.exports = router;
