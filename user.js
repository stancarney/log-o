var config = require('./config.js')
    , db = require('./db.js')
    , email = require('./email.js')
    , password = require('password');

exports.add = function (emailAddress, callback) {
  if (email.isValidEmail(emailAddress)) {
    db.saveUser({email: emailAddress, password: password(3), forcePasswordChange: true}, callback);
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