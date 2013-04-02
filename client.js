var http = require('http')
    , prompt = require('prompt')
    , moment = require('moment')
    , cliff = require('cliff')
    , fs = require('fs')
    , util = require('util')
    , querystring = require('querystring')
    , io = require('socket.io-client');

//TODO:Stan unit test the rest of the app
//TODO:Stan allow for HTTPS client calls

var ALL_PERMISSIONS = ['USER_ADD', 'USER_LIST', 'USER_EDIT', 'USER_RESET', 'ALERT_ADD', 'ALERT_LIST', 'ALERT_EDIT', 'SEARCH'].sort();

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

var REGEX_MODIFIERS_SCHEMA = {
  pattern: /^g?i?m? ?$/,
  required: false,
  before: function (value) {
    return value.split('').sort().join('');
  }
};

var ACTIVE_SCHEMA = {
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
  case 'useredit':
    userEdit();
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
  case 'alertedit':
    alertEdit();
    break;
  case 'help':
    showHelp();
    break;
  case 'search':
    search(process.argv.slice(4));
    break;
  case 'tail':
    tail(process.argv.slice(4));
    break;
  default:
    search(process.argv.slice(3));
}

function userAdd() {
  prompt.start();
  prompt.get(['email'], function (err, p) {
    request('/user/add', JSON.stringify({ email: p.email }));
  });
}

function userList(callback) {
  var postData = JSON.stringify({ });
  request('/user/list', postData, function (result) {
    var users = [];
    if (result && result.length > 0) {
      var rows = [
        ['Email'.bold, 'Active'.bold, 'Last Access'.bold, 'Permissions'.bold]
      ];
      for (var index in result) {
        var r = result[index];
        rows.push([r['email'], r['active'], moment(r['lastAccess']).format('MMM D YYYY, HH:mm:ss'), r['permissions'].sort()]);
        users[r['email']] = r;
      }
      util.puts(cliff.stringifyRows(rows));
      if (callback) callback(users);
    }
  });
}

function userEdit() {
  userList(function (users) {
    prompt.start();
    prompt.get({
      properties: {
        email: {
          required: true,
          conform: function (value) {
            return value in users;
          },
          message: util.format('Valid options: %s', Object.keys(users))
        }
      }
    }, function (err, p) {

      var user = users[p.email];
      ACTIVE_SCHEMA.default = user.active;
      var permissions = {};
      for (var i in ALL_PERMISSIONS) {
        var perm = ALL_PERMISSIONS[i];
        permissions[perm] = {};
        permissions[perm].name = perm;
        permissions[perm].default = user.permissions.indexOf(perm) < 0 ? 'n' : 'y';
        permissions[perm].pattern = /^[YNyn]?$/;
        permissions[perm].message = 'Enable: y/n';
      }
      prompt.get({
        properties: {
          email: {
            required: true,
            default: user.email
          },
          active: ACTIVE_SCHEMA,
          permissions: {
            properties: permissions
          }
        }
      }, function (err, p) {

        var permissions = [];
        var yes = /^[Yy]?$/;
        for (var i in p.permissions) {
          if (yes.test(p.permissions[i])) {
            permissions.push(i);
          }
        }
        var postData = JSON.stringify({
          email: p.email,
          active: p.active,
          permissions: permissions
        });
        request('/user/edit', postData);
      });
    });
  });
}

function userReset() {
  prompt.start();
  prompt.get(['email'], function (err, p) {
    request('/user/reset', JSON.stringify({ email: p.email }));
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
    request('/user/password', JSON.stringify({ newPassword: p.newPassword }));
  });
}

function alertAdd() {
  var regexSchema = {
    required: false,
    before: validateRegex
  };
  prompt.start();
  prompt.get({
    properties: {
      name: ALERT_NAME_SCHEMA,
      host: regexSchema,
      facility: regexSchema,
      severity: regexSchema,
      message: regexSchema,
      modifiers: REGEX_MODIFIERS_SCHEMA,
      recipients: EMAIL_LIST_SCHEMA,
      active: ACTIVE_SCHEMA
    }
  }, function (err, p) {

    if (!p.host && !p.facility && !p.severity && !p.message) {
      console.log('One of [host|facility|severity|message] required.');
      return;
    }

    var postData = JSON.stringify({
      name: p.name,
      host: p.host,
      facility: p.facility,
      severity: p.severity,
      message: p.message,
      modifiers: p.modifiers,
      recipients: p.recipients,
      active: p.active
    });
    request('/alert/add', postData);
  });
}

