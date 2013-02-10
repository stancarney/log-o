var config = require('./config.js')
    , db = require('./db.js')
    , email = require('./email.js')
    , utils = require('./utils.js');

module.exports.add = function (req, res) {
  utils.parsePost(req, res, function () {
    utils.isAuth(req, res, function (user) {
      //TODO: check perms
      var name = res.post['name'];
      var regex = res.post['regex'];
      var modifiers = res.post['modifiers'];
      var recipients = res.post['recipients'].replace(/\s/g, '').split(',');
      var enable = res.post['enable'] || true;

      if (modifiers) {
        modifiers = modifiers.split('').sort().join('');
      }
      db.saveAlert({name: name, regex: regex, modifiers: modifiers, recipients: recipients, enable: enable}, function (alert) {
        utils.writeResponseMessage(res, 200, 'success');
      });
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
