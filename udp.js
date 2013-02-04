var config = require('./config.js');

if (config.get('udp')) {
  var dgram = require('dgram')
      , os = require('os')
      , server = dgram.createSocket('udp4')
      , syslog = require('./syslog.js');

  server.on('message', function (data) {
    syslog.save(data.toString());
  });

  server.on('listening', function () {
    var address = server.address();
    var msg = 'UDP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
    syslog.sendMessage(msg);
  });

  server.bind(config.get('udp_port'));
}
