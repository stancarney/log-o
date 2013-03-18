/*
 Basic MongoDB Setup.
 */
var mongo = require('mongodb')
    , mongodb = new mongo.Db('log-o', new mongo.Server('localhost', 27017, {}), {})
    , db = require('./db/mongodb_impl.js');

db.init(mongodb, 'log-o', 'log-o');
module.exports = db;

