var assert = require('assert');

module.exports.init = function (mongodb, username, password) {
  mongodb.open(function (err, data) {
    if (data) {
      data.authenticate(username, password, function (err2, data2) {
        if (err2) console.log(err2);
        mongodb.collection('users', function (err, collection) {
          collection.ensureIndex({email: 1}, {unique: true}, function (err, result) {
            assert.equal(null, err);
          });
        });
        mongodb.collection('messages', function (err, collection) {
          collection.ensureIndex({time: -1, timestamp: -1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({keywords: 1, host: 1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({host: 1, severity: 1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({host: 1, facility: 1}, function (err, result) {
            assert.equal(null, err);
          });
        });
      });
    } else {
      console.log(err);
    }
  });
};

