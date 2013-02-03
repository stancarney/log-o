var http = require('http')
	, prompt = require('prompt')
	, moment = require('moment')
	, fs = require('fs')
	, querystring = require('querystring');

var log_server = 'localhost';
var log_server_port = 8000;

var token_file = process.env['HOME'] + '/.log-o.token';

var email_schema = {
	required: true
};

var password_schema = {
	hidden: true,
	required: true
};

var alert_name_schema = {
  pattern: /^[\w\d \-_]+$/,
  type: 'string',
  message: 'Name must be only letters, spaces, dashes or underscores.',
  required: true
};

var regex_schema = {
  required: true,
  before: function(value) { return value.test(' '); }
};

var regex_modifiers_schema = {
  pattern: /^g?i?m?$/,
  required: false,
  before: function(value) { return value.split('').sort().join(''); }
};

var regex_enable_schema = {
  pattern: /^true$|false$/,
  required: false
};

var email_list_schema = {
  pattern: /^([a-z0-9._+]+@[a-z0-9]+\.[a-z]+,? ?)+$/i, //simple email matching
  required: true
};

switch(process.argv[2]) {
	case 'auth':
    auth();
  break;
	case 'useradd':
    user_add();
  break;
	case 'userlist':
    user_list();
  break;
	case 'reset':
    user_reset();
  break;
	case 'passwd':
    change_password();
  break;
  case 'alertadd':
      alert_add();
    break;
	case 'logout':
    logout();
  break;
	default:
    search(process.argv.slice(2));
}

function user_add(){
	prompt.start();
	prompt.get(['email'], function (err, p) {
		var post_data = JSON.stringify({
			email: p.email
		});

		with_token(function(token){
			var req = request({
				host: log_server,
				port: log_server_port,
				path: '/user/add',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': post_data.length,
					'Cookie': 'auth=' + token
				}
			});

			req.write(post_data);
			req.end();
		});
	});
}

function user_list(){
	var post_data = JSON.stringify({ });

	with_token(function(token){
		var req = request({
			host: log_server,
			port: log_server_port,
			path: '/user/list',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length,
				'Cookie': 'auth=' + token
			}
		}, function(result){
			for (var index in result){
				var r = result[index];
				console.log(moment(r['last_access']).format('MMM D YYYY, HH:mm:ss') + '\t' + r['email']);
			}
		});

		req.write(post_data);
		req.end();
	});
}

function user_reset(){
	prompt.start();
	prompt.get(['email'], function (err, p) {
		var post_data = JSON.stringify({
			email: p.email
		});

		with_token(function(token){
			var req = request({
				host: log_server,
				port: log_server_port,
				path: '/user/reset',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': post_data.length,
					'Cookie': 'auth=' + token
				}
			});

			req.write(post_data);
			req.end();
		});
	});
}

function change_password(){
	prompt.start();
	prompt.get({
		properties: {
			new_password: {
				hidden: true,
				required: true,
				description: 'new'
			},
			confirm: password_schema
		}
	}, function (err, p) {

		//TODO:Stan validate new and old match

		var post_data = JSON.stringify({
			new_password: p.new_password
		});

		with_token(function(token){
			var req = request({
				host: log_server,
				port: log_server_port,
				path: '/user/password',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': post_data.length,
					'Cookie': 'auth=' + token
				}
			});

			req.write(post_data);
			req.end();
		});
	});
}

function alert_add(){
  prompt.start();
  	prompt.get({
  		properties: {
  			name: alert_name_schema,
  			regex: regex_schema,
        modifiers: regex_modifiers_schema,
        recipients: email_list_schema,
        enable: regex_enable_schema
  		}
  	}, function (err, p) {
  		var post_data = JSON.stringify({
  			name: p.name,
        regex: p.regex,
        modifiers: p.modifiers,
        recipients: p.recipients,
        enable: p.enable
  		});

		with_token(function(token){
			var req = request({
				host: log_server,
				port: log_server_port,
				path: '/alert/add',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': post_data.length,
					'Cookie': 'auth=' + token
				}
			});

			req.write(post_data);
			req.end();
		});
	});
}

function auth(){
	prompt.start();
	prompt.get({
		properties: {
			email: email_schema,
			password: password_schema
		}
	}, function (err, p) {
		var post_data = JSON.stringify({
			email: p.email,
			password: p.password
		});

		var req = request({
			host: log_server,
			port: log_server_port,
			path: '/auth',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length
			}
		}, function(result){
			if(result['result'] == 'force_password_change'){
				console.log("Password change required.");
				change_password();
			}
		});

		req.write(post_data);
		req.end();
	});
}

function logout(args){

	with_token(function(token){
		var req = request({
			host: log_server,
			port: log_server_port,
			path: '/logout',
			headers: {
					'Content-Type': 'application/json',
					'Cookie': 'auth=' + token
				}
		});
		req.end();
	});
}

function search(args){
	with_token(function(token){
		var req = request({
			host: log_server,
			port: 8000,
			path: '/search?q=' + encodeURIComponent(args.join(' ')),
			headers: {
					'Content-Type': 'application/json',
					'Cookie': 'auth=' + token
				}
		}, function(result){
			for (var index in result){
				var r = result[index];
        if(r['message']){
          console.log('[' + moment(r['time']).format('MMM D YYYY, HH:mm:ss') + ' ' + r['facility'] + ' ' + r['severity'] + ']\t' + r['host'] + '   ' + r['message']);
        } else {
          console.log(r);
        }
			}
		});
		req.end();
	});
}

function save_token(token) {
	fs.writeFile(token_file, token, function(err) {
		if (err) throw err;
	});
}

function with_token(callback){
	fs.readFile(token_file, function (err, token) {
    if (err) throw err;
    callback(token);
	});
}

function request(options, callback){
	var response = '';
	var req = http.request(options, function(res) {
		if(res.headers['set-cookie']) save_token(res.headers['set-cookie'].toString().split(/auth=(.*?);.*/)[1]);
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			response += chunk;
		});
		res.on('end', function(){
			var result = JSON.parse(response);
			if(!callback) {
				console.log(result['result']);
			} else {
				callback(result);
			}
			if(res.statusCode != 200) {
				console.log(res.statusCode);
				process.exit(1);
			}
		});
	});
	req.on('error', function(e) {
		console.log('Err ', e);
	});

	return req;
}
