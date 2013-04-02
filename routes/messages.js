var services = require('../services')
    , db = require('../db.js')
    , util = require('util');

module.exports.search = function (req, res, urlParts) {
  services.utils.isAuth(req, res, 'SEARCH', function (user) {
    var qs = urlParts.query || '';
    services.syslog.sendMessage(user.email + ' searched the logs with: ' + util.inspect(qs).replace(/(\r\n|\n|\r)/gm, ""));
    db.getMessages(qs, function (messages) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      if (messages) {
        res.write(JSON.stringify(messages.reverse())); // This kind of sucks. In order to reverse the Cursor we have to load it all in memory.
        res.end();
      } else {
        services.utils.writeResponseMessage(res, 400, 'bad_request');
      }
    });
  });
};

module.exports.tail = function (socket, args, callback) {
  services.utils.isAuthWebSocket(socket, 'SEARCH', function (user) {
    var qs = args || '';
    services.syslog.sendMessage(user.email + ' tailed the logs with: ' + util.inspect(qs).replace(/(\r\n|\n|\r)/gm, ""));
    db.tailMessages(qs, function (message) {
      callback(message);
    });
    socket.on('disconnect', function () {
      services.syslog.sendMessage(user.email + ' stopped tailing the logs.');
    });
  });
};