function alertList(callback) {
  request('/alert/list', JSON.stringify({ }), function (result) {
    var alerts = [];
    if (result && result.length > 0) {
      var rows = [
        ['Name'.bold, 'Date Added'.bold, 'Host'.bold, 'Facility'.bold, 'Severity'.bold, 'Message'.bold, 'Modifiers'.bold, 'Recipients'.bold, 'Active'.bold]
      ];
      for (var index in result) {
        var r = result[index];
        rows.push([r['name'], moment(r['dateAdded']).format('MMM D YYYY, HH:mm:ss'), r['host'], r['facility'], r['severity'], r['message'], r['modifiers'], r['recipients'], r['active'] == true ? 'true'.green : 'false'.red]);
        alerts[r['name']] = r;
      }
      util.puts(cliff.stringifyRows(rows));
      if (callback) callback(alerts);
    }
  });
}

function alertEdit() {
  alertList(function (alerts) {
    ALERT_NAME_SCHEMA.conform = function (value) {
      return value in alerts;
    };
    ALERT_NAME_SCHEMA.message = util.format('Valid options: %s', Object.keys(alerts));
    prompt.start();
    prompt.get({
      properties: {
        name: ALERT_NAME_SCHEMA
      }
    }, function (err, p) {
      var alert = alerts[p.name];
      ALERT_NAME_SCHEMA.default = alert.name;
      REGEX_MODIFIERS_SCHEMA.default = alert.modifiers;
      EMAIL_LIST_SCHEMA.default = alert.recipients;
      ACTIVE_SCHEMA.default = alert.active;
      prompt.get({
        properties: {
          name: ALERT_NAME_SCHEMA,
          host: {
            required: false,
            before: validateRegex,
            default: alert.host
          },
          facility: {
            required: false,
            before: validateRegex,
            default: alert.facility
          },
          severity: {
            required: false,
            before: validateRegex,
            default: alert.severity
          },
          message: {
            required: false,
            before: validateRegex,
            default: alert.message
          },
          modifiers: REGEX_MODIFIERS_SCHEMA,
          recipients: EMAIL_LIST_SCHEMA,
          active: ACTIVE_SCHEMA
        }
      }, function (err, p) {
        var postData = JSON.stringify({
          name: p.name,
          host: p.host.replace(/^\s$/, ''),
          facility: p.facility.replace(/^\s$/, ''),
          severity: p.severity.replace(/^\s$/, ''),
          message: p.message.replace(/^\s$/, ''),
          modifiers: p.modifiers.replace(/^\s$/, ''),
          recipients: p.recipients,
          active: p.active
        });
        request('/alert/edit', postData);
      });
    });
  });
}

function auth() {
  prompt.start();
  prompt.get({
    properties: {
      email: {
        required: true
      },
      password: PASSWORD_SCHEMA
    }
  }, function (err, p) {
    var postData = JSON.stringify({
      email: p.email,
      password: p.password
    });

    request('/auth', postData, function (result) {
      if (result['result'] === 'force_password_change') {
        util.puts('Password change required.');
        changePassword();
      }
    });
  });
}

function logout(args) {
  request('/logout', JSON.stringify({}));
}

function search(args) {
  withToken(function (token) {
    var qs = parseArgs(args);

    request('/search?' + querystring.stringify(qs), JSON.stringify({}), function (result) {
      for (var index in result) {
        var r = result[index];
        printRecord(r);
      }
    });
  });
}

function tail(args) {
  withToken(function (token) {
    var qs = parseArgs(args);
    var tokenStr = token ? token.toString() : '';

    var socket = io.connect('http://' + DEFAULT_LOG_SERVER + ':' + DEFAULT_LOG_SERVER_PORT);

    socket.on('data', function (r) {
      printRecord(r);
    });

    socket.on('error', function (err) {
      console.log(err);
      process.exit(1);
    });

    socket.emit('tail', tokenStr, qs);
  });
}

function showHelp() {
  util.puts('node client.js <host(string)> <action({auth|useradd|userlist|reset|passwd|logout|alertadd|alertlist|help|search|tail})> [<args(string)>]');
}

function parseArgs(args) {
  var qs = {};
  for (var i in args) {
    var q = args[i].split('=');
    if (q.length === 2) {
      qs[q[0]] = q[1];
    } else {
      //only 1 element, assume it is the value for q=
      qs['q'] = q[0];
    }
  }
  return qs;
}

function printRecord(r) {
  if (r['message']) {
    util.puts('[' + moment(r['time']).format('MMM D YYYY, HH:mm:ss') + ' ' + r['facility'] + ' ' + r['severity'] + ']\t' + r['host'] + '   ' + r['message']);
  } else {
    util.puts(r);
  }
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

function request(path, postData, callback) {
  withToken(function (token) {
    var options = {
      host: DEFAULT_LOG_SERVER,
      port: DEFAULT_LOG_SERVER_PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'Cookie': 'auth=' + token
      }
    };

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
          util.puts(result['result']);
        } else {
          callback(result);
        }
        if (res.statusCode != 200) {
          process.exit(1);
        }
      });
    });
    req.on('error', function (e) {
      console.log('Err ', e);
    });
    req.write(postData);
    req.end();
  });
}

function validateRegex(value) {
  new RegExp(value); //compile regex to see if it is valid.
  return value
}
