(function() {
    'use strict';

    var util = require( './util.js'),
        fs = require( 'fs' ),
        view = require( '../views/ueditor' );

    function BuilderPlugin() {
        throw new Error( 'Not implemented!' );
    }
    BuilderPlugin.prototype.build = function() {
        throw new Error( 'Not implemented!' );
    }


    function Builder() {

    }
    util.inherits( Builder, BuilderPlugin );
    Builder.prototype.build = function( json ) {

        view.transform( json );

        fs.writeFile( "./test.html", view.render() );

    }


    exports.BuilderPlugin = BuilderPlugin;
    exports.Builder = Builder;
})();