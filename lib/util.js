(function() {
    'use strict';

    var fs = require( 'fs' ),
        _ = require( 'lodash' )._;

    function inherits ( child, parent ) {

        // 复制静态属性和方法
        _.each( parent, function( val, key ){
            child[ key ] = val;
        } );

        child.prototype = Object.create( parent.prototype, {
            constructor: {
                value: child,
                enumerable: false,
                writable: true,
                configurable: true
            }
        } );

        child.__super__ = parent;
    }

    function readFile( src ) {
        return fs.readFileSync( src, 'utf-8' );
    }

    function writeFile( desc, content ) {
        return fs.writeFileSync( desc, content, 'utf-8' );
    }

    // 暴露
    exports.inherits = inherits;
    exports.extend = _.assign;
    exports.readFile = readFile;
    exports.writeFile = writeFile;
    exports._ = _;

})();