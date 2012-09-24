var http = require('http')
	, prompt = require('prompt')
	, moment = require('moment')
	, fs = require('fs')
	, querystring = require('querystring');

var token_file = process.env['HOME'] + '/.log-o.token';

switch(process.argv[2]) {
	case 'auth':
    auth();
  break;
	case 'adduser':
    adduser();
  break;
	default:
    search(process.argv.slice(2));
}

function adduser(){
	prompt.start();
	prompt.get(['email', 'password'], function (err, result) {
		if (err) throw err;

		var post_data = JSON.stringify({
			email: result.email,
			password: result.password
		});

		with_token(function(token){
			var req = post_request({
				host: 'localhost',
				port: 8000,
				path: '/adduser',
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
	prompt.get(['email', 'password'], function (err, result) {
		if (err) throw err;

		var post_data = JSON.stringify({
			email: result.email,
			password: result.password
		});

		var req = post_request({
			host: 'localhost',
			port: 8000,
			path: '/auth',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length
			}
		});

		req.write(post_data);
		req.end();
	});
}

function search(args){

	with_token(function(token){
		var req = post_request({
			host: 'localhost',
			port: 8000,
			path: '/search?' + args.join('&'),
			method: 'POST',
			headers: {
					'Content-Type': 'application/json',
					'Cookie': 'auth=' + token
				}
		}, function(result){
			console.log('[' + moment(result['timestamp']).format('MMM D YYYY, HH:mm:ss') + ' ' + result['facility'] + ' ' + result['severity'] + ']     ' + result['hash'] + '   ' + result['host'] + '   ' + result['message']);
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
	var req = http.request(options, function(res) {
		//console.log('HEADERS: ' + JSON.stringify(res.headers));
		//console.log('CODE: ' + res.statusCode);

		if(res.headers['set-cookie']) save_token(res.headers['set-cookie'].toString().split(/auth=(.*?);.*/)[1]);
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			var result = JSON.parse(chunk);
			if(!callback) {
				console.log(result['result']);
			} else {
				callback(result);
			}
		});
	});

	req.on('error', function(e) {
		console.log('Err ' + e);
	});

	return req;
}