var config = require('./config.js')
    , db = require('./db.js')
    , email = require('./email.js')
    , utils = require('./utils.js');

module.exports.add = function (req, res) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (user) {
      //TODO: check perms
      var alertParams = {name: res.post['name'], regex: res.post['regex'], modifiers: res.post['modifiers'], recipients: res.post['recipients'].replace(/\s/g, '').split(','), enable: !!(res.post['enable'] === 'true'), dateAdded: new Date()};
      console.log(alertParams);

      if (alertParams.modifiers) {
        alertParams.modifiers = alertParams.modifiers.split('').sort().join('');  //TODO: Verify on gim is passed in!
      }

      //Update or create an alert based on if it exists or not.
      db.getAlertByName(alertParams.name, function (alert) {
        if (alert) {
          for (var key in alertParams) {
            alert[key] = alertParams[key];
          }
        } else {
          alert = alertParams;
        }

        console.log(alert);
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
