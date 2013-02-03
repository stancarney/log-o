var config = require('./config.js')
    , db = require('./db.js')
    , email = require('./email.js')
    , password = require('password');

exports.add = function (email_address, callback) {
  if (email.is_valid_email(email_address)) {
    db.collection('users', function (err, collection) {
      collection.save({email: email_address, password: password(3), force_password_change: true}, {safe: true}, function (err, new_user) {
        callback(err, new_user);
      });
    });
  } else {
    callback('invalid_email');
  }
};

exports.edit = function (name, regex, enable) {
  db.collection('alerts', function (err, collection) {
    collection.find({});
  });
};

exports.delete = function (id) {
  db.collection('alerts', function (err, collection) {
    collection.find({});
  });
};

exports.list = function () {
  db.collection('alerts', function (err, collection) {
    collection.find({});
  });
};

exports.check = function (parsed_message) {
  db.collection('alerts', function (err, collection) {
    collection.find({enable: true}).sort({email: 1}).each(function (err, alert) {

      if (err) {
        console.log(err);
        return;
      }

      if (alert) {
        var regex = new RegExp(alert.regex, alert.modifiers || '');
        if (regex.test(parsed_message['originalMessage'])) {
          var emails = alert.recipients;
          for (var e in emails){
            email.send_alert(emails[e], alert, parsed_message);
          }
        }
      }
    });
  });
};

function send(alert, message) {

}
