(function() {
    'use strict';

    var fs = require( 'fs' ),
        file;



    file = module.exports = {

        read: function( filename ) {
            return file.exists( filename ) ? fs.readFileSync( filename, 'utf-8' ) : '';
        },

        exists: function( filename ) {
            return fs.existsSync( filename );
        }

    };
})();