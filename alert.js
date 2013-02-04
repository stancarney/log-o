var config = require('./config.js')
    , db = require('./db.js')
    , email = require('./email.js');

exports.add = function (name, regex, modifiers, recipients, enable, callback) {
  //TODO: Validate regex
  if (modifiers) {
    modifiers = modifiers.split('').sort().join('');
  }
  db.saveAlert({name: name, regex: regex, modifiers: modifiers, recipients: recipients.replace(/\s/g, '').split(','), enable: enable || true}, function (alert) {
    callback(alert);
  });
};

//TODO: Implement
exports.edit = function (name, regex, enable) {

};

//TODO: Implement
exports.delete = function (id) {

};

//TODO: Implement
exports.list = function () {

};

exports.check = function (parsed_message) {
  db.getActiveAlerts(function (alerts) {
    for (var alert in alerts) {
      var regex = new RegExp(alert.regex, alert.modifiers || '');
      if (regex.test(parsed_message['originalMessage'])) {
        var emails = alert.recipients;
        for (var e in emails) {
          email.send_alert(emails[e], alert, parsed_message);
        }
      }
    }
  });
};
