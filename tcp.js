var config = require('./config.js');

if(config.get('tcp')) {
  var net = require('net')
      , server = net.createServer(5140)
      , syslog = require('./syslog.js');
  
  server.on('connection', function(sock) {
    sock.on('data', function(data) {
      syslog.save(data);
    });
  });
  
  server.on('listening', function() {
    var address = server.address();
    syslog.send_message("TCP Server started on " + address.address + ":" + address.port);
  });
  
  server.listen(config.get('tcp_port'));
}
