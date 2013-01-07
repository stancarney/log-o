var config = require('./config.js');

var server = require("emailjs").server.connect({
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

function sendEmail(to, subject, body) {
	server.send({
		 text:    body,
		 from:    "Log-o",
		 to:      to,
		 subject: subject
	}, function(err, message) { if (err) console.log(err); });
}
