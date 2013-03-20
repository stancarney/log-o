var config = require('./config.js')
    , dbInit = config.get('db_init')
    , db;

if (!dbInit) {
  throw new Error('NO DB SET! db_init config.json or ENV variable must be set!');
}

db = require(dbInit);
module.exports = db;
