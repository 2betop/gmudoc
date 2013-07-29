(function() {
    'use strict';

    var Doc = require('./lib/doc.js');

    var ins = new Doc({
        cwd: '../gmu/src',
        files: ['core/*.js']
    });

    ins.run();
    
    debugger;

})();