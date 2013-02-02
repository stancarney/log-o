var config = require('./config.js')
    , db = require('./db.js');

exports.add = function (name, regex, modifiers, recipients, enable, callback) {
  db.collection('alerts', function (err, collection) {
    console.log("name: " + name + " regex: " + regex + " enable: " + enable);
      //TODO: Validate regex
      if (modifiers) {
        modifiers = modifiers.split('').sort().join('');
      }
      var alert = {date_added: new Date(), name: name, regex: regex, modifiers: modifiers, recipients: recipients.replace(/\s/g, '').split(','), enable: enable || true};
      collection.save(alert);
      callback(alert);
  });
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

exports.check = function (message) {
  db.collection('alerts', function (err, collection) {
    collection.find({});
  });
};

function send (alert, message){

}
