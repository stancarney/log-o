var services = require('../services')
    , db = require('../db.js')
    , url = require('url')
    , util = require('util');

module.exports.search = function (req, res, urlParts) {
  services.utils.isAuth(req, res, 'SEARCH', function (user) {
    var qs = urlParts.query || '';
    services.syslog.sendMessage(user.email + ' viewed the logs with: ' + util.inspect(qs).replace(/(\r\n|\n|\r)/gm, ""));
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