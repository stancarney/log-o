var db = require('./db.js')
    , syslog = require('./syslog.js')
    , udp = require('./udp.js')
    , tcp = require('./tcp.js')
    , http = require('http')
    , url = require('url')
    , crypto = require('crypto')
    , os = require('os')
    , Cookies = require('cookies')
    , querystring = require('querystring')
    , email = require('./email.js')
    , alert = require('./alert.js')
    , user = require('./user.js');

http.createServer(function (req, res) {
  var urlParts = url.parse(req.url, true);

  switch (urlParts.pathname) {
    case '/auth':
      auth(req, res, urlParts);
      break;
    case '/user/add':
      userAdd(req, res, urlParts);
      break;
    case '/user/list':
      userList(req, res, urlParts);
      break;
    case '/user/reset':
      userReset(req, res, urlParts);
      break;
    case '/user/password':
      changePassword(req, res, urlParts);
      break;
    case '/alert/add':
      alertAdd(req, res, urlParts);
      break;
    case '/logout':
      logout(req, res, urlParts);
      break;
    case '/search':
      search(req, res, urlParts);
      break;
    default:
      writeResponseMessage(res, 404, 'page_not_found');
  }
}).listen(8000);

function auth(req, res, urlParts) {
  parsePost(req, res, function () {
    db.getUserByEmailAndPassword(res.post['email'], res.post['password'], function (user) {
      if (user) {
        setAuthToken(req, res, user);
        db.saveUser(user, function (user) {
          if (user.forcePasswordChange) {
            syslog.sendMessage('Successful Login (force password change): ' + res.post['email'] + ' IP: ' + req.connection.remoteAddress);
            writeResponseMessage(res, 200, 'force_password_change');
          } else {
            syslog.sendMessage('Successful Login: ' + res.post['email'] + ' IP: ' + req.connection.remoteAddress);
            writeResponseMessage(res, 200, 'success');
          }
        });
      } else {
        syslog.sendMessage('Failed Login: ' + res.post['email'] + ' IP: ' + req.connection.remoteAddress);
        writeResponseMessage(res, 401, 'auth_failed');
      }
    });
  });
}

function userAdd(req, res, urlParts) {
  parsePost(req, res, function () {
    isAuth(req, res, function (authUser) {
      //TODO: check perms
      user.add(res.post['email'], function (newUser) {
        syslog.sendMessage('User added: ' + res.post['email'] + ' by: ' + authUser.email + ' IP: ' + req.connection.remoteAddress);
        email.sendWelcome(newUser.email, newUser.password);
        writeResponseMessage(res, 200, 'success');
      });
    });
  });
}

function userList(req, res, urlParts) {
  isAuth(req, res, function (user) {
    db.getUsers(function (users) {
      if (users) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(users));
        res.end();
      } else {
        console.log('No Users?!?!');
      }
    });
  });
}

function userReset(req, res, urlParts) {
  parsePost(req, res, function () {
    isAuth(req, res, function (user) {
      db.getUserByEmail(res.post['email'], function (resetUser) {

        if (err) {
          writeResponseMessage(res, 500, 'could_not_reset_user');
          return;
        }

        if (!resetUser) {
          writeResponseMessage(res, 404, 'user_not_found');
          return;
        }

        resetUser.forcePasswordChange = true;
        resetUser.password = password(3);
        syslog.sendMessage('User reset: ' + resetUser.email + ' by: ' + user.email + ' IP: ' + req.connection.remoteAddress);
        email.sendWelcome(resetUser.email, resetUser.password);
        db.saveUser(resetUser, function (user) {
          if (user) {
            writeResponseMessage(res, 200, 'success');
          } else {
            writeResponseMessage(res, 500, 'could_not_save_user');
          }
        });
      });
    });
  });
}

function changePassword(req, res, urlParts) {
  parsePost(req, res, function () {
    isAuth(req, res, function (user) {
      user.password = res.post['newPassword'];
      user.forcePasswordChange = false;
      syslog.sendMessage('Successful Password Change: ' + user.email + ' IP: ' + req.connection.remoteAddress);
      db.saveUser(user, function (user) {
        if (user) {
          writeResponseMessage(res, 200, 'success');
        } else {
          writeResponseMessage(res, 500, 'could_not_reset_user');
        }
      });
    });
  });
}

function alertAdd(req, res, urlParts) {
  parsePost(req, res, function () {
    isAuth(req, res, function (user) {
      //TODO: check perms
      alert.add(res.post['name'], res.post['regex'], res.post['modifiers'], res.post['recipients'], res.post['enable'], function (alert) {
        writeResponseMessage(res, 200, 'success');
      });
    });
  });
}

function search(req, res, urlParts) {
  isAuth(req, res, function (user) {
    syslog.sendMessage(user.email + ' viewed the logs with: ' + urlParts.query['q'].toString());
    db.getMessages(urlParts.query['q'], function (messages) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      if (messages) {
        res.write(JSON.stringify(messages.reverse())); // This kind of sucks. In order to reverse the Cursor we have to load it all in memory.
        res.end();
      } else {
        writeResponseMessage(res, 400, 'bad_request');
      }
    });
  });
}

function setAuthToken(req, res, user) {
  user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
  user['lastAccess'] = new Date();
  var cookies = new Cookies(req, res);
  cookies.set('auth', user['token'], { httpOnly: true });
}

function logout(req, res, urlParts) {
  isAuth(req, res, function (user) {
    //Set auth token but don't send it back via the cookie
    user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
    user['lastAccess'] = new Date();
    syslog.sendMessage('Logout: ' + user.email + ' IP: ' + req.connection.remoteAddress);
    db.saveUser(user, function (user) {
      if (user) {
        writeResponseMessage(res, 200, 'success');
      } else {
        writeResponseMessage(res, 500, 'could_not_logout');
      }
    });
  });
}

function writeResponseMessage(res, statusCode, result) {
  res.writeHead(statusCode, {'Content-Type': 'application/json'});
  res.write(JSON.stringify({'result': result}));
  res.end();
}

function isAuth(req, res, callback) {

  var cookies = new Cookies(req, res);
  var token = cookies.get('auth');

  if (!token) {
    syslog.sendMessage('Expired or invalid token used. IP: ' + req.connection.remoteAddress);
    writeResponseMessage(res, 401, 'auth_failed');
  } else {
    db.getUserByToken(token, function (user) {
      if (user) {
        var urlParts = url.parse(req.url, true);
        if (user.forcePasswordChange && urlParts.pathname != '/user/password') {
          syslog.sendMessage('User must change password: ' + user.email + ' IP: ' + req.connection.remoteAddress);
          writeResponseMessage(res, 200, 'force_password_change2');
        } else {
          setAuthToken(req, res, user);
          db.saveUser(user, function (user) {
            callback(user);
          });
        }
      } else {
        syslog.sendMessage('Expired or invalid token used. IP: ' + req.connection.remoteAddress);
        writeResponseMessage(res, 401, 'auth_failed');
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
