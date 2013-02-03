var config = require('./config.js')
    , fs = require('fs')
    , path = require('path')
    , module_holder = {};

function load_modules(module_path) {
  fs.lstat(module_path, function (err, stat) {
    if(err){
      console.log('Error occured trying to stat preprocessor file: ', err);
      return;
    }

    if (!stat.isDirectory()) {
      require(module_path)(module_holder);
    } else {
      console.log('Preprocessors must be files, not directories.');
    }
  });
}

var pp = config.get('preprocessors');
if (pp) {
  for (var i = 0; i < pp.length; i++) {
    var p = path.join(__dirname, 'preprocessors', pp[i]);
    load_modules(p);
  }

  exports.module_holder = module_holder;
}