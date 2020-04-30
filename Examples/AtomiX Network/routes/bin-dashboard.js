var express = require('express');
var router = express.Router();

require('dotenv').config();

router.get('/', function(req, res, next) {
  res.render('bin-dashboard', {
    title: 'Binance Dashboard'
  });
});

module.exports = router;
