var assert = require('assert')
    , crypto = require('crypto');

var db = null;

module.exports.init = function (mongodb, username, password) {
  mongodb.open(function (err, data) {
    if (data) {
      data.authenticate(username, password, function (err2, data2) {
        if (err2) throw new Error(err2);
        db = mongodb;

        //Create a 512KB collection in which to tail messages from.
        db.createCollection('tailmessages', {w: 1, capped: true, size: 512000}, function (err, collection) {
          assert.equal(null, err);
        });
        db.collection('users', function (err, collection) {
          collection.ensureIndex({email: 1}, {unique: true}, function (err, result) {
            assert.equal(null, err);
          });
        });
        db.collection('alerts', function (err, collection) {
          collection.ensureIndex({name: 1}, {unique: true}, function (err, result) {
            assert.equal(null, err);
          });
        });
        db.collection('messages', function (err, collection) {
          collection.ensureIndex({time: -1, timestamp: -1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({host: 1, time: -1, timestamp: -1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({host: 1, severity: 1, time: -1, timestamp: -1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({host: 1, facility: 1, time: -1, timestamp: -1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({severity: 1, time: -1, timestamp: -1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({facility: 1, time: -1, timestamp: -1}, function (err, result) {
            assert.equal(null, err);
          });
          collection.ensureIndex({message: 1, time: -1, timestamp: -1}, function (err, result) {
            assert.equal(null, err);
          });
        });
      });
    } else {
      throw new Error(err);
    }
  });
};

/******************************************************************
 *
 * User Functions.
 *
 ******************************************************************/

module.exports.saveUser = function (user, callback) {
  saveDocument('users', user, function (err, user) {
    if (!callback) {
      throw new Error('Callback function is required for saveUser!');
    }
    callback(user);
  });
};

module.exports.getUsers = function (callback) {
  findDocuments('users', {}, function (users) {
    callback(users);
  });
};

module.exports.getUserByToken = function (token, callback) {
  findOneDocument('users', {token: token}, function (user) {
    callback(user);
  });
};

module.exports.getUserByEmail = function (email, callback) {
  findOneDocument('users', {email: email}, function (user) {
    callback(user);
  });
};

/******************************************************************
 *
 * Message Functions.
 *
 ******************************************************************/

module.exports.saveMessage = function (message, callback) {
  saveDocument('messages', message, function (err, message) {
    if (err) throw new Error('Could not save message:', err);
    if (!callback) throw new Error('Callback function is required for saveMessage!');
    saveDocument('tailmessages', message, function (err, message) {
      if (err) throw new Error('Could not save tailmessage:', err);
      callback(message);
    });
  });
};

module.exports.getMessages = function (queryString, callback) {
  db.collection('messages', function (err, collection) {
    if (err) {
      throw new Error(err);
    }

    var args = null;
    try {
      args = JSON.parse(queryString['q']);
    } catch (e) {
      args = {};
    }

    var query = collection.find(args).sort({time: -1, timestamp: -1});
    var skip = pop(queryString, 'skip');
    var limit = pop(queryString, 'limit');

    if (skip) query = query.skip(parseInt(skip));
    if (limit) {
      query = query.limit(parseInt(limit));
    } else {
      query = query.limit(100);
    }

    var messages = [];
    query.each(function (err, message) {
      if (!err && message) {
        messages.push(message); // This kind of sucks. In order to reverse the Cursor we have to load it all in memory.
      } else {
        callback(messages);
      }
    });
  });
};

module.exports.tailMessages = function (queryString, callback) {
  db.collection('tailmessages', function (err, collection) {
    if (err) {
      throw new Error(err);
    }

    collection.isCapped(function (err, capped) {
      if (err) {
        throw new Error(err);
      }

      if (capped) {
        var args = null;
        try {
          args = JSON.parse(queryString['q']);
        } catch (e) {
          args = {};
        }

        //initial query to get the last record matching the criteria
        var query = collection.find(args).sort({_id: -1}).limit(1);
        query.each(function (err, message) {
          if (err) {
            throw new Error(err);
          }

          if (message) {
            args._id = { $gt: message._id };
            var tailableQuery = collection.find(args, {tailable: true}).sort({time: -1, timestamp: -1});
            tailableQuery.each(function (err, tailMessage) {
              callback(tailMessage);
            });
          }
        });
      } else {
        throw new Error('messages needs to be a capped collection for tail to work!');
      }
    });
  });
};

/******************************************************************
 *
 * Alert Functions.
 *
 ******************************************************************/

module.exports.saveAlert = function (alert, callback) {
  saveDocument('alerts', alert, function (err, alert) {
    if (!callback) {
      throw new Error('Callback function is required for saveAlert!');
    }
    callback(alert);
  });
};

module.exports.getAlerts = function (callback) {
  findDocuments('alerts', {}, function (alerts) {
    callback(alerts);
  });
};

module.exports.getActiveAlerts = function (callback) {
  db.collection('alerts', function (err, collection) {
    var alerts = [];
    collection.find({active: true}).sort({email: 1}).toArray(function (err, alerts) {
      if (err) {
        throw new Error(err);
      }
      callback(alerts);
    });
  });
};

module.exports.getAlertByName = function (name, callback) {
  findOneDocument('alerts', {name: name}, function (alert) {
    if (!callback) {
      throw new Error('Callback function is required for saveAlert!');
    }
    callback(alert);
  });
};

/******************************************************************
 *
 * Utility Functions.
 *
 ******************************************************************/

/*
 * Returns a boolean stating if the db is available for read and write operations.
 */
module.exports.isAvailable = function isAvailable() {
  return db && db.serverConfig.isConnected();
};

function findOneDocument(collectionName, args, callback) {
  db.collection(collectionName, function (err, collection) {
    collection.findOne(args, function (err, entity) {
      if (err) {
        console.log('Could not find document: ' + args, err);
        callback();
        return
      }
      callback(entity);
    });
  });
}

function findDocuments(collectionName, args, callback) {
  db.collection(collectionName, function (err, collection) {
    var entities = [];
    collection.find(args).each(function (err, entity) {
      if (err) {
        callback(entities);
        return
      }

      if (entity) {
        entities.push(entity);
      } else {
        callback(entities);
      }
    });
  });
}

function saveDocument(collectionName, document, callback) {
  db.collection(collectionName, function (err, collection) {
    collection.save(document, {safe: true}, function (err, entity) {
      if (entity === 1) {
        callback(err, document);
      } else {
        callback(err, entity);
      }
    });
  });
}

function pop(dictionary, key) {
  var e = dictionary[key];
  delete dictionary[key];
  return e;
}

