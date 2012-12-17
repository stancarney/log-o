var nconf = require('nconf');
nconf.argv()
       .env()
       .file({ file: "config.json" });

var server = require("emailjs").server.connect({
			user: nconf.get('smtp_username'),
			password: nconf.get('smtp_password'),
			host: nconf.get('smtp_host'),
			port: nconf.get('smtp_port'),
			ssl: nconf.get('smtp_ssl'),
			tls: nconf.get('smtp_tls')
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