var config = require('./config.js');

var db = require('./db.js')
    , syslogParser = require('glossy').Parse
    , syslogProducer = require('glossy').Produce
    , glossy = new syslogProducer()
    , os = require('os')
    , crypto = require('crypto')
    , dgram  = require('dgram')
    , net = require('net');

exports.save = function(rawMessage) {
  try {
    syslogParser.parse(rawMessage.toString('utf8', 0), function(parsedMessage){
        db.collection('messages', function(err, collection) {
  
          collection.find({}, {'hash':1}).sort({_id:-1}).limit(1).toArray(function(err, last_message){
            if(!err && last_message){
              //add additional parts first.
              parsedMessage['timestamp'] = new Date();
              parsedMessage['hostname'] = os.hostname();
              parsedMessage['keywords'] = parsedMessage['message'].toLowerCase().split(" ");
              parsedMessage['message_hash'] = crypto.createHash('sha1').update(parsedMessage['message']).digest("hex");
              parsedMessage['previous_hash'] = last_message[0] ? last_message[0].hash : '';
              parsedMessage['hash'] = crypto.createHash('sha1').update(JSON.stringify(parsedMessage)).digest("hex");
  
              collection.save(parsedMessage);
            } else {
              console.log('Err', err);
            }
          });
        });
      });
    } catch(e) {
        console.log('Could not save message. [' + rawMessage + '] ' + e);
    }
};

exports.send_message = function (message){
  var msg = glossy.produce({
    facility: 'local4',
    severity: 'info',
    host: os.hostname(),
    app_id: 'log-o',
    pid: process.id,
    date: new Date(),
    message: message
  });
  bmsg = new Buffer(msg);

  if(config.get('tcp')){
    var client = new net.Socket();
    client.connect(config.get('tcp_port'), '0.0.0.0', function() {
      console.log('TCP msg');
      client.write(msg);
      client.destroy();
    });
  } else {
    var client = dgram.createSocket("udp4");
      client.send(bmsg, 0, bmsg.length, 5140, "0.0.0.0", function(err, bytes) {
        if(err) console.log("Could not log message: " + err);
        console.log('UDP msg');
        client.close();
      });
  }
}
