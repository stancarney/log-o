var db = require('../db.js')
    , email = require('./email.js')
    , alertBatch = {}
    , alertIntervalId
    , alertInterval;

function check(parsedMessage, callback) {
  db.getActiveAlerts(function (alerts) {
    for (var i in alerts) {
      var alert = alerts[i];
      checkRegex(parsedMessage.host, alert.host, alert.modifiers, function (hostMatch) {
        checkRegex(parsedMessage.facility, alert.facility, alert.modifiers, function (facilityMatch) {
          checkRegex(parsedMessage.severity, alert.severity, alert.modifiers, function (severityMatch) {
            checkRegex(parsedMessage.message, alert.message, alert.modifiers, function (messageMatch) {
              if (hostMatch && facilityMatch && severityMatch && messageMatch) {
                queueAlert(alert, parsedMessage);
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

function queueAlert(alert, parsedMessage) {
  if (alertBatch[alert.name]) {
    alertBatch[alert.name].push({
      alert: alert,
      parsedMessage: parsedMessage
    });
  } else {
    alertBatch[alert.name] = [
      {
        alert: alert,
        parsedMessage: parsedMessage
      }
    ];
  }
}

function startAlertInterval() {
  if (!alertIntervalId) {
    alertIntervalId = setInterval(function ready() {
      for (var i in alertBatch) {
        var queuedAlerts = alertBatch[i];
        var messages = [];
        for (var j in queuedAlerts) {
          messages.push(queuedAlerts[j].parsedMessage);
        }

        var emails = queuedAlerts[j].alert.recipients;
        for (var k in emails) {
          email.sendAlert(emails[k], queuedAlerts[0].alert, messages);
        }

        delete alertBatch[i];
      }
    }, alertInterval);
  }
}

function stopAlertInterval() {
  clearInterval(alertIntervalId);
  alertIntervalId = null;
}

function setAlertInterval(ms) {
  alertInterval = ms;
}

module.exports = {
  check: check,
  startAlertInterval: startAlertInterval,
  stopAlertInterval: stopAlertInterval,
  setAlertInterval: setAlertInterval
};