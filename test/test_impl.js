console.log('Using TEST DB.');

/******************************************************************
 *
 * Test Functions.
 *
 ******************************************************************/

var usersByEmail = {};
var usersByToken = {};
var messages = [];
var alertsByName = {};

addUser({email: 'admin', password: '$2a$10$NGZCj2oAbULoNtlG6n270es8X1.m2MzJchJiPiNooFX9qXM3U4Ss2'}); //password: admin
addUser({email: 'logo@example.com', password: '$2a$10$r3akC6vK4D7VtbWEUmpoMeC2tOHA5SaCPeBcPOknrDN5BgmlhYBHm'}); //password: password

function addUser(user) {
  usersByEmail[user.email] = user;
  usersByToken[user.token] = user;
}


/******************************************************************
 *
 * User Functions.
 *
 ******************************************************************/

function saveUser(user, callback) {
  addUser(user);
  callback(user);
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
  callback(alert);
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
  callback(alertsByName[names]);
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
  isAvailable: isAvailable
};
