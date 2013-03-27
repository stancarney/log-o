var config = require('../config.js')
    , db = require('../db.js')
    , services = require('../services');

function add(req, res) {
  services.utils.parsePost(req, res, function () {
    services.utils.isAuth(req, res, 'ALERT_ADD', function (user) {
      var alertParams = {
        name: res.post['name'],
        host: res.post['host'],
        facility: res.post['facility'],
        severity: res.post['severity'],
        message: res.post['message'],
        modifiers: res.post['modifiers'],
        recipients: res.post['recipients'].replace(/\s/g, '').split(','),
        active: !!(res.post['active'] === 'true'),
        dateAdded: new Date()
      };

      if (alertParams.modifiers) {
        alertParams.modifiers = alertParams.modifiers.split('').sort().join('');  //TODO: Verify on gim is passed in!
      }

      db.getAlertByName(alertParams.name, function (alert) {
        if (alert) {
          services.utils.writeResponseMessage(res, 400, 'alert_already_exists');
          return;
        }

        db.saveAlert(alertParams, function (alert) {
          services.utils.writeResponseMessage(res, 200, 'success');
        });
      });
    });
  });
}

function list(req, res) {
  services.utils.isAuth(req, res, 'ALERT_LIST', function (user) {
    db.getAlerts(function (alerts) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(alerts));
      res.end();
    });
  });
}

function edit(req, res) {
  services.utils.parsePost(req, res, function () {
    services.utils.isAuth(req, res, 'ALERT_EDIT', function (user) {
      var alertParams = {
        name: res.post['name'],
        host: res.post['host'],
        facility: res.post['facility'],
        severity: res.post['severity'],
        message: res.post['message'],
        modifiers: res.post['modifiers'],
        recipients: res.post['recipients'].replace(/\s/g, '').split(','),
        active: !!(res.post['active'] === 'true'),
        dateAdded: new Date()};

      if (alertParams.modifiers) {
        alertParams.modifiers = alertParams.modifiers.split('').sort().join('');  //TODO: Verify on gim is passed in!
      }

      db.getAlertByName(alertParams.name, function (alert) {
        if (!alert) {
          services.utils.writeResponseMessage(res, 404, 'alert_does_not_exist');
          return;
        }

        for (var key in alertParams) {
          alert[key] = alertParams[key];
        }
        db.saveAlert(alert, function (alert) {
          services.utils.writeResponseMessage(res, 200, 'success');
        });
      });
    });
  });
}

module.exports = {
  add: add,
  list: list,
  edit: edit
};