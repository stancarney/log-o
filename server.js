var db = require('./db.js')
    , logo = require('./services/log-o.js')
    , services = require('./services')
    , controllers = require('./controllers')
    , config = require('./config.js')
    , http = require('http')
    , url = require('url')
    , os = require('os');

var server = http.createServer();
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
      controllers.user.addAdmin();

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
  var urlParts = url.parse(req.url, true);

  switch (urlParts.pathname) {
    case '/auth':
      controllers.user.auth(req, res);
      break;
    case '/user/add':
      controllers.user.add(req, res);
      break;
    case '/user/list':
      controllers.user.list(req, res);
      break;
    case '/user/reset':
      controllers.user.reset(req, res);
      break;
    case '/user/password':
      controllers.user.changePassword(req, res);
      break;
    case '/logout':
      controllers.user.logout(req, res);
      break;
    case '/alert/add':
      controllers.alert.add(req, res);
      break;
    case '/alert/list':
      controllers.alert.list(req, res);
      break;
    case '/alert/edit':
      controllers.alert.edit(req, res);
      break;
    case '/search':
      services.logo.search(req, res, urlParts);
      break;
    default:
      services.utils.writeResponseMessage(res, 404, 'page_not_found');
  }
});

server.on('close', function () {
  var address = server.address() || {address: 'NO ADDRESS', port: 'NO PORT'};
  var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
  services.syslog.sendMessage(msg);
});
module.exports = server;
