var config = require('./config.js')
    , db = require('./db.js')
    , email = require('./email.js')
    , utils = require('./utils.js')
    , syslog = require('./syslog.js')
    , password = require('password');

module.exports.auth = function (req, res, urlParts) {
  utils.parsePost(req, res, function () {
    db.getUserByEmailAndPassword(res.post['email'], res.post['password'], function (user) {
      if (user) {
        utils.setAuthToken(req, res, user);
        db.saveUser(user, function (user) {
          if (user.forcePasswordChange) {
            syslog.sendMessage('Successful Login (force password change): ' + res.post['email'] + ' IP: ' + req.connection.remoteAddress);
            utils.writeResponseMessage(res, 200, 'force_password_change');
          } else {
            syslog.sendMessage('Successful Login: ' + res.post['email'] + ' IP: ' + req.connection.remoteAddress);
            utils.writeResponseMessage(res, 200, 'success');
          }
        });
      } else {
        syslog.sendMessage('Failed Login: ' + res.post['email'] + ' IP: ' + req.connection.remoteAddress);
        utils.writeResponseMessage(res, 401, 'auth_failed');
      }
    });
  });
};

module.exports.add = function (req, res, urlParts) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (authUser) {
      //TODO: check perms
      var emailAddress = res.post['email'];
      if (email.isValidEmail(emailAddress)) {
        db.saveUser({email: emailAddress, password: password(3), forcePasswordChange: true}, function (newUser) {
          syslog.sendMessage('User added: ' + res.post['email'] + ' by: ' + authUser.email + ' IP: ' + req.connection.remoteAddress);
          email.sendWelcome(newUser.email, newUser.password);
          utils.writeResponseMessage(res, 200, 'success');
        });
      } else {
        utils.writeResponseMessage(res, 400, 'invalid_email');
      }
    });
  });
};

module.exports.list = function (req, res, urlParts) {
  utils.isAuth(req, res, function (user) {
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
};

module.exports.reset = function (req, res, urlParts) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (user) {
      db.getUserByEmail(res.post['email'], function (resetUser) {

        if (!resetUser) {
          utils.writeResponseMessage(res, 404, 'user_not_found');
          return;
        }

        resetUser.forcePasswordChange = true;
        resetUser.password = password(3);
        syslog.sendMessage('User reset: ' + resetUser.email + ' by: ' + user.email + ' IP: ' + req.connection.remoteAddress);
        email.sendWelcome(resetUser.email, resetUser.password);
        db.saveUser(resetUser, function (user) {
          if (user) {
            utils.writeResponseMessage(res, 200, 'success');
          } else {
            utils.writeResponseMessage(res, 500, 'could_not_save_user');
          }
        });
      });
    });
  });
};

module.exports.changePassword = function (req, res, urlParts) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (user) {
      user.password = res.post['newPassword'];
      user.forcePasswordChange = false;
      syslog.sendMessage('Successful Password Change: ' + user.email + ' IP: ' + req.connection.remoteAddress);
      db.saveUser(user, function (user) {
        if (user) {
          utils.writeResponseMessage(res, 200, 'success');
        } else {
          utils.writeResponseMessage(res, 500, 'could_not_reset_user');
        }
      });
    });
  });
};

module.exports.logout = function (req, res, urlParts) {
  utils.isAuth(req, res, function (user) {
    //Set auth token but don't send it back via the cookie
    user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
    user['lastAccess'] = new Date();
    syslog.sendMessage('Logout: ' + user.email + ' IP: ' + req.connection.remoteAddress);
    db.saveUser(user, function (user) {
      if (user) {
        utils.writeResponseMessage(res, 200, 'success');
      } else {
        utils.writeResponseMessage(res, 500, 'could_not_logout');
      }
    });
  });
};

