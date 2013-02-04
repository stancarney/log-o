var config = require('./config.js');

if(config.get('tcp')) {
  var net = require('net')
      , os = require('os')
      , server = net.createServer(config.get('tcp_port'))
      , syslog = require('./syslog.js');

  var terminator = '\n';

  server.on('connection', function(sock) {
    var buffer = '';

    sock.on('data', function(data) {
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

    // not sure if this is required.
    sock.on('end', function() {
      var msgs = buffer.split(terminator);
      for (var i = 0; i < msgs.length - 1; ++i) {
        var msg = msgs[i];
        if(msg) syslog.save(msg);
      }
    });
  });

  server.on('listening', function() {
    var address = server.address();
    var msg = "TCP Server started on " + os.hostname() + " (" + address.address + ":" + address.port + ")";
    syslog.send_message(msg);
  });

  server.listen(config.get('tcp_port'));
}
