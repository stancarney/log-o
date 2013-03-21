var Cookies = require('cookies')
    , db = require('../db.js')
    , services = require('./')
    , url = require('url')
    , crypto = require('crypto');

function isAuth(req, res, callback) {
  var cookies = new Cookies(req, res);
  var token = cookies.get('auth');

  if (!token) {
    services.syslog.sendMessage('Expired or invalid token used. IP: ' + req.connection.remoteAddress);
    writeResponseMessage(res, 401, 'unauthorized');
  } else {
    db.getUserByToken(token, function (user) {
      if (user) {
        var urlParts = url.parse(req.url, true);
        if (!user.active) {
          services.syslog.sendMessage('Auth Failed (User Not Active): ' + user.email + ' IP: ' + req.connection.remoteAddress);
          services.utils.writeResponseMessage(res, 401, 'unauthorized');
        } else if (user.forcePasswordChange && urlParts.pathname != '/user/password') {
          services.syslog.sendMessage('Auth (Change Password): ' + user.email + ' IP: ' + req.connection.remoteAddress);
          writeResponseMessage(res, 200, 'force_password_change');
        } else {
          setAuthToken(req, res, user);
          db.saveUser(user, function (user) {
            callback(user);
          });
        }
      } else {
        services.syslog.sendMessage('Auth Failed (Expired or Invalid Token). IP: ' + req.connection.remoteAddress);
        writeResponseMessage(res, 401, 'unauthorized');
      }
    });
  }
}

function parsePost(req, res, callback) {
  if (req.method === 'POST') {
    var body = '';
    req.on('data', function (data) {
      body += data;
      if (body.length > 1e6) {
        req.connection.destroy();
      }
    });
    req.on('end', function () {
      res.post = JSON.parse(body);
      callback();
    });
  } else {
    writeResponseMessage(res, 405, 'method_not_allowed');
  }
}

function writeResponseMessage(res, statusCode, result) {
  res.writeHead(statusCode, {'Content-Type': 'application/json'});
  res.write(JSON.stringify({'result': result}));
  res.end();
}

function setAuthToken(req, res, user) {
  user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
  user['lastAccess'] = new Date();
  var cookies = new Cookies(req, res);
  cookies.set('auth', user['token'], { httpOnly: true });
}

module.exports = {
  isAuth: isAuth,
  parsePost: parsePost,
  writeResponseMessage: writeResponseMessage,
  setAuthToken: setAuthToken
};