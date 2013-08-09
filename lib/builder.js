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
            if ( typeof data === 'string' ) {
                util.writeFile( path.join( folder, 'index.html'), data );
            } else {
                util._.forEach( data, function( val, key ) {
                    if ( util.fileExist( val ) ) {

                        // 二进制
                        util.copyFile( val, path.join( folder, key ) );
                    } else {
                        util.writeFile( path.join( folder, key ), val );
                    }
                } );
            }
        } );
    }

    exports.BuilderPlugin = BuilderPlugin;
    exports.Builder = Builder;
})();