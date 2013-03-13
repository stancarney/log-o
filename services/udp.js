var dgram = require('dgram')
    , os = require('os')
    , config = require('../config.js')
    , services = require('./');

module.exports.start = function () {
  var server = dgram.createSocket('udp4');

  server.on('message', function (data) {
    services.syslog.save(data.toString());
  });

  server.on('listening', function () {
    var address = server.address();
    var msg = 'UDP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
    services.syslog.sendMessage(msg);
  });

  server.bind(config.get('udp_port'));
};
