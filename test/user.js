var http = require('http')
    , assert = require('assert')
    , request = require('supertest');

describe('User', function () {
  process.env['db_init'] = './test/test_impl.js';
  var server = require('../server');
  var token = '';

  before(function (done) {
    request(server)
        .post('/auth')
        .send(JSON.stringify({ email: 'admin', password: 'admin' }))
        .end(function (error, res) {
          token = res.headers['set-cookie'].toString().split(/auth=(.*?);.*/)[1];
          done();
        });
  });

  after(function (done) {
    server.close();
    done();
  });

  describe('#add()', function () {
    it('should save without error', function (done) {
      request(server)
          .post('/user/add')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({email: 'joe@blow.com'}))
          .expect(200)
          .end(function (error, res) {
            assert.equal(res.text, '{"result":"success"}', 'Add user response returned unexpected result: ' + res.text);
            done();
          });
    });
  });

  describe('#list()', function () {
    it('should save without error', function (done) {
      request(server)
          .post('/user/list')
          .set('Cookie', 'auth=' + token)
          .expect('Content-Type', /json/)
          .expect(200, done);
    });
  });
});
