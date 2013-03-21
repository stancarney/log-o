var bcrypt = require('bcrypt');
/******************************************************************
 * This is a data store implementation used for testing. It can
 * also be used as a blueprint to build alternate data store
 * implementations with the following exceptions:
 *
 * - In all cases (when in function parameters) callback is required.
 ******************************************************************/

/******************************************************************
 *
 * Test Functions. (Not required for new data store implementations)
 *
 ******************************************************************/

console.log('Using TEST DB.');

var usersByEmail;
var usersByToken;
var alertsByName;
var messages;

var bcrypt_admin = bcrypt.hashSync('admin', bcrypt.genSaltSync(10));
var bcrypt_password = bcrypt.hashSync('password', bcrypt.genSaltSync(10));

reset();

function reset() {
  usersByEmail = {};
  usersByToken = {};
  alertsByName = {};
  messages = [];

  saveUser({email: 'admin', password: bcrypt_admin, active: true, permissions: ['USER_ADD', 'USER_LIST', 'USER_EDIT', 'USER_RESET', 'ALERT_ADD', 'ALERT_LIST', 'ALERT_EDIT', 'SEARCH']});
  saveUser({email: 'logo@example.com', password: bcrypt_password, active: true, permissions: ['USER_ADD', 'USER_LIST', 'USER_EDIT', 'USER_RESET', 'ALERT_ADD', 'ALERT_LIST', 'ALERT_EDIT', 'SEARCH']});
}


/******************************************************************
 *
 * User Functions.
 *
 ******************************************************************/

function saveUser(user, callback) {
  usersByEmail[user.email] = user;
  usersByToken[user.token] = user;
  if (callback) callback(user);
}

function getUsers(callback) {
  var users = [];
  for (var i in usersByEmail) {
    users.push(usersByEmail[i]);
  }
  callback(users);
}

function getUserByToken(token, callback) {
  callback(usersByToken[token]);
}

function getUserByEmail(email, callback) {
  callback(usersByEmail[email]);
}

/******************************************************************
 *
 * Message Functions.
 *
 ******************************************************************/

function saveMessage(message, callback) {
  messages.push(message);
  callback(message);
}

function getMessages(queryString, callback) {
  callback(messages);
}

/******************************************************************
 *
 * Alert Functions.
 *
 ******************************************************************/

function saveAlert(alert, callback) {
  alertsByName[alert.name] = alert;
  if (callback) callback(alert);
}

function getAlerts(callback) {
  var alerts = [];
  for (var i in alertsByName) {
    alerts.push(alertsByName[i]);
  }
  callback(alerts);
}

function getActiveAlerts(callback) {
  var alerts = [];
  for (var i in alertsByName) {
    if (alertsByName[i].active) {
      alerts.push(alertsByName[i]);
    }
  }
  callback(alerts);
}

function getAlertByName(name, callback) {
  callback(alertsByName[name]);
}

/******************************************************************
 *
 * Utility Functions.
 *
 ******************************************************************/

/*
 * Returns a boolean stating if the db is available for read and write operations.
 */
function isAvailable() {
  return true;
}

module.exports = {
  saveUser: saveUser,
  getUsers: getUsers,
  getUserByToken: getUserByToken,
  getUserByEmail: getUserByEmail,
  saveMessage: saveMessage,
  getMessages: getMessages,
  saveAlert: saveAlert,
  getAlerts: getAlerts,
  getActiveAlerts: getActiveAlerts,
  getAlertByName: getAlertByName,
  isAvailable: isAvailable,

  //test functions
  reset: reset
};
