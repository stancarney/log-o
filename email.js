var config = require('./config.js')
    , moment = require('moment')
    , server = require("emailjs").server.connect({
			user: config.get('smtp_username'),
			password: config.get('smtp_password'),
			host: config.get('smtp_host'),
			port: config.get('smtp_port'),
			ssl: config.get('smtp_ssl'),
			tls: config.get('smtp_tls')
		});

exports.send_welcome = function(email, password) {
	sendEmail(email, "Welcome to Log-o", "Here is your password: " + password);
};

exports.send_alert = function(email, alert, parsed_message) {
	sendEmail(email, "ALERT: " + alert.name,
      "ALERT hit for rule named: " +
          alert.name + "\n\n" +
          '[' +
          moment(parsed_message['time']).format('MMM D YYYY, HH:mm:ss') +
          ' ' +
          parsed_message['facility'] +
          ' ' +
          parsed_message['severity'] +
          ']\t' +
          parsed_message['host'] +
          '   ' +
          parsed_message['message']);
};

exports.is_valid_email = function(email) {
	return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/i.test(email);
};

function sendEmail(to, subject, body) {
	server.send({
		 text:    body,
		 from:    "Log-o",
		 to:      to,
		 subject: subject
	}, function(err, message) { if (err) console.log(err); });
}
