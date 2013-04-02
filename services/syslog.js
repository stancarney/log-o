var config = require('../config.js')
    , db = require('../db.js')
    , routes = require('../routes')
    , services = require('./')
    , syslogParser = require('glossy').Parse
    , syslogProducer = require('glossy').Produce
    , glossy = new syslogProducer()
    , os = require('os')
    , crypto = require('crypto')
    , dgram = require('dgram')
    , net = require('net')
    , microtime = require('microtime');

exports.save = function (rawMessage) {
  try {
    //remove bash color chars and BEL characters. The #033 is there because sometimes the characters have already been escaped.
    rawMessage = rawMessage.replace(/(\x1B|#033)\[([0-9]{1,3}((;[0-9]{1,3})*)?)?[m|K]/g, '').replace(/(\x07|#007)/g, ''); //TODO: move into pre-processor?

    syslogParser.parse(rawMessage, function (parsedMessage) {
      //This happens when the message could not be parsed. In that case we swap in the originalMessage
      if (parsedMessage['message'] === undefined) {
        parsedMessage['message'] = parsedMessage['originalMessage'];
        console.log('Message could not be parsed: ' + parsedMessage['originalMessage']);
      }

      for (var i in services.preprocessors.moduleHolder) {
        try {
          parsedMessage = services.preprocessors.moduleHolder[i](parsedMessage);
        } catch (e) {
          console.log('Preprocessor threw an exception. [' + preprocessors.moduleHolder[i] + '] ', e);
        }
      }

      parsedMessage['timestamp'] = microtime.now(); //microseconds used to sort
      parsedMessage['hostname'] = os.hostname();

      db.saveMessage(parsedMessage, function (message) {
        if (message) {
          services.alert.check(parsedMessage);
        } else {
          console.log('Message was not saved.');
        }
      });
    });
  } catch (e) {
    console.log('Could not save message. [' + rawMessage + '] ', e);
  }
};

exports.sendMessage = function (message) {
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

  var client;
  if (config.get('tcp')) {
    client = new net.Socket();
    client.connect(config.get('tcp_port'), '0.0.0.0', function () {
      client.write(msg);
      client.destroy();
    });
  } else {
    client = dgram.createSocket('udp4');
    client.send(bmsg, 0, bmsg.length, 5140, '0.0.0.0', function (err, bytes) {
      if (err) console.log('Could not log message: ' + err);
      client.close();
    });
  }
};
