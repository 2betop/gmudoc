(function() {
    'use strict';

    var _ = require( 'underscore' ),
        file = require( './util/file.js' ),
        path = require( 'path' ),
        ALIAS = {
            desc: 'description',
            file: 'fileoverview',
            prop: 'property'
        };

    function Parser( opts ) {
        opts = opts || {};

        if ( opts.files ) {
            this.files = opts.files;
        } else if ( opts.path ) {

            //todo 遍历目录下的所有js文件
        }

        this.cwd = opts.cwd || process.cwd();
    }

    _.extend( Parser.prototype, {

        // 取出注释正文。去掉多余的星号空格。
        trimAsterisk: function ( str ) {
            return str
                    .replace( /\r\n/gm, '\n' )
                    .replace( /^\/\*\*.*(?!\*)/, '' )
                    .replace( /\*+\/$/, '' )
                    .replace( /^\s*\*\s?/mg, '' )
                    .trim();
        },
        
        parse: function() {
            var me = this,
                files = me.files,
                cwd = me.cwd,
                ret = {};

            files.forEach(function( filepath ) {
                ret[ filepath ] = me.parseComments( path.join( cwd, filepath ) );
            });

            this.result = ret;
        },

        parseComments: function( filepath ) {
            var me = this,
                content = file.read( filepath ),
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
            str = (/^@/.test( str ) ? '' : '@desc ') + str;

            tags = str.match( /@\w+[^@$]*/g );

            tags && tags.forEach(function( tag ) {
                var part = tag.trim().match( /^@(\w+)\s?([\s\S]*)$/ ),
                    key = part[ 1 ].toLowerCase(),
                    value = part[ 2 ],
                    meta;
                
                switch( key ) {
                    case 'param':
                    case 'property':

                        // 如果是以下格式，则把信息分开
                        // @param {Number|String} name desc
                        if ( /^{(.*?)}\s+(\w+)\s+([\s\S]*)$/.test( value ) ) {
                            value = {
                                raw: value,
                                name: RegExp.$2,
                                description: RegExp.$3,
                                types: RegExp.$1.split( /\s*[|,\/]\s*/g )
                            };
                        }

                        break;

                    case 'return':

                        // 如果是以下格式，则把信息分开
                        // @return {Number|String} desc
                        if ( /^{(.*?)}\s+([\s\S]*)$/.test( value ) ) {
                            value = {
                                raw: value,
                                description: RegExp.$2,
                                types: RegExp.$1.split( /\s*[|,\/]\s*/g )
                            };
                        }
                        break;
                }

                key = ALIAS[ key ] || key;
                
                // todo hook this.
                meta = { key: key, value: value };
                ret.push( meta );
            });

            return ret;
        }
    } );
    module.exports = Parser;
})();