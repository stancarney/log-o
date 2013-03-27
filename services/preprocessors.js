var config = require('../config.js')
    , fs = require('fs')
    , path = require('path')
    , moduleHolder = {};

//TODO:Stan adjust path to load from preprocessors/
function loadModules(modulePath) {
  fs.lstat(modulePath, function (err, stat) {
    if (err) {
      console.log('Error occured trying to stat preprocessor file: ', err);
      return;
    }

    if (!stat.isDirectory()) {
      require(modulePath)(moduleHolder);
    } else {
      console.log('Preprocessors must be files, not directories.');
    }
  });
}

var pp = config.get('preprocessors');
if (pp) {
  for (var i = 0; i < pp.length; i++) {
    var p = path.join(__dirname, 'preprocessors', pp[i]);
    loadModules(p);
  }

  exports.moduleHolder = moduleHolder;
}