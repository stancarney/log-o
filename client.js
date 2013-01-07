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
			var req = post_request({
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
		var req = post_request({
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
			var req = post_request({
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
			var req = post_request({
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

		var req = post_request({
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
		var req = post_request({
			host: log_server,
			port: log_server_port,
			path: '/logout',
			method: 'POST',
			headers: {
					'Content-Type': 'application/json',
					'Cookie': 'auth=' + token
				}
		});

		// write data to request body
		req.write('data\n');
		req.write('data\n');
		req.end();
	});
}

//TODO:Stan Flip to GET
function search(args){

	with_token(function(token){
		var req = post_request({
			host: log_server,
			port: 8000,
			path: '/search?' + args.join('&'),
			method: 'POST',
			headers: {
					'Content-Type': 'application/json',
					'Cookie': 'auth=' + token
				}
		}, function(result){
			for (var index in result){
				var r = result[index];
				console.log('[' + moment(r['timestamp']).format('MMM D YYYY, HH:mm:ss') + ' ' + r['facility'] + ' ' + r['severity'] + ']\t' + r['hash'] + '   ' + r['host'] + '   ' + r['message']);
			}
		});

		// write data to request body
		req.write('data\n');
		req.write('data\n');
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

function post_request(options, callback){
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
		console.log('Err ' + e);
	});

	return req;
}
