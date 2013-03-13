var db = require('./db.js')
    , logo = require('./services/log-o.js')
    , config = require('./config.js')
    , http = require('http');

//This ensures the DB is up before anything else has started...
var intervalId = setInterval(function ready() {
  if (db.isAvailable()) {
    console.log('Ready');
    clearInterval(intervalId);
    start();
  } else {
    console.log('Waiting for DB.');
  }
}, 100);

function start() {
  var server = http.createServer();
  server.listen(config.get('http_port'));
  server.on('listening', logo.listening);
  server.on('request', logo.requestListener);
  server.on('close', logo.close);
}
