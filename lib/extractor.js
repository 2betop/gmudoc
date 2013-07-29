(function() {
    'use strict';

    var util = require( './util.js' );

    function ExtractorPlugin() {
    }

    ExtractorPlugin.prototype.parse = function( files ) {
        throw new Error( 'Not implemented!' );
    }

    /**
     * @class Extractor
     */
    function Extractor() {
    }
    util.inherits( Extractor, ExtractorPlugin );

    util.extend( Extractor.prototype, {

        // 取出注释正文。去掉多余的星号空格。
        trimAsterisk: function ( str ) {
            return str
                    .replace( /\r\n/gm, '\n' )
                    .replace( /^\/\*\*.*(?!\*)/, '' )
                    .replace( /\*+\/$/, '' )
                    .replace( /^\s*\*\s?/mg, '' )
                    .trim();
        },

        extract: function( files ) {
            var me = this,
                ret = {};

            files.forEach(function( filepath ) {
                ret[ filepath.relative ] = me.parseComments( filepath.absolute );
            });

            return ret;
        },

        parseComments: function( filepath ) {
            var me = this,
                content = util.readFile( filepath ),
                comments = content.match( /\/\*\*[\s\S]+?\*\//g );

            return comments.map(function( content ){
                return me.parseComment( content );
            });
        },

        parseComment: function( str ) {
            var me = this,
                ret = [],
                tags;

            str = me.trimAsterisk( str );
            
            // 如果第一段文字没有用tag包起来，则用desc包起来
            str = (/^@/.test( str ) ? '' : '@description ') + str;

            tags = str.match( /@\w+[^@$]*/g );

            tags && tags.forEach(function( tag ) {
                var part = tag.trim().match( /^@(\w+)\s?([\s\S]*)$/ );

                ret.push( { tag: part[ 1 ].toLowerCase(), value: part[ 2 ] } );
            });

            return {
                raw: str,
                tags: ret
            };
        }

    } );

    exports.ExtractorPlugin = ExtractorPlugin;
    exports.Extractor = Extractor;
})();