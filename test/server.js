var test_impl = require('../db/test_impl.js')
    , http = require('http')
    , assert = require('assert')
    , request = require('supertest')
    , bcrypt = require('bcrypt');

describe('Server', function () {
  process.env['db_init'] = './db/test_impl.js'; //referenced from project root
  var server = require('../server');
  var token = '';

  beforeEach(function (done) {
    request(server)
        .post('/auth')
        .send(JSON.stringify({ email: 'admin', password: 'admin' }))
        .end(function (error, res) {
          assert.equal(200, res.statusCode, 'Before auth failed with code: ' + res.statusCode);
          token = res.headers['set-cookie'].toString().split(/auth=(.*?);.*/)[1];
          done();
        });
  });

  afterEach(function (done) {
    test_impl.reset();
    done();
  });

  after(function (done) {
    server.close();
    done();
  });

  describe('#auth()', function () {
    it('should return 401 with invalid email', function (done) {
      request(server)
          .post('/auth')
          .send(JSON.stringify({ email: 'nouser@example.com', password: 'password' }))
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 401 with invalid password', function (done) {
      request(server)
          .post('/auth')
          .send(JSON.stringify({ email: 'admin', password: 'password' }))
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 200 with force_password_change', function (done) {
      var bcrypt_password = bcrypt.hashSync('awesome', bcrypt.genSaltSync(10));
      test_impl.saveUser({email: 'newuser@example.com', password: bcrypt_password, forcePasswordChange: true}, function (user) {
        request(server)
            .post('/auth')
            .send(JSON.stringify({ email: 'newuser@example.com', password: 'awesome' }))
            .expect(200, '{"result":"force_password_change"}', done);
      });
    });
  });

  describe('#logout()', function () {
    it('should return 200 with succes', function (done) {
      request(server)
          .post('/logout')
          .set('Cookie', 'auth=' + token)
          .expect(200, '{"result":"success"}', done);
    });
  });

  describe('#add()', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/add')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify({email: 'joe@blow.com'}))
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 200 on success', function (done) {
      request(server)
          .post('/user/add')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({email: 'joe@blow.com'}))
          .expect(200, '{"result":"success"}', done);
    });
    it('should return 200 on success', function (done) {
      request(server)
          .post('/user/add')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({email: 'joe@blow.com'}))
          .expect(200, '{"result":"success"}', done);
    });
  });

  describe('#list()', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/list')
          .set('Cookie', 'auth=123')
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 200 on success', function (done) {
      request(server)
          .post('/user/list')
          .set('Cookie', 'auth=' + token)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) throw err;
            done();
          });
    });
  });

  describe('#reset()', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/reset')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify({email: 'logo@example.com'}))
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 200 on success', function (done) {
      request(server)
          .post('/user/reset')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({email: 'logo@example.com'}))
          .expect('Content-Type', /json/)
          .expect(200, '{"result":"success"}', done);
    });
    it('should return 404 on user_not_found', function (done) {
      request(server)
          .post('/user/reset')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({email: 'joe@blow.com'}))
          .expect('Content-Type', /json/)
          .expect(404, '{"result":"user_not_found"}', done);
    });
  });

  describe('#password()', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/password')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify({newPassword: 'newpassword'}))
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 200 on success', function (done) {
      request(server)
          .post('/user/password')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({newPassword: 'newpassword'}))
          .expect('Content-Type', /json/)
          .expect(200, '{"result":"success"}', done);
    });
    it('should return 400 on missing password', function (done) {
      request(server)
          .post('/user/password')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({}))
          .expect('Content-Type', /json/)
          .expect(400, '{"result":"password_required"}', done);
    });
  });
});
