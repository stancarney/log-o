/*
 * This ensures the DB is up before anything else has started...
 */
var db = require('./db.js');
var intervalId = setInterval(function ready() {
  if (db.isAvailable()) {
    console.log('Ready');
    clearInterval(intervalId);
    require('./server.js');
  } else {
    console.log('Waiting for DB.');
  }
}, 100);


