(function() {
    'use strict';

    var fs = require( 'fs' );

    function inherits ( child, parent ) {

        // 复制静态属性和方法
        eachObject( parent, function( val, key ){
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

    function eachObject( obj, iterator ) {
        obj && Object.keys( obj ).forEach(function( key ) {
            iterator( obj[ key ], key );
        });
    }

    // 浅拷贝
    function extend ( target ) {
        var args = [].slice.call( arguments, 1 );
        args.forEach(function( arg ){
            eachObject( arg, function( val, key ){
                target[ key ] = val;
            } );
        });
        return target;
    }

    function readFile( src ) {
        return fs.readFileSync( src, 'utf-8' );
    }

    function writeFile( desc, content ) {
        return fs.writeFileSync( desc, content, 'utf-8' );
    }

    // 暴露
    exports.eachObject = eachObject;
    exports.inherits = inherits;
    exports.extend = extend;
    exports.readFile = readFile;
    exports.writeFile = writeFile;
    exports._ = require( 'lodash' )._;

})();