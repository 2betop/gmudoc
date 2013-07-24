/**
 * @file 文档生成工具类
 */
(function() {
    'use strict';

    var _ = require( 'underscore' );

    function Doc( options ) {
        var opts = this._options = _.extend( {
            
            // 默认的解析器
            parser: './lib/parser.js',

            // 默认的组织者
            organizer: './lib/organizer.js',

            // 默认的渲染器
            renderer: './lib/renderer.js'
        }, options );
    }

    _.extend( Doc.prototype, {

        factory: function( component ) {
            var opts = this._options,
                klass = require( opts[ component ] );
            return new klass( opts );
        },

        // 完成对源码解析的过程。
        parse: function() {
            this.parser = this.factory( 'parser' );
            this.parser.parse.apply( this.parser, arguments );
        },

        organize: function() {
            this.organizer = this.factory( 'organizer' );
            this.organizer.organize( this.parser.result );
        },

        render: function() {

        },

        run: function() {
            this.parse();
            this.organize();
            debugger;
            debugger;
            this.render();
        }
    } );

    module.exports = Doc;
})();