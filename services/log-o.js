var services = require('./')
    , controllers = require('../controllers')
    , config = require('../config.js')
    , db = require('../db.js')
    , url = require('url')
    , os = require('os')
    , util = require('util');

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

function listening() {
  /*
   * Adds default admin user if no other users exists.
   * i.e. immediately after install.
   * email: admin
   * password: admin
   */
  controllers.user.addAdmin();

  var address = '123'; //server.address();
  var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
  services.syslog.sendMessage(msg);

  //Start listeners
  if (config.get('udp')) {
    services.udp.start();
  }

  if (config.get('tcp')) {
    services.tcp.start();
  }
}

function requestListener(req, res) {
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
}

function close() {
  var address = server.address();
  var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
  services.syslog.sendMessage(msg);
}

module.exports = {
  listening: listening,
  requestListener: requestListener,
  close: close
};