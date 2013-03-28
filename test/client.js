var http = require('http')
    , assert = require('assert')
    , request = require('supertest');

describe('Client', function () {
  var server;
  var request;
  var response;

/*  before(function (done) {
    server = http.createServer();
    server.listen(8000);

    server.on('listening', function () {
      done();
    });

    server.on('request', function (req, res) {
      request = req;
      response = res;
    });
  });

  after(function (done) {
    server.close();
    done();
  });

  describe('auth', function () {
    it('should return 401 with invalid email', function (done) {
      process.argv = ['node', 'client.js', 'localhost', 'auth'];
      var client = require('../client.js');
      client.main();
      done();
    });

  });*/
});
