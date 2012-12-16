var nconf = require('nconf');
nconf.argv()
       .env()
       .file({ file: "config.json" });

var syslogParser = require('glossy').Parse
		, syslogProducer = require('glossy').Produce
		, glossy = new syslogProducer({ type: 'BSD' })
		, fs = require('fs')
		, dgram  = require("dgram")
		, http = require('http')
		, url = require('url')
		, server = dgram.createSocket("udp4")
		, mongo = require('mongodb')
		, db = new mongo.Db(nconf.get('db_name'), new mongo.Server(nconf.get('db_host'), nconf.get('db_port'), {}), {})
		, moment = require('moment')
		, crypto = require('crypto')
		, os = require('os')
		, Cookies = require('cookies')
		, querystring = require('querystring');

moment.lang('en');

var hostname = os.hostname();

db.open(function(err, data) {
	if(data) {
		data.authenticate(nconf.get('db_username'), nconf.get('db_password'), function(err2, data2) {
			if(err2) console.log(err2);
			db.collection('users', function(err, collection) {
				collection.ensureIndex({keywords : 1});
				collection.ensureIndex({email : 1}, {unique : true});
			});
		});
	} else {
		console.log(err);
	}
});

server.on("message", function(rawMessage) {
	try {
    syslogParser.parse(rawMessage.toString('utf8', 0), function(parsedMessage){
				db.collection('messages', function(err, collection) {

					collection.find({}, {'hash':1}).sort({_id:-1}).limit(1).toArray(function(err, last_message){
						if(!err && last_message){
							//add additional parts first.
							parsedMessage['timestamp'] = new Date();
							parsedMessage['hostname'] = hostname;
							parsedMessage['keywords'] = parsedMessage['message'].toLowerCase().split(" ");
							parsedMessage['message_hash'] = crypto.createHash('sha1').update(parsedMessage['message']).digest("hex");
							parsedMessage['previous_hash'] = last_message[0] ? last_message[0].hash : '';
							parsedMessage['hash'] = crypto.createHash('sha1').update(JSON.stringify(parsedMessage)).digest("hex");

							collection.save(parsedMessage);
						} else {
							console.log('Err', err);
						}
					});
				});
      });
		} catch(e) {
			console.log('Could not save message. [' + rawMessage + '] ' + e);
		}
});

server.on("listening", function() {
	var address = server.address();
	send_message("Server started on " + address.address + ":" + address.port);
});

server.bind(5140);

//skip=20
//limit=100
//sort={last_name: 1}

http.createServer(function (req, res) {
	var url_parts = url.parse(req.url, true);

	switch(url_parts.pathname) {
		case '/auth':
			auth(req, res, url_parts);
			break;
		case '/adduser':
			adduser(req, res, url_parts);
			break;
		case '/search':
			search(req, res, url_parts);
			break;
		default:
			display_404(url_parts.pathname, req, res);
	}
}).listen(8000);

function auth(req, res, url_parts){
	parse_post(req, res, function(){
		db.collection('users', function(err, collection) {
			collection.findOne({email: res.post['email'], password: res.post['password']}, function(err, user){
				if(!err && user){
					send_message("Successful Login: " + res.post['email'] + " IP: " + req.connection.remoteAddress);
					user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
					user['last_access'] = new Date();
					collection.save(user);
					var cookies = new Cookies( req, res );
					cookies.set('auth', user['token'], { httpOnly: true });
					cookies.set('a', 'a', { httpOnly: true });
					cookies.set('b', 'b', { httpOnly: true });
					res.writeHead(200, {"Content-Type": "application/json"});
					res.write(JSON.stringify({"result": "Login success"}));
					res.end();
				} else {
					if(err) console.log(err);
					send_message("Failed Login: " + res.post['email'] + " IP: " + req.connection.remoteAddress);
					res.writeHead(405, {"Content-Type": "application/json"});
					res.write(JSON.stringify({"result": "Auth failure"}));
					res.end();
				}
			});
		});
	});
}

function adduser(req, res, url_parts){
	parse_post(req, res, function(){
		is_auth(req, res, function(user){
			if(is_valid_email(res.post['email'])){
				db.collection('users', function(err, collection) {
					collection.save({email: res.post['email'], password: res.post['password']}, {safe: true}, function(err, result){
						if(err) {
							res.writeHead(409, {'Content-Type': 'application/json'});
							res.write(JSON.stringify({"result": "User address already exists."}));
							res.end();
						} else {
							res.writeHead(200, {'Content-Type': 'application/json'});
							res.write(JSON.stringify({"result": "User successfully added."}));
							res.end();
						}
					});
				});
			} else {
				res.writeHead(400, {'Content-Type': 'application/json'});
				res.write(JSON.stringify({"result": "Invalid email."}));
				res.end();
			}
		});
	});
}

function search(req, res, url_parts){
	is_auth(req, res, function(user){
		db.collection('users', function(err, collection) {
			send_message(user.email + ' viewed the logs with: ' + req.url.toString());
			db.collection('messages', function(err, collection) {
				var query = collection.find(url_parts.query).sort({timestamp:-1});
				var skip = pop(url_parts.query, 'skip');
				var limit = pop(url_parts.query, 'limit');

				if(skip) query = query.skip(parseInt(skip));
				if(limit) {
					query = query.limit(parseInt(limit));
				} else {
					query = query.limit(100);
				}

				var m = [];
				res.writeHead(200, {"Content-Type": "application/json"});
				query.each(function(err, message){
					if(!err && message){
						m.push(message); // This kind of sucks. In order to reverse the Cursor we have to load it all in memory.
					} else {
						res.write(JSON.stringify(m.reverse()));
						res.end();
					}
				});
			});
		});
	});
}

function send_message(message){
	var address = server.address();

	var msg = glossy.produce({
		facility: 'local4',
		severity: 'info',
		host: hostname,
		app_id: 'log-o',
		pid: process.id,
		date: new Date(),
		message: message
	});
	bmsg = new Buffer(msg);

	var client = dgram.createSocket("udp4");
	client.send(bmsg, 0, bmsg.length, 5140, "0.0.0.0", function(err, bytes) {
		if(err) console.log("Could not log message: " + err);
		client.close();
	});
}

function pop(dictionary, key){
	var e = dictionary[key];
	delete dictionary[key];
	return e;
}

function is_auth(req, res, callback) {

	//get cookie
	var cookies = new Cookies( req, res );
	var user = cookies.get('auth');

	//check against db
	db.collection('users', function(err, collection) {
		collection.findOne({token: user}, function(err, user){
			if(!err && user){
				user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
				user['last_access'] = new Date();
				collection.save(user);
				var cookies = new Cookies( req, res );
				cookies.set('auth', user['token'], { httpOnly: true });
				callback(user);
			} else {
				if(err) console.log(err);
				send_message("Expired or invalid token used. IP: " + req.connection.remoteAddress);
				res.writeHead(401, {"Content-Type": "application/json"});
				res.write(JSON.stringify({"result": "Auth failure"}));
				res.end();
			}
		});
	});
}

function parse_post(req, res, callback) {
	if (req.method == 'POST') {
		var body = '';
		req.on('data', function (data) {
			body += data;
			if (body.length > 1e6) {
					req.connection.destroy();
			}
		});
		req.on('end', function () {
			res.post = JSON.parse(body);
			callback();
		});
	} else {
		res.writeHead(405, {'Content-Type': 'text/plain'});
		res.end();
	}
}

function is_valid_email(email) {
	return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/i.test(email);
}
