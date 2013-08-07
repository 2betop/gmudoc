(function() {
    'use strict';

    var util = require( './util.js'),
        path = require( 'path' );

    function BuilderPlugin() {
        throw new Error( 'Not implemented!' );
    }
    BuilderPlugin.prototype.build = function() {
        throw new Error( 'Not implemented!' );
    }


    function Builder( app ) {
        this.options = app.options;
    }
    util.inherits( Builder, BuilderPlugin );
    Builder.prototype.build = function( json ) {

        var view = path.resolve( this.options.themeDir, this.options.theme, 'index.js' ),
            folder = this.options.outputDir;

        view = require( view );

        if ( typeof view.build !== 'function' ) {
            throw new Error( 'Error' );
        }

        util.mkdir( folder );

        view.build( json, function ( data ) {
            if ( Array.isArray( data ) ) {
                data.forEach(function( val, key ){
                    util.writeFile( path.join( folder, key ), val );
                });
            } else {
                util.writeFile( path.join( folder, 'index.html'), data );
            }
        } );
    }

    exports.BuilderPlugin = BuilderPlugin;
    exports.Builder = Builder;
})();