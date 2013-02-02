var db = require('./db.js')
    , syslog = require('./syslog.js')
		, udp = require('./udp.js')
    , tcp = require('./tcp.js')
		, http = require('http')
		, url = require('url')
		, crypto = require('crypto')
		, os = require('os')
		, Cookies = require('cookies')
		, querystring = require('querystring')
		, password = require('password')
		, email = require('./email.js');

//skip=20
//limit=100
//sort={last_name: 1}

http.createServer(function (req, res) {
	var url_parts = url.parse(req.url, true);

	switch(url_parts.pathname) {
		case '/auth':
			auth(req, res, url_parts);
			break;
		case '/user/add':
			user_add(req, res, url_parts);
			break;
		case '/user/list':
			user_list(req, res, url_parts);
			break;
		case '/user/reset':
			user_reset(req, res, url_parts);
			break;
		case '/user/password':
			change_password(req, res, url_parts);
			break;
		case '/logout':
			logout(req, res, url_parts);
			break;
		case '/search':
			search(req, res, url_parts);
			break;
		default:
			write_response_message(res, 404, "page_not_found");
	}
}).listen(8000);

function auth(req, res, url_parts){
	parse_post(req, res, function(){
		db.collection('users', function(err, collection) {
			collection.findOne({email: res.post['email'], password: res.post['password']}, function(err, user){
				if(!err && user){
					set_auth_token(req, res, user);
					collection.save(user);
					if(user.force_password_change){
            syslog.send_message("Successful Login (force password change): " + res.post['email'] + " IP: " + req.connection.remoteAddress);
						write_response_message(res, 200, "force_password_change");
					} else {
            syslog.send_message("Successful Login: " + res.post['email'] + " IP: " + req.connection.remoteAddress);
						write_response_message(res, 200, "success");
					}
				} else {
					if(err) console.log(err);
          syslog.send_message("Failed Login: " + res.post['email'] + " IP: " + req.connection.remoteAddress);
					write_response_message(res, 401, "auth_failed");
				}
			});
		});
	});
}

function user_add(req, res, url_parts){
	parse_post(req, res, function(){
		is_auth(req, res, function(user){
			if(is_valid_email(res.post['email'])){
				db.collection('users', function(err, collection) {
					collection.save({email: res.post['email'], password: password(3), force_password_change: true}, {safe: true}, function(err, new_user){
						if(err) {
							write_response_message(res, 409, "address_exists");
						} else {
              syslog.send_message("User added: " + res.post['email'] + " by: " + user.email + " IP: " + req.connection.remoteAddress);
							email.send_welcome(new_user.email, new_user.password);
							write_response_message(res, 200, "success");
						}
					});
				});
			} else {
				write_response_message(res, 400, "invalid_email");
			}
		});
	});
}

function user_list(req, res, url_parts){
	is_auth(req, res, function(user){
		db.collection('users', function(err, collection) {
			var u = [];
			res.writeHead(200, {'Content-Type': 'application/json'});
			collection.find({}, { email: 1, last_access: 1 }).sort({email:1}).each(function(err, user){
				if(!err && user){
					u.push(user);
				} else {
					res.write(JSON.stringify(u));
					res.end();
				}
			});
		});
	});
}

function user_reset(req, res, url_parts){
	parse_post(req, res, function(){
		is_auth(req, res, function(user){
			db.collection('users', function(err, collection) {
				collection.findOne({email: res.post['email']}, function(err, reset_user){
					if(!err && reset_user) {
						reset_user.force_password_change = true;
						reset_user.password = password(3);
            syslog.send_message("User reset: " + reset_user.email + " by: " + user.email + " IP: " + req.connection.remoteAddress);
						email.send_welcome(reset_user.email, reset_user.password);
						collection.save(reset_user);
						write_response_message(res, 200, "success");
					} else {
						write_response_message(res, 404, "user_not_found");
					}
				});
			});
		});
	});
}

function change_password(req, res, url_parts){
	parse_post(req, res, function(){
		is_auth(req, res, function(user){
			db.collection('users', function(err, collection) {
				user.password = res.post['new_password'];
				user.force_password_change = false;
        syslog.send_message("Successful Password Change: " + user.email + " IP: " + req.connection.remoteAddress);
				collection.save(user);
				write_response_message(res, 200, "success");
			});
		});
	});
}

function search(req, res, url_parts) {
  is_auth(req, res, function (user) {
    db.collection('users', function (err, collection) {
      syslog.send_message(user.email + ' viewed the logs with: ' + url_parts.query['q'].toString());
      db.collection('messages', function (err, collection) {

        var args = null;
        try{
          args = JSON.parse(url_parts.query['q']);
        }catch(e){
          args = {};
        }

        try {
          var query = collection.find(args).sort({time: -1, timestamp: -1});
          var skip = pop(url_parts.query, 'skip');
          var limit = pop(url_parts.query, 'limit');

          if (skip) query = query.skip(parseInt(skip));
          if (limit) {
            query = query.limit(parseInt(limit));
          } else {
            query = query.limit(100);
          }

          var m = [];
          res.writeHead(200, {"Content-Type": "application/json"});
          query.each(function (err, message) {
            if (!err && message) {
              m.push(message); // This kind of sucks. In order to reverse the Cursor we have to load it all in memory.
            } else {
              res.write(JSON.stringify(m.reverse()));
              res.end();
            }
          });
        } catch (e) {
          console.log(e);
          write_response_message(res, 400, "bad_request");
        }
      });
    });
  });
}

function set_auth_token(req, res, user){
	user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
	user['last_access'] = new Date();
	var cookies = new Cookies( req, res );
	cookies.set('auth', user['token'], { httpOnly: true });
}

function logout(req, res, url_parts){
	is_auth(req, res, function(user){
		db.collection('users', function(err, collection) {
			//Set auth token but don't send it back via the cookie
			user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
			user['last_access'] = new Date();
      syslog.send_message("Logout: " + user.email + " IP: " + req.connection.remoteAddress);
			collection.save(user);
			write_response_message(res, 200, "success");
		});
	});
}

function write_response_message(res, status_code, result){
	res.writeHead(status_code, {"Content-Type": "application/json"});
	res.write(JSON.stringify({"result": result}));
	res.end();
}

function is_auth(req, res, callback) {

	var cookies = new Cookies( req, res );
	var token = cookies.get('auth');

	if(!token){
    syslog.send_message("Expired or invalid token used. IP: " + req.connection.remoteAddress);
		write_response_message(res, 401, "auth_failed");
	} else {
		db.collection('users', function(err, collection) {
			collection.findOne({token: token}, function(err, user){
				if(!err && user){
					var url_parts = url.parse(req.url, true);
					if(user.force_password_change && url_parts.pathname != '/user/password') {
            syslog.send_message("User must change password: " + user.email + " IP: " + req.connection.remoteAddress);
						write_response_message(res, 200, "force_password_change2");
					} else {
						set_auth_token(req, res, user);
						collection.save(user);
						callback(user);
					}
				} else {
					if(err) console.log(err);
          syslog.send_message("Expired or invalid token used. IP: " + req.connection.remoteAddress);
					write_response_message(res, 401, "auth_failed");
				}
			});
		});
	}
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
		write_response_message(res, 405, "method_not_allowed");
	}
}

function is_valid_email(email) {
	return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/i.test(email);
}

function pop(dictionary, key){
	var e = dictionary[key];
	delete dictionary[key];
	return e;
}
