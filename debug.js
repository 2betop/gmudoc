(function() {
    'use strict';

    debugger;

    var Doc = require('./doc.js');

    var doc = new Doc({
        files: ['test/samples/sample2.js']
    });

    doc.run();

})();