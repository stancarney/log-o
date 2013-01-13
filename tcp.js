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
      var seq_no = 0;
      buffer += data;
      if (buffer.indexOf(terminator) >= 0) {
        var msgs = buffer.split(terminator);
        for (var i = 0; i < msgs.length - 1; ++i) {
          var msg = msgs[i];
          if (msg != '\n') syslog.save(msg, seq_no);
          seq_no = ++seq_no
        }
        buffer = msgs[msgs.length - 1];
      }
    });

    sock.on('end', function() {
      var seq_no = 0;
      var msgs = buffer.split(terminator);
      for (var i = 0; i < msgs.length - 1; ++i) {
        var msg = msgs[i];
        if(msg) syslog.save(msg, seq_no);
        seq_no = ++seq_no
      }
    });
  });

  server.on('listening', function() {
    var address = server.address();
    var msg = "TCP Server started on " + os.hostname() + " (" + address.address + ":" + address.port + ")"
    console.log(msg);
    syslog.send_message(msg);
  });

  server.listen(config.get('tcp_port'));
}
