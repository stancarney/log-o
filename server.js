var db = require('./db.js')
    , syslog = require('./syslog.js')
    , udp = require('./udp.js')
    , tcp = require('./tcp.js')
    , email = require('./email.js')
    , alert = require('./alert.js')
    , password = require('password')
    , user = require('./user.js')
    , utils = require('./utils.js')
    , http = require('http')
    , url = require('url')
    , crypto = require('crypto')
    , os = require('os')
    , querystring = require('querystring');

http.createServer(function (req, res) {
  var urlParts = url.parse(req.url, true);

  switch (urlParts.pathname) {
    case '/auth':
      user.auth(req, res, urlParts);
      break;
    case '/user/add':
      user.add(req, res, urlParts);
      break;
    case '/user/list':
      user.list(req, res, urlParts);
      break;
    case '/user/reset':
      user.reset(req, res, urlParts);
      break;
    case '/user/password':
      user.changePassword(req, res, urlParts);
      break;
    case '/logout':
      user.logout(req, res, urlParts);
      break;
    case '/alert/add':
      alert.add(req, res, urlParts);
      break;
    case '/search':
      search(req, res, urlParts);
      break;
    default:
      utils.writeResponseMessage(res, 404, 'page_not_found');
  }
}).listen(8000);

function search(req, res, urlParts) {
  utils.isAuth(req, res, function (user) {
    var qs = urlParts.query['q'] || '';
    syslog.sendMessage(user.email + ' viewed the logs with: ' + qs.toString());
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