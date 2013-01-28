var config = require('./config.js');

var db = require('./db.js')
    , syslogParser = require('glossy').Parse
    , syslogProducer = require('glossy').Produce
    , glossy = new syslogProducer()
    , os = require('os')
    , crypto = require('crypto')
    , dgram  = require('dgram')
    , net = require('net')
    , microtime = require('microtime')
    , preprocessors = require('./preprocessors.js');

exports.save = function(rawMessage) {
  var now = microtime.now();
  try {
    //remove bash color chars and BEL characters. The #033 is there because sometimes the characters have already been escaped.
    rawMessage = rawMessage.replace(/(\x1B|#033)\[([0-9]{1,3}((;[0-9]{1,3})*)?)?[m|K]/g, '').replace(/(\x07|#007)/g, '');

    syslogParser.parse(rawMessage, function(parsed_message){
        db.collection('messages', function(err, collection) {
  
          collection.find({}, {'hash':1}).sort({_id:-1}).limit(1).toArray(function(err, last_message){
            if(!err && last_message){

              //This happens when the message could not be parsed. In that case we swap in the originalMessage
              if (parsed_message['message'] == undefined) {
                parsed_message['message'] = parsed_message['originalMessage'];
                console.log('Message could not be parsed: ' + parsed_message['originalMessage']);
              }

              for (var i in preprocessors.module_holder) {
                try {
                  parsed_message = preprocessors.module_holder[i](parsed_message);
                } catch (e) {
                  console.log('Preprocessor threw an exception. [' + preprocessors.module_holder[i] + '] ', e);
                }
              }

              //add additional parts first.
              parsed_message['timestamp'] = now;
              parsed_message['hostname'] = os.hostname();
              parsed_message['keywords'] = clean_keywords(parsed_message['message'].toLowerCase().split(' '));
              parsed_message['message_hash'] = crypto.createHash('sha1').update(parsed_message['message']).digest("hex");
              parsed_message['previous_hash'] = last_message[0] ? last_message[0].hash : '';
              parsed_message['hash'] = crypto.createHash('sha1').update(JSON.stringify(parsed_message)).digest("hex");

              collection.save(parsed_message);
            } else {
              console.log('Err', err);
            }
          });
        });
      });
    } catch(e) {
        console.log('Could not save message. [' + rawMessage + '] ', e);
    }
};

exports.send_message = function (message) {
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

function clean_keywords(array) {
  for (var i = array.length - 1; i >= 0; i--) {
    var punct = /^[^\d\w\s]+|[^\d\w\s]+$/g;
    if (array[i].match(punct, '')){
      array[i] = array[i].replace(punct, '');
    }

    if (array[i] === '') {
      array.splice(i, 1);
    }
  }
  return array;
}
