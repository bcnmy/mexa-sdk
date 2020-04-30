var express = require('express');
var router = express.Router();

require('dotenv').config();

router.get('/', function(req, res, next) {
  res.render('eos-dashboard', {
    title: 'EOS Dashboard'
  });
});

module.exports = router;
