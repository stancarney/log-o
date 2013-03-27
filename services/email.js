var config = require('../config.js')
    , moment = require('moment')
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

exports.sendWelcome = function (email, password) {
  sendEmail(email, 'Welcome to Log-o', 'Here is your password: ' + password);
};

exports.sendReset = function (email, adminEmail, password) {
  sendEmail(email, 'Log-o Account Reset', 'Your log-o account has been reset by ' + adminEmail + '. Here is your new password: ' + password);
};

exports.sendAlert = function (email, alert, parsedMessage) {
  sendEmail(email, 'ALERT: ' + alert.name,
      alert.name + '\n\n' +
          '[' +
          moment(parsedMessage['time']).format('MMM D YYYY, HH:mm:ss') +
          ' ' +
          parsedMessage['facility'] +
          ' ' +
          parsedMessage['severity'] +
          ']\t' +
          parsedMessage['host'] +
          '   ' +
          parsedMessage['message']);
};

exports.isValidEmail = function (email) {
  return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/i.test(email);
};

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
