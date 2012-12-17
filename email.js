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
	console.log(email, password);
	sendEmail(email, "Welcome to Log-o", "Here is your password: " + password);
};

function sendEmail(to, subject, body) {
	// send the message and get a callback with an error or details of the message that was sent
	server.send({
		 text:    body,
		 from:    "Log-o",
		 to:      to,
		 subject: subject
	}, function(err, message) { console.log(err || message); });
}