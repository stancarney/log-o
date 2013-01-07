var config = require('./config.js');

if(config.get('udp')) {
  var dgram  = require('dgram')
      , server = dgram.createSocket('udp4')
      , syslog = require('./syslog.js');

  server.on('message', function(rawMessage) {
    syslog.save(rawMessage);
  });
  
  server.on('listening', function() {
    var address = server.address();
    syslog.send_message("UDP Server started on " + address.address + ":" + address.port);
  });
  
  server.bind(config.get('udp_port'));
}
