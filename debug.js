(function() {
    'use strict';

    var Doc = require('./lib/doc.js');

    var ins = new Doc({
        cwd: './test/samples',
        files: ['sample4.js', 'sample5.js']
    });

    ins.run();

})();