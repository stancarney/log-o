var config = require('./config.js');

var db = require('./db.js')
    , syslogParser = require('glossy').Parse
    , syslogProducer = require('glossy').Produce
    , glossy = new syslogProducer()
    , os = require('os')
    , crypto = require('crypto')
    , dgram  = require('dgram')
    , net = require('net')
    , microtime = require('microtime');

exports.save = function(rawMessage) {
  var now = microtime.now();
  try {
    //remove bash color chars and BEL characters. The #033 is there because sometimes the characters have already been escaped.
    rawMessage = rawMessage.replace(/(\x1B|#033)\[([0-9]{1,3}((;[0-9]{1,3})*)?)?[m|K]/g, '').replace(/(\x07|#007)/g, '');

    syslogParser.parse(rawMessage, function(parsedMessage){
        db.collection('messages', function(err, collection) {
  
          collection.find({}, {'hash':1}).sort({_id:-1}).limit(1).toArray(function(err, last_message){
            if(!err && last_message){

              //This happens when the message could not be parsed. In that case we swap in the originalMessage
              if (parsedMessage['message'] == undefined) {
                parsedMessage['message'] = parsedMessage['originalMessage'];
                console.log('Message could not be parsed: ' + parsedMessage['originalMessage']);
              }

              //add additional parts first.
              parsedMessage['timestamp'] = now;
              parsedMessage['hostname'] = os.hostname();
              parsedMessage['keywords'] = remove_occurrence(parsedMessage['message'].toLowerCase().split(' '), ' ');
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
    message: message + '\n'
  });
  bmsg = new Buffer(msg);

  if(config.get('tcp')){
    var client = new net.Socket();
    client.connect(config.get('tcp_port'), '0.0.0.0', function() {
      client.write(msg);
      client.destroy();
    });
  } else {
    var client = dgram.createSocket("udp4");
      client.send(bmsg, 0, bmsg.length, 5140, "0.0.0.0", function(err, bytes) {
        if(err) console.log("Could not log message: " + err);
        client.close();
      });
  }
}

function remove_occurrence (array, item){
  for (var i=array.length-1; i>=0; i--) {
      if (array[i] === item) {
          array.splice(i, 1);
      }
  }
}
