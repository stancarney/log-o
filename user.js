var db = require('./db.js')
    , email = require('./email.js')
    , utils = require('./utils.js')
    , syslog = require('./syslog.js')
    , password = require('password')
    , crypto = require('crypto')
    , bcrypt = require('bcrypt');

module.exports.auth = function (req, res) {
  utils.parsePost(req, res, function () {
    db.getUserByEmail(res.post['email'], function (user) {

      if (!user) {
        syslog.sendMessage('Failed Login. No User Found: ' + res.post['email'] + ' IP: ' + req.connection.remoteAddress);
        utils.writeResponseMessage(res, 401, 'auth_failed');
        return;
      }

      bcrypt.compare(res.post['password'], user.password, function (err, result) {

        if (!result) {
          syslog.sendMessage('Failed Login. Invalid Password: ' + res.post['email'] + ' IP: ' + req.connection.remoteAddress);
          utils.writeResponseMessage(res, 401, 'auth_failed');
          return;
        }

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
      });
    });
  });
};

module.exports.add = function (req, res) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (authUser) {

      //TODO: check perms
      var emailAddress = res.post['email'];
      if (!email.isValidEmail(emailAddress)) {
        utils.writeResponseMessage(res, 400, 'invalid_email');
        return;
      }

      var clearPassword = password(3);
      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(clearPassword, salt, function (err, hashedPassword) {
          db.saveUser({email: emailAddress, password: hashedPassword, forcePasswordChange: true}, function (newUser) {
            syslog.sendMessage('User added: ' + res.post['email'] + ' by: ' + authUser.email + ' IP: ' + req.connection.remoteAddress);
            email.sendWelcome(newUser.email, clearPassword);
            utils.writeResponseMessage(res, 200, 'success');
          });
        });
      });
    });
  });
};

/*
 * Adds an admin user if no other users exist.
 */
module.exports.addAdmin = function () {
  db.getUsers(function (users) {
    if (!users || users.length > 0) {
      return;
    }

    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash('admin', salt, function (err, hashedPassword) {
        db.saveUser({email: 'admin', password: hashedPassword, forcePasswordChange: true}, function (newUser) {
          syslog.sendMessage('User added: admin');
        });
      });
    });
  });
};

module.exports.list = function list(req, res) {
  utils.isAuth(req, res, function (user) {
    db.getUsers(function (users) {

      if (!users) {
        console.log('No Users?!?!');
        return;
      }

      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(users));
      res.end();
    });
  });
};

module.exports.reset = function (req, res) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (user) {
      db.getUserByEmail(res.post['email'], function (resetUser) {

        if (!resetUser) {
          utils.writeResponseMessage(res, 404, 'user_not_found');
          return;
        }

        var clearPassword = password(3);
        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(clearPassword, salt, function (err, hashedPassword) {
            syslog.sendMessage('User reset: ' + resetUser.email + ' by: ' + user.email + ' IP: ' + req.connection.remoteAddress);
            email.sendReset(resetUser.email, user.email, clearPassword);
            resetUser.forcePasswordChange = true;
            resetUser.password = hashedPassword;
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
    });
  });
};

module.exports.changePassword = function (req, res) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (user) {

      if (!res.post['newPassword']) {
        utils.writeResponseMessage(res, 400, 'password_required');
        return;
      }

      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(res.post['newPassword'], salt, function (err, hashedPassword) {
          user.password = hashedPassword;
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
    });
  });
};

module.exports.logout = function (req, res) {
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

