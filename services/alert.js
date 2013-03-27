var db = require('../db.js')
    , email = require('./email.js');

//TODO: Not really a controller. More like a service.
function check(parsedMessage, callback) {
  db.getActiveAlerts(function (alerts) {
    for (var i in alerts) {
      var alert = alerts[i];
      checkRegex(parsedMessage.host, alert.host, alert.modifiers, function (hostMatch) {
        checkRegex(parsedMessage.facility, alert.facility, alert.modifiers, function (facilityMatch) {
          checkRegex(parsedMessage.severity, alert.severity, alert.modifiers, function (severityMatch) {
            checkRegex(parsedMessage.message, alert.message, alert.modifiers, function (messageMatch) {
              if (hostMatch && facilityMatch && severityMatch && messageMatch) {
                var emails = alert.recipients;
                for (var i in emails) {
                  email.sendAlert(emails[i], alert, parsedMessage);
                }
                if (callback) callback(true);
              } else {
                if (callback) callback(false);
              }
            });
          });
        });
      });
    }
  });
}

function checkRegex(value, regexStr, modifiers, callback) {
  if (!regexStr) {
    callback(true);
    return;
  }

  var regex = new RegExp(regexStr, modifiers || '');
  callback(regex.test(value));
}

module.exports = {
  check: check
};