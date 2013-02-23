var http = require('http')
    , prompt = require('prompt')
    , moment = require('moment')
    , cliff = require('cliff')
    , fs = require('fs')
    , util = require('util')
    , querystring = require('querystring');

var EMAIL_SCHEMA = {
  required: true
};

var PASSWORD_SCHEMA = {
  hidden: true,
  required: true
};

var ALERT_NAME_SCHEMA = {
  pattern: /^[\w\d \-_]+$/,
  type: 'string',
  message: 'Name must be only letters, spaces, dashes or underscores.',
  required: true
};

var REGEX_SCHEMA = {
  required: true,
  before: function (value) {
    return value.test(' ');
  }
};

var REGEX_MODIFIERS_SCHEMA = {
  pattern: /^g?i?m?$/,
  required: false,
  before: function (value) {
    return value.split('').sort().join('');
  }
};

var REGEX_ENABLE_SCHEMA = {
  pattern: /^true$|false$/,
  required: false
};

var EMAIL_LIST_SCHEMA = {
  pattern: /^([a-z0-9._+]+@[a-z0-9]+\.[a-z]+,? ?)+$/i, //simple email matching
  required: true
};

if (process.argv.length < 3) {
  showHelp();
  process.exit(1);
}

var DEFAULT_LOG_SERVER_PORT = 8000;
var DEFAULT_LOG_SERVER = process.argv[2];
var TOKEN_FILE = process.env['HOME'] + '/.log-o.' + DEFAULT_LOG_SERVER;

switch (process.argv[3]) {
  case 'auth':
    auth();
    break;
  case 'useradd':
    userAdd();
    break;
  case 'userlist':
    userList();
    break;
  case 'reset':
    userReset();
    break;
  case 'passwd':
    changePassword();
    break;
  case 'logout':
    logout();
    break;
  case 'alertadd':
    alertAdd();
    break;
  case 'alertlist':
    alertList();
    break;
  case 'help':
    showHelp();
    break;
  case 'search':
    search(process.argv.slice(4));
    break;
  default:
    search(process.argv.slice(3));
}

function userAdd() {
  prompt.start();
  prompt.get(['email'], function (err, p) {
    logoRequest('/user/add', JSON.stringify({ email: p.email }));
  });
}

function userList() {
  var postData = JSON.stringify({ });
  logoRequest('/user/list', postData, function (result) {
    if (result && result.length > 0) {
      var rows = [
        ['Last Access'.bold, 'Email'.bold]
      ];
      for (var index in result) {
        var r = result[index];
        rows.push([moment(r['lastAccess']).format('MMM D YYYY, HH:mm:ss'), r['email']]);
      }
      util.puts(cliff.stringifyRows(rows));
    }
  });
}

function userReset() {
  prompt.start();
  prompt.get(['email'], function (err, p) {
    logoRequest('/user/reset', JSON.stringify({ email: p.email }));
  });
}

function changePassword() {
  prompt.start();
  prompt.get({
    properties: {
      newPassword: {
        hidden: true,
        required: true,
        description: 'new'
      },
      confirm: PASSWORD_SCHEMA
    }
  }, function (err, p) {
    if (p.newPassword != p.confirm) {
      util.puts('Passwords do not match!');
      return;
    }
    logoRequest('/user/password', JSON.stringify({ newPassword: p.newPassword }));
  });
}

function alertAdd() {
  prompt.start();
  prompt.get({
    properties: {
      name: ALERT_NAME_SCHEMA,
      regex: REGEX_SCHEMA,
      modifiers: REGEX_MODIFIERS_SCHEMA,
      recipients: EMAIL_LIST_SCHEMA,
      enable: REGEX_ENABLE_SCHEMA
    }
  }, function (err, p) {
    var postData = JSON.stringify({
      name: p.name,
      regex: p.regex,
      modifiers: p.modifiers,
      recipients: p.recipients,
      enable: p.enable
    });
    logoRequest('/alert/add', postData);
  });
}

function alertList() {
  logoRequest('/alert/list', JSON.stringify({ }), function (result) {
    if (result && result.length > 0) {
      var rows = [
        ['Date Added'.bold, 'Name'.bold, 'Regex'.bold, 'Modifiers'.bold, 'Recipients'.bold, 'Enable'.bold]
      ];
      for (var index in result) {
        var r = result[index];
        rows.push([moment(r['dateAdded']).format('MMM D YYYY, HH:mm:ss'), r['name'], r['regex'], r['modifiers'], r['recipients'], r['enable'] == true ? 'true'.green : 'false'.red]);
      }
      util.puts(cliff.stringifyRows(rows));
    }
  });
}

function auth() {
  prompt.start();
  prompt.get({
    properties: {
      email: EMAIL_SCHEMA,
      password: PASSWORD_SCHEMA
    }
  }, function (err, p) {
    var postData = JSON.stringify({
      email: p.email,
      password: p.password
    });

    logoRequest('/auth', postData, function (result) {
      if (result['result'] === 'force_password_change') {
        console.log('Password change required.');
        changePassword();
      }
    });
  });
}

function logout(args) {
  logoRequest('/logout', JSON.stringify({}));
}

function search(args) {
  withToken(function (token) {
    //Convert command line into query string matching q={query}&limit=N&skip=N etc...
    var qs = [];
    for (var i in args) {
      var q = args[i].split('=');
      if (q.length === 2) {
        qs[q[0]] = q[1];
      } else {
        //only 1 element, assume it is the value for q=
        qs['q'] = q[0];
      }
    }

    logoRequest('/search?' + querystring.stringify(qs), JSON.stringify({}), function (result) {
      for (var index in result) {
        var r = result[index];
        if (r['message']) {
          console.log('[' + moment(r['time']).format('MMM D YYYY, HH:mm:ss') + ' ' + r['facility'] + ' ' + r['severity'] + ']\t' + r['host'] + '   ' + r['message']);
        } else {
          console.log(r);
        }
      }
    });
  });
}

function showHelp() {
  console.log('node client.js <host(string)> <action({auth|useradd|userlist|reset|passwd|logout|alertadd|alertlist|help|search})> [<args(string)>]');
}

function saveToken(token) {
  fs.writeFile(TOKEN_FILE, token, function (err) {
    if (err) throw err;
  });
}

function withToken(callback) {
  if (fs.existsSync(TOKEN_FILE)) { //Sync call fine for client.js
    fs.readFile(TOKEN_FILE, function (err, token) {
      if (err) throw err;
      callback(token);
    });
  } else {
    callback();
  }
}

function logoRequest(path, postData, callback) {
  withToken(function (token) {
    var req = request({
      host: DEFAULT_LOG_SERVER,
      port: DEFAULT_LOG_SERVER_PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'Cookie': 'auth=' + token
      }
    }, function (result) {
      if (!callback) {
        console.log(result['result']);
      } else {
        callback(result);
      }
    });
    req.write(postData);
    req.end();
  });
}

function request(options, callback) {
  var response = '';
  var req = http.request(options, function (res) {
    if (res.headers['set-cookie']) saveToken(res.headers['set-cookie'].toString().split(/auth=(.*?);.*/)[1]);
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      response += chunk;
    });
    res.on('end', function () {
      var result = JSON.parse(response);
      if (!callback) {
        console.log(result['result']);
      } else {
        callback(result);
      }
      if (res.statusCode != 200) {
        console.log(res.statusCode);
        process.exit(1);
      }
    });
  });
  req.on('error', function (e) {
    console.log('Err ', e);
  });

  return req;
}
