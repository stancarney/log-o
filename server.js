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
		, email = require('./email.js')
    , alert = require('./alert.js')
    , user = require('./user.js');

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
    case '/alert/add':
      alert_add(req, res, url_parts);
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
	parse_post(req, res, function() {
    db.getUserByEmailAndPassword(res.post['email'], res.post['password'], function (user) {
      if (user) {
        set_auth_token(req, res, user);
        db.saveUser(user, function (user) {
          if (user.force_password_change) {
            syslog.send_message("Successful Login (force password change): " + res.post['email'] + " IP: " + req.connection.remoteAddress);
            write_response_message(res, 200, "force_password_change");
          } else {
            syslog.send_message("Successful Login: " + res.post['email'] + " IP: " + req.connection.remoteAddress);
            write_response_message(res, 200, "success");
          }
        });
      } else {
        syslog.send_message("Failed Login: " + res.post['email'] + " IP: " + req.connection.remoteAddress);
        write_response_message(res, 401, "auth_failed");
      }
    });
  });
}

function user_add(req, res, url_parts){
	parse_post(req, res, function(){
    is_auth(req, res, function (auth_user) {
      //TODO: check perms
      user.add(res.post['email'], function(new_user) {
        syslog.send_message("User added: " + res.post['email'] + " by: " + auth_user.email + " IP: " + req.connection.remoteAddress);
        email.send_welcome(new_user.email, new_user.password);
        write_response_message(res, 200, "success");
      });
    });
	});
}

function user_list(req, res, url_parts){
  is_auth(req, res, function (user) {
    db.getUsers(function (users) {
      if (users) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(users));
        res.end();
      } else {
        console.log('No Users?!?!');
      }
    });
  });
}

function user_reset(req, res, url_parts){
  parse_post(req, res, function () {
    is_auth(req, res, function (user) {
      db.getUserByEmail(res.post['email'], function (reset_user) {
        if (!err && reset_user) {
          reset_user.force_password_change = true;
          reset_user.password = password(3);
          syslog.send_message("User reset: " + reset_user.email + " by: " + user.email + " IP: " + req.connection.remoteAddress);
          email.send_welcome(reset_user.email, reset_user.password);
          db.saveUser(reset_user, function(user){
            if (user) {
              write_response_message(res, 200, "success");
            } else {
              write_response_message(res, 500, "could_not_save_user");
            }
          });
        } else {
          write_response_message(res, 404, "user_not_found");
        }
      });
    });
  });
}

function change_password(req, res, url_parts) {
  parse_post(req, res, function () {
    is_auth(req, res, function (user) {
      user.password = res.post['new_password'];
      user.force_password_change = false;
      syslog.send_message("Successful Password Change: " + user.email + " IP: " + req.connection.remoteAddress);
      db.saveUser(user, function (user) {
        if (user) {
          write_response_message(res, 200, "success");
        } else {
          write_response_message(res, 500, "could_not_reset_user");
        }
      });
    });
  });
}

function alert_add(req, res, url_parts) {
  parse_post(req, res, function () {
    is_auth(req, res, function (user) {
      //TODO: check perms
      alert.add(res.post['name'], res.post['regex'], res.post['modifiers'], res.post['recipients'], res.post['enable'], function (alert) {
        write_response_message(res, 200, "success");
      });
    });
  });
}

function search(req, res, url_parts) {
  is_auth(req, res, function (user) {
    syslog.send_message(user.email + ' viewed the logs with: ' + url_parts.query['q'].toString());
    db.getMessages(url_parts.query['q'], function (messages) {
      res.writeHead(200, {"Content-Type": "application/json"});
      if (messages) {
        res.write(JSON.stringify(messages.reverse())); // This kind of sucks. In order to reverse the Cursor we have to load it all in memory.
        res.end();
      } else {
        write_response_message(res, 400, "bad_request");
      }
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
    //Set auth token but don't send it back via the cookie
    user['token'] = crypto.randomBytes(Math.ceil(256)).toString('base64');
    user['last_access'] = new Date();
    syslog.send_message("Logout: " + user.email + " IP: " + req.connection.remoteAddress);
    db.saveUser(user, function (user) {
      if (user){
        write_response_message(res, 200, "success");
      } else {
        write_response_message(res, 500, "could_not_logout");
      }
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
    db.getUserByToken(token, function (user) {
      if (user) {
        var url_parts = url.parse(req.url, true);
        if (user.force_password_change && url_parts.pathname != '/user/password') {
          syslog.send_message("User must change password: " + user.email + " IP: " + req.connection.remoteAddress);
          write_response_message(res, 200, "force_password_change2");
        } else {
          set_auth_token(req, res, user);
          db.saveUser(user, function (user) {
            callback(user);
          });
        }
      } else {
        syslog.send_message("Expired or invalid token used. IP: " + req.connection.remoteAddress);
        write_response_message(res, 401, "auth_failed");
      }
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
