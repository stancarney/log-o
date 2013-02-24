var db = require('./db.js')
    , syslog = require('./syslog.js')
    , alert = require('./alert.js')
    , user = require('./user.js')
    , utils = require('./utils.js')
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
user.addAdmin();

var server = http.createServer(function (req, res) {
  var urlParts = url.parse(req.url, true);

  switch (urlParts.pathname) {
    case '/auth':
      user.auth(req, res);
      break;
    case '/user/add':
      user.add(req, res);
      break;
    case '/user/list':
      user.list(req, res);
      break;
    case '/user/reset':
      user.reset(req, res);
      break;
    case '/user/password':
      user.changePassword(req, res);
      break;
    case '/logout':
      user.logout(req, res);
      break;
    case '/alert/add':
      alert.add(req, res);
      break;
    case '/alert/list':
      alert.list(req, res);
      break;
    case '/alert/edit':
      alert.edit(req, res);
      break;
    case '/search':
      search(req, res, urlParts);
      break;
    default:
      utils.writeResponseMessage(res, 404, 'page_not_found');
  }
});

server.listen(config.get('http_port'));

server.on('listening', function () {
  var address = server.address();
  var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
  syslog.sendMessage(msg);

  //Start listeners
  require('./udp.js');
  require('./tcp.js');
});

server.on('close', function () {
  var address = server.address();
  var msg = 'HTTP Server started on ' + os.hostname() + ' (' + address.address + ':' + address.port + ')';
  syslog.sendMessage(msg);
});

function search(req, res, urlParts) {
  utils.isAuth(req, res, function (user) {
    var qs = urlParts.query || '';
    syslog.sendMessage(user.email + ' viewed the logs with: ' + util.inspect(qs).replace(/(\r\n|\n|\r)/gm, ""));
    db.getMessages(qs, function (messages) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      if (messages) {
        res.write(JSON.stringify(messages.reverse())); // This kind of sucks. In order to reverse the Cursor we have to load it all in memory.
        res.end();
      } else {
        utils.writeResponseMessage(res, 400, 'bad_request');
      }
    });
  });
}

