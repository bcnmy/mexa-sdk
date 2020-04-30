var express = require('express');
var router = express.Router();

require('dotenv').config();
var erc20Name = process.env.ERC20NAME;
var bep2Name = process.env.BEP2NAME;

router.get('/', function(req, res, next) {
  res.render('faucet', {
    title: 'ANC Faucet',
    erc20Name : erc20Name,
    bep2Name : bep2Name
  });
});

module.exports = router;
