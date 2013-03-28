var config = require('../config.js')
    , moment = require('moment')
    , util = require('util')
    , server = require('emailjs').server.connect(
        {
          user: config.get('smtp_username'),
          password: config.get('smtp_password'),
          host: config.get('smtp_host'),
          port: config.get('smtp_port'),
          ssl: config.get('smtp_ssl'),
          tls: config.get('smtp_tls')
        }
    );

function sendWelcome(email, password) {
  sendEmail(email, 'Welcome to Log-o', 'Here is your password: ' + password);
}

function sendReset(email, adminEmail, password) {
  sendEmail(email, 'Log-o Account Reset', 'Your log-o account has been reset by ' + adminEmail + '. Here is your new password: ' + password);
}

function sendAlert(email, alert, parsedMessages) {
  var body = util.format('%s\n\n', alert.name);
  for (var i in parsedMessages) {
    body += util.format('%s %s\t%s %s %s\n',
        moment(parsedMessages[i]['time']).format('MMM D YYYY, HH:mm:ss'),
        parsedMessages[i]['facility'],
        parsedMessages[i]['severity'],
        parsedMessages[i]['host'],
        parsedMessages[i]['message']);
  }
  sendEmail(email, 'ALERT: ' + alert.name, body);
}

function isValidEmail(email) {
  return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/i.test(email);
}

function sendEmail(to, subject, body) {
  server.send({
    text: body,
    from: 'Log-o',
    to: to,
    subject: subject
  }, function (err, message) {
    if (err) console.log(err);
  });
}

module.exports = {
  sendWelcome: sendWelcome,
  sendReset: sendReset,
  sendAlert: sendAlert,
  isValidEmail: isValidEmail
};