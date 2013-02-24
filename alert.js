var config = require('./config.js')
    , db = require('./db.js')
    , email = require('./email.js')
    , utils = require('./utils.js');

module.exports.add = function (req, res) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (user) {
      //TODO: check perms
      var alertParams = {name: res.post['name'], regex: res.post['regex'], modifiers: res.post['modifiers'], recipients: res.post['recipients'].replace(/\s/g, '').split(','), enable: !!(res.post['enable'] === 'true'), dateAdded: new Date()};
      if (alertParams.modifiers) {
        alertParams.modifiers = alertParams.modifiers.split('').sort().join('');  //TODO: Verify on gim is passed in!
      }

      db.getAlertByName(alertParams.name, function (alert) {
        if (alert) {
          utils.writeResponseMessage(res, 400, 'alert_already_exists');
          return;
        }

        db.saveAlert(alertParams, function (alert) {
          utils.writeResponseMessage(res, 200, 'success');
        });
      });
    });
  });
};

module.exports.edit = function (req, res) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (user) {
      //TODO: check perms
      var alertParams = {name: res.post['name'], regex: res.post['regex'], modifiers: res.post['modifiers'], recipients: res.post['recipients'].replace(/\s/g, '').split(','), enable: !!(res.post['enable'] === 'true'), dateAdded: new Date()};
      if (alertParams.modifiers) {
        alertParams.modifiers = alertParams.modifiers.split('').sort().join('');  //TODO: Verify on gim is passed in!
      }

      db.getAlertByName(alertParams.name, function (alert) {
        if (!alert) {
          utils.writeResponseMessage(res, 404, 'alert_does_not_exist');
          return;
        }

        for (var key in alertParams) {
          alert[key] = alertParams[key];
        }
        db.saveAlert(alert, function (alert) {
          utils.writeResponseMessage(res, 200, 'success');
        });
      });
    });
  });
};

module.exports.list = function list(req, res) {
  utils.isAuth(req, res, function (user) {
    db.getAlerts(function (alerts) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(alerts));
      res.end();
    });
  });
};

exports.check = function (parsedMessage) {
  db.getActiveAlerts(function (alerts) {
    for (var alert in alerts) {
      var regex = new RegExp(alert.regex, alert.modifiers || '');
      if (regex.test(parsedMessage['originalMessage'])) {
        var emails = alert.recipients;
        for (var e in emails) {
          email.sendAlert(emails[e], alert, parsedMessage);
        }
      }
    }
  });
};
