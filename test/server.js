var test_impl = require('../db/test_impl.js')
    , http = require('http')
    , assert = require('assert')
    , request = require('supertest')
    , bcrypt = require('bcrypt');

describe('Server', function () {
  process.env['db_init'] = './db/test_impl.js'; //referenced from project root
  var server = require('../server');
  var token = '';
  var alert = {name: 'myregex', regex: '.*', modifiers: 'gim', recipients: 'alert@example.com', enable: true};

  beforeEach(function (done) {
    request(server)
        .post('/auth')
        .send(JSON.stringify({ email: 'logo@example.com', password: 'password' }))
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

  describe('/auth', function () {
    it('should return 401 with invalid email', function (done) {
      request(server)
          .post('/auth')
          .send(JSON.stringify({ email: 'nouser@example.com', password: 'password' }))
          .expect('Content-Type', /json/)
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 401 on not active', function (done) {
      test_impl.getUserByEmail('logo@example.com', function (user) {
        user.active = false;
        request(server)
            .post('/auth')
            .send(JSON.stringify({ email: user.email, password: 'password' }))
            .expect('Content-Type', /json/)
            .expect(401, '{"result":"unauthorized"}', done);
      });
    });
    it('should return 401 with invalid password', function (done) {
      request(server)
          .post('/auth')
          .send(JSON.stringify({ email: 'admin', password: 'password' }))
          .expect('Content-Type', /json/)
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 200 with force_password_change', function (done) {
      var bcrypt_password = bcrypt.hashSync('awesome', bcrypt.genSaltSync(10));
      test_impl.saveUser({email: 'newuser@example.com', password: bcrypt_password, active: true, forcePasswordChange: true}, function (user) {
        request(server)
            .post('/auth')
            .send(JSON.stringify({ email: user.email, password: 'awesome' }))
            .expect('Content-Type', /json/)
            .expect(200, '{"result":"force_password_change"}', done);
      });
    });
  });

  describe('/logout', function () {
    it('should return 200 with succes', function (done) {
      request(server)
          .post('/logout')
          .set('Cookie', 'auth=' + token)
          .expect('Content-Type', /json/)
          .expect(200, '{"result":"success"}', done);
    });
  });

  describe('/user/add', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/add')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify({email: 'joe@blow.com'}))
          .expect('Content-Type', /json/)
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 403 on invalid permissions', function (done) {
      test_impl.getUserByEmail('logo@example.com', function (user) {
        user.permissions.splice(user.permissions.indexOf('USER_ADD'), 1);
        request(server)
            .post('/user/add')
            .set('Cookie', 'auth=' + token)
            .send(JSON.stringify({email: 'joe@blow.com'}))
            .expect('Content-Type', /json/)
            .expect(403, '{"result":"forbidden"}', done);
      });
    });
    it('should return 200 on success', function (done) {
      request(server)
          .post('/user/add')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({email: 'joe@blow.com'}))
          .expect('Content-Type', /json/)
          .expect(200, '{"result":"success"}', done);
    });
  });

  describe('/user/list', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/list')
          .set('Cookie', 'auth=123')
          .expect('Content-Type', /json/)
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 403 on invalid permissions', function (done) {
      test_impl.getUserByEmail('logo@example.com', function (user) {
        user.permissions.splice(user.permissions.indexOf('USER_LIST'), 1);
        request(server)
            .post('/user/list')
            .set('Cookie', 'auth=' + token)
            .expect('Content-Type', /json/)
            .expect(403, '{"result":"forbidden"}', done);
      });
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

  describe('/user/edit', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/edit')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify({email: 'logo@example.com', active: true}))
          .expect('Content-Type', /json/)
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 403 on invalid permissions', function (done) {
      test_impl.getUserByEmail('logo@example.com', function (user) {
        user.permissions.splice(user.permissions.indexOf('USER_EDIT'), 1);
        request(server)
            .post('/user/edit')
            .set('Cookie', 'auth=' + token)
            .send(JSON.stringify({email: 'logo@example.com', active: false}))
            .expect('Content-Type', /json/)
            .expect(403, '{"result":"forbidden"}', done);
      });
    });
    it('should return 200 on success', function (done) {
      request(server)
          .post('/user/edit')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({email: 'logo@example.com', active: false}))
          .expect('Content-Type', /json/)
          .expect(200, '{"result":"success"}', done);
    });
  });

  describe('/user/reset', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/reset')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify({email: 'logo@example.com'}))
          .expect('Content-Type', /json/)
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

  describe('/user/password', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/user/password')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify({newPassword: 'newpassword'}))
          .expect('Content-Type', /json/)
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

  describe('/alert/add', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/alert/add')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify({name: 'myregex', regex: '.*', modifiers: 'gim', recipients: 'alert@example.com', enable: true}))
          .expect('Content-Type', /json/)
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 403 on invalid permissions', function (done) {
      test_impl.getUserByEmail('logo@example.com', function (user) {
        user.permissions.splice(user.permissions.indexOf('ALERT_ADD'), 1);
        request(server)
            .post('/alert/add')
            .set('Cookie', 'auth=' + token)
            .send(JSON.stringify({name: 'myregex', regex: '.*', modifiers: 'gim', recipients: 'alert@example.com', enable: true}))
            .expect('Content-Type', /json/)
            .expect(403, '{"result":"forbidden"}', done);
      });
    });
    it('should return 200 on success', function (done) {
      request(server)
          .post('/alert/add')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({name: 'myregex', regex: '.*', modifiers: 'gim', recipients: 'alert@example.com', enable: true}))
          .expect('Content-Type', /json/)
          .expect(200, '{"result":"success"}', done);
    });
    it('should return 400 on already exists', function (done) {
      request(server)
          .post('/alert/add')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify(alert))
          .expect('Content-Type', /json/)
          .expect(200, '{"result":"success"}')
          .end(function (err, res) {
            if (err) throw err;
            request(server)
                .post('/alert/add')
                .set('Cookie', 'auth=' + token)
                .send(JSON.stringify(alert))
                .expect('Content-Type', /json/)
                .expect(400, '{"result":"alert_already_exists"}', done);
          });
    });
  });

  describe('/alert/list', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/alert/list')
          .set('Cookie', 'auth=123')
          .expect('Content-Type', /json/)
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 403 on invalid permissions', function (done) {
      test_impl.getUserByEmail('logo@example.com', function (user) {
        user.permissions.splice(user.permissions.indexOf('ALERT_LIST'), 1);
        request(server)
            .post('/alert/list')
            .set('Cookie', 'auth=' + token)
            .expect('Content-Type', /json/)
            .expect(403, '{"result":"forbidden"}', done);
      });
    });
    it('should return 200 on success', function (done) {
      test_impl.saveAlert(alert);
      request(server)
          .post('/alert/list')
          .set('Cookie', 'auth=' + token)
          .expect('Content-Type', /json/)
          .expect(200, '[{"name":"myregex","regex":".*","modifiers":"gim","recipients":"alert@example.com","enable":true}]', done);
    });
  });

  describe('/alert/edit', function () {
    it('should return 401 with invalid token', function (done) {
      request(server)
          .post('/alert/edit')
          .set('Cookie', 'auth=123')
          .send(JSON.stringify(alert))
          .expect('Content-Type', /json/)
          .expect(401, '{"result":"unauthorized"}', done);
    });
    it('should return 403 on invalid permissions', function (done) {
      test_impl.getUserByEmail('logo@example.com', function (user) {
        user.permissions.splice(user.permissions.indexOf('ALERT_EDIT'), 1);
        request(server)
            .post('/alert/edit')
            .set('Cookie', 'auth=' + token)
            .send(JSON.stringify(alert))
            .expect('Content-Type', /json/)
            .expect(403, '{"result":"forbidden"}', done);
      });
    });
    it('should return 200 on success', function (done) {
      test_impl.saveAlert(alert);
      request(server)
          .post('/alert/edit')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify(alert))
          .expect('Content-Type', /json/)
          .expect(200, '{"result":"success"}', done);
    });
    it('should return 400 on doesn\'t exist', function (done) {
      request(server)
          .post('/alert/edit')
          .set('Cookie', 'auth=' + token)
          .send(JSON.stringify({name: 'non-existent', regex: '.*', modifiers: 'gim', recipients: 'alert@example.com', enable: true}))
          .expect('Content-Type', /json/)
          .expect(404, '{"result":"alert_does_not_exist"}', done);
    });
  });
});
