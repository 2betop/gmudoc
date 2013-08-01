(function() {
    'use strict';

    var util = require( './util.js' );

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

    }


    exports.BuilderPlugin = BuilderPlugin;
    exports.Builder = Builder;
})();