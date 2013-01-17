var config = require('./config.js');

if(config.get('udp')) {
  var dgram  = require('dgram')
      , os = require('os')
      , server = dgram.createSocket('udp4')
      , syslog = require('./syslog.js');

  var terminator = '\n';
  var buffer = '';

  server.on('message', function(data) {
    buffer += data;
    if (buffer.indexOf(terminator) >= 0) {
      var msgs = buffer.split(terminator);
      for (var i = 0; i < msgs.length - 1; ++i) {
        var msg = msgs[i];
        if (msg != '\n') syslog.save(msg);
      }
      buffer = msgs[msgs.length - 1];
    }
  });
  
  server.on('listening', function() {
    var address = server.address();
    var msg = "UDP Server started on " + os.hostname() + " (" + address.address + ":" + address.port + ")"
    console.log(msg);
    syslog.send_message(msg);
  });
  
  server.bind(config.get('udp_port'));
}
