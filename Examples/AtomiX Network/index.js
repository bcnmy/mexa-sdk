var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var compression = require('compression');
var fs = require('fs');

require('dotenv').config();

var indexRouter = require('./routes/index');
var eth_x_router = require('./routes/eth-x');
var bin_x_router = require('./routes/bin-x');
var eos_x_router = require('./routes/eos-x');
var eos_dashboard_router = require('./routes/eos-dashboard');
var bin_dashboard_router = require('./routes/bin-dashboard');
var faucet_router = require('./routes/faucet');
var ens_router = require('./routes/enslookup');

var app = express();
app.set('port', process.env.PORT || 8000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(helmet());
app.use(compression());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/eth-x', eth_x_router);
app.use('/bin-x', bin_x_router);
app.use('/eos-x', eos_x_router);
app.use('/eos-dashboard', eos_dashboard_router);
app.use('/binanace-dashboard', bin_dashboard_router);
app.use('/faucet', faucet_router);
app.use('/enslookup', ens_router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// var ca = fs.readFileSync('/etc/letsencrypt/live/sub.domain.com/fullchain.pem');
// var cert = fs.readFileSync( '/etc/letsencrypt/live/sub.domain.com/fullchain.pem' );
// var key = fs.readFileSync( '/etc/letsencrypt/live/sub.domain.com/privkey.pem' );

// var options = {
//   key: key,
//   cert: cert,
//   ca: ca
// };

// // var https = require('https');
// // https.createServer(options, app).listen(443);
// const spdy = require('spdy');
// spdy.createServer(options, app).listen(443);


// app.use(function(req, res, next) {
//   if (req.secure) {
//       next();
//   } else {
//       res.redirect('https://' + req.headers.host + req.url);
//   }
// });

var server = app.listen(app.get('port'), function() {
  console.log('Site is Live 🚀 on port ' + server.address().port);
});

module.exports = app;
