var db = require('./db.js')
    , logo = require('./routes/messages.js')
    , services = require('./services')
    , routes = require('./routes')
    , config = require('./config.js')
    , http = require('http')
    , url = require('url')
    , os = require('os')
    , server = http.createServer()
    , io = require('socket.io').listen(server);

server.listen(config.get('http_port'));

server.on('listening', function () {
  //This ensures the DB is up before anything else has started...
  var intervalId = setInterval(function ready() {
    if (db.isAvailable()) {
      console.log('Ready');
      clearInterval(intervalId);
      /*
       * Adds default admin user if no other users exists.
       * i.e. immediately after install.
       * email: admin
       * password: admin
       */
      routes.user.addAdmin();

      services.alert.setAlertInterval(config.get('alert_interval'));
      services.alert.startAlertInterval();

      var address = server.address() || {address: 'NO ADDRESS', port: 'NO PORT'};
      var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
      services.syslog.sendMessage(msg);

      //Start listeners
      if (config.get('udp')) {
        services.udp.start();
      }

      if (config.get('tcp')) {
        services.tcp.start();
      }

    } else {
      console.log('Waiting for DB.');
    }
  }, 100);
});
server.on('request', function (req, res) {
  try {
    var urlParts = url.parse(req.url, true);

    switch (urlParts.pathname) {
      case '/auth':
        routes.user.auth(req, res);
        break;
      case '/user/add':
        routes.user.add(req, res);
        break;
      case '/user/list':
        routes.user.list(req, res);
        break;
      case '/user/edit':
        routes.user.edit(req, res);
        break;
      case '/user/reset':
        routes.user.reset(req, res);
        break;
      case '/user/password':
        routes.user.changePassword(req, res);
        break;
      case '/logout':
        routes.user.logout(req, res);
        break;
      case '/alert/add':
        routes.alert.add(req, res);
        break;
      case '/alert/list':
        routes.alert.list(req, res);
        break;
      case '/alert/edit':
        routes.alert.edit(req, res);
        break;
      case '/search':
        routes.messages.search(req, res, urlParts);
        break;
      default:
        services.utils.writeResponseMessage(res, 404, 'page_not_found');
    }
  } catch (e) {
    console.log(e);
  }
});

server.on('close', function () {
  var address = server.address() || {address: 'NO ADDRESS', port: 'NO PORT'};
  var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
  services.syslog.sendMessage(msg);
});

io.set('log level', 1);
io.on('connection', function (socket) {
  try {
    socket.on('tail', function (token, args) {
      socket.set('token', token, function () {
        routes.messages.tail(socket, args, function (message) {
          socket.emit('data', message);
        });
      });
    });
  } catch (e) {
    console.log(e);
  }
});

module.exports = server;
