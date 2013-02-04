var config = require('./config.js')
    , db = require('./db.js')
    , email = require('./email.js')
    , password = require('password');

exports.add = function (email_address, callback) {
  if (email.is_valid_email(email_address)) {
    db.saveUser({email: email_address, password: password(3), force_password_change: true}, callback);
  } else {
    callback('invalid_email');
  }
};

//TODO: implement
exports.edit = function (name, regex, enable) {

};

//TODO: implement
exports.delete = function (id) {

};