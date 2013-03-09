var db = require('./db.js')
    , services = require('./services')
    , controllers = require('./controllers')
    , http = require('http')
    , url = require('url')
    , os = require('os')
    , util = require('util')
    , config = require('./config.js');

/*
 * Adds default admin user if no other users exists.
 * i.e. immediately after install.
 * email: admin
 * password: admin
 */
controllers.user.addAdmin();

var server = http.createServer(function (req, res) {
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
      search(req, res, urlParts);
      break;
    default:
      services.utils.writeResponseMessage(res, 404, 'page_not_found');
  }
});

server.listen(config.get('http_port'));

server.on('listening', function () {
  var address = server.address();
  var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
  services.syslog.sendMessage(msg);

  //Start listeners
  //TODO: Implement start() or something instead of late require.
  require('./services/udp.js');
  require('./services/tcp.js');
});

server.on('close', function () {
  var address = server.address();
  var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
  services.syslog.sendMessage(msg);
});

function search(req, res, urlParts) {
  services.utils.isAuth(req, res, function (user) {
    var qs = urlParts.query || '';
    services.syslog.sendMessage(user.email + ' viewed the logs with: ' + util.inspect(qs).replace(/(\r\n|\n|\r)/gm, ""));
    db.getMessages(qs, function (messages) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      if (messages) {
        res.write(JSON.stringify(messages.reverse())); // This kind of sucks. In order to reverse the Cursor we have to load it all in memory.
        res.end();
      } else {
        services.utils.writeResponseMessage(res, 400, 'bad_request');
      }
    });
  });
}

