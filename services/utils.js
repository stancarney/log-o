var Cookies = require('cookies')
    , db = require('../db.js')
    , services = require('./')
    , url = require('url')
    , crypto = require('crypto');

//TODO:Stan check lastAccesstime to ensure tokens expire!
function isAuth() {
  var req = arguments[0];
  var res = arguments[1];
  var permission = arguments[2];
  var callback = arguments[3];
  var cookies = new Cookies(req, res);
  var token = cookies.get('auth');

  if (arguments.length === 3) {
    callback = arguments[2];
    permission = false;
  }

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
        } else if (permission && (!user.permissions || user.permissions.indexOf(permission) < 0)) {
          services.syslog.sendMessage('Auth Failed (No Permission): ' + user.email + ' IP: ' + req.connection.remoteAddress);
          services.utils.writeResponseMessage(res, 403, 'forbidden');
        } else if (user.forcePasswordChange && urlParts.pathname != '/user/password') {
          services.syslog.sendMessage('Auth (Change Password): ' + user.email + ' IP: ' + req.connection.remoteAddress);
          writeResponseMessage(res, 200, 'force_password_change');
        } else {
          callback(user);
        }
      } else {
        services.syslog.sendMessage('Auth Failed (Expired or Invalid Token). IP: ' + req.connection.remoteAddress);
        writeResponseMessage(res, 401, 'unauthorized');
      }
    });
  }
}

//TODO:Stan check lastAccesstime to ensure tokens expire!
//TODO:Stan if this is cleaned up, it could be merged with the isAuth method I think.
function isAuthWebSocket() {
  var socket = arguments[0];
  var permission = arguments[1];
  var callback = arguments[2];
  var remoteAddress = socket.handshake.address.address;

  socket.get('token', function (err, token) {

    if (err) {
      throw new Error(err);
    }

    if (arguments.length === 3) {
      callback = arguments[1];
      permission = false;
    }

    if (!token) {
      services.syslog.sendMessage('Expired or invalid token used. IP: ' + remoteAddress);
      socket.emit('error', {result: 'unauthorized'});
    } else {
      db.getUserByToken(token, function (user) {
        if (user) {
          if (!user.active) {
            services.syslog.sendMessage('Auth Failed (User Not Active): ' + user.email + ' IP: ' + remoteAddress);
            socket.emit('error', {result: 'unauthorized'});
          } else if (permission && (!user.permissions || user.permissions.indexOf(permission) < 0)) {
            services.syslog.sendMessage('Auth Failed (No Permission): ' + user.email + ' IP: ' + remoteAddress);
            socket.emit('error', {result: 'forbidden'});
          } else if (user.forcePasswordChange) {
            services.syslog.sendMessage('Auth (Change Password): ' + user.email + ' IP: ' + remoteAddress);
            socket.emit('error', {result: 'force_password_change'});
          } else {
            callback(user);
          }
        } else {
          services.syslog.sendMessage('Auth Failed (Expired or Invalid Token). IP: ' + remoteAddress);
          socket.emit('error', {result: 'unauthorized'});
        }
      });
    }
  });
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
  if (!user.token) {
    user.token = crypto.randomBytes(Math.ceil(256)).toString('base64');
    user.lastAccess = new Date();
    var cookies = new Cookies(req, res);
    cookies.set('auth', user['token'], { httpOnly: true });
  }
}

module.exports = {
  isAuth: isAuth,
  isAuthWebSocket: isAuthWebSocket,
  parsePost: parsePost,
  writeResponseMessage: writeResponseMessage,
  setAuthToken: setAuthToken
};