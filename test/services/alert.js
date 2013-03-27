var rewire = require('rewire')
    , assert = require('assert')
    , test_impl = require('../../db/test_impl.js');

describe('Alert', function () {
  process.env['db_init'] = './db/test_impl.js'; //referenced from project root
  var alert = rewire('../../services/alert.js');

  var email = null;
  var parsedMessage = {
    originalMessage: '<166>1 2013-03-21T21:51:12.866-06:00 Rain-Fluff.local - - - - User List: admin IP: 127.0.0.1',
    prival: 166,
    facilityID: 20,
    severityID: 6,
    facility: 'local4',
    severity: 'info',
    time: new Date(),
    host: 'localhost',
    appName: null,
    pid: null,
    msgID: null,
    message: 'User List: admin IP: 127.0.0.1',
    timestamp: 1363902672867467,
    hostname: 'logoserver01'
  };

  afterEach(function (done) {
    test_impl.reset();
    done();
  });

  describe('#check()', function () {
    it('should send alert email, host matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: 'localhost',
        facility: '',
        severity: '',
        message: '',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.equal(email, 'alert@example.com');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, true);
          done();
        });
      });
    });
    it('should send alert email, host matched, insensitive', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: 'loCalHost',
        facility: '',
        severity: '',
        message: '',
        modifiers: 'i',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.equal(email, 'alert@example.com');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, true);
          done();
        });
      });
    });
    it('should send alert email, host not matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: 'otherhost',
        facility: '',
        severity: '',
        message: '',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.fail('Alert should not have matched!');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, false);
          done();
        });
      });
    });
    it('should send alert email, facility matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: '',
        facility: 'local4',
        severity: '',
        message: '',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.equal(email, 'alert@example.com');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, true);
          done();
        });
      });
    });
    it('should send alert email, facility not matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: '',
        facility: 'local7',
        severity: '',
        message: '',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.fail('Alert should not have matched!');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, false);
          done();
        });
      });
    });
    it('should send alert email, severity matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: '',
        facility: '',
        severity: 'info',
        message: '',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.equal(email, 'alert@example.com');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, true);
          done();
        });
      });
    });
    it('should send alert email, severity not matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: '',
        facility: '',
        severity: 'error',
        message: '',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.fail('Alert should not have matched!');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, false);
          done();
        });
      });
    });
    it('should send alert email, message matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: '',
        facility: '',
        severity: '',
        message: '^User.*$',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.equal(email, 'alert@example.com');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, true);
          done();
        });
      });
    });
    it('should send alert email, message not matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: '',
        facility: '',
        severity: '',
        message: '^SSHD.*$',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.fail('Alert should not have matched!');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, false);
          done();
        });
      });
    });
    it('should send alert email, all matched', function (done) {
      test_impl.saveAlert({name: 'TEST01',
        host: 'localhost',
        facility: 'local4',
        severity: 'info',
        message: '^User.*$',
        modifiers: '',
        recipients: ['alert@example.com'],
        active: true}, function (newAlert) {
        alert.__set__('email', {
          sendAlert: function (email, alert, parsedMessage) {
            assert.equal(email, 'alert@example.com');
          }
        });
        alert.check(parsedMessage, function (value) {
          assert.equal(value, true);
          done();
        });
      });
    });
  });
});
