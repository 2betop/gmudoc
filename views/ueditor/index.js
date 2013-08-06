( function () {

    "use strict";

    var util = require( '../../lib/util.js' ),
        ejs = require( 'ejs' ),
        fs = require( 'fs' ),
        highlight = require('pygments').colorize,
        markdown = require( 'markdown-js' ),
        fileOptions = {
            encoding: 'utf-8'
        },
        MEMBER_TYPE = {
            METHOD: 'method',
            PROPERTY: 'property',
            EVENT: 'event'
        },
        ITEM_TYPE = {
            MODULE: 'module',
            CLASS: 'class',
            METHOD: 'method',
            EVENT: 'event',
            PROPERTY: 'property'
        };

    function View () {
        this.data = null;
    }

    util.extend( View.prototype, {

        build: function ( jsonData, callback ) {

            var _self = this;

            _innerHelper.transform( jsonData, function () {

                callback( _self._render( jsonData ) );

            } );

        },

        _render: function ( data ) {

            var modules = data.modules,
                tplData = {
                    modules: []
                };

            util._.each( modules, function ( moduleData ) {

                tplData.modules.push( _innerHelper.renderModule( moduleData ) );

            } );

            return _innerHelper.renderPage( tplData );

        }

    } );


    //内部工具类
    var _innerHelper = {

        transform: function ( data, callback ) {

            var count = Object.keys( data.modules ).length,
                _self = this;

            util._.each( data.modules, function ( clsData ) {

                _self.transformClass( clsData.classes, function () {

                    count--;

                    if ( !count ) {
                        callback();
                    }

                } );

            } );

        },

        transformClass: function ( clsData, callback ) {

            var _self = this,
                count = Object.keys( clsData ).length;

            util._.each( clsData, function ( cls ) {

                _self.transformMember( cls.items, function () {
                    count--;
                    !count && callback();
                } );

            } );

        },

        transformMember: function ( memberData, callback ) {

            var count = Object.keys( memberData ).length;

            util._.each( memberData, function ( member ) {

                if ( member.example ) {

                    ViewHelper.highlight( ViewHelper.markdownToHtml( member.example ), function ( data ) {

                        count--;
                        member.example = data;

                        !count && callback();

                    } );

                } else {
                    count--;
                }

            } );

        },

        renderModule: function ( module ) {

            var tpls = {
                module: null,
                classes: []
            };

            tpls.module = this.render( 'module.ejs', module );

            util._.each( module.classes, function ( clsData ) {

                var data = _innerHelper.renderClass( clsData );

                tpls.classes.push( data );

            } );

            return tpls;

        },

        renderClass: function ( clsData ) {

            var data = null;

            clsData.members = {
                event: [],
                property: [],
                method: []
            };

            util._.each( clsData.items, function ( member ) {

                data = _innerHelper.renderMember( member );

                clsData.members[ data.type ].push( data.value );

            } );

            return this.render( "cls.ejs", clsData );

        },

        renderMember: function ( member ) {

            switch ( member.itemtype ) {

                case MEMBER_TYPE.METHOD:

                    return {
                        type: MEMBER_TYPE.METHOD,
                        value: this.render( 'member/method.ejs', member )
                    };

                case MEMBER_TYPE.EVENT:

                    return {
                        type: MEMBER_TYPE.EVENT,
                        value: this.render( 'member/event.ejs', member )
                    };

                case MEMBER_TYPE.PROPERTY:

                    return '';

                default:

                    throw new Error( 'unknow member type!' );

            }

        },

        renderPage: function ( data ) {

            return this.render( 'layout.ejs', data );

        },

        readTpl: function ( tplFile ) {
            return fs.readFileSync( '../views/ueditor/tpl/' + tplFile, fileOptions );
        },

        render: function ( file, data ) {
            data.ViewHelper = ViewHelper;
            data._self = data;
            return ejs.render( this.readTpl( file ), data )
        }

    },

        test = 0,
    //视图工具类
    ViewHelper = {

        markdownToHtml: function ( str ) {

            return markdown.makeHtml( str );

        },

        //解析method签名
        parseSignature: function ( data, isLink ) {

            var fullpath = [
                    data.module,
                    data['class']
                ],
                anchor = this.getPath( data ),
                isLink = !!isLink;


            //链接
            if ( isLink ) {

                return _innerHelper.render( 'member/signature.link.ejs', {
                    anchor: anchor,
                    name: data.name,
                    params: data.params
                } );

            //锚点
            } else {

                return _innerHelper.render( 'member/signature.anchor.ejs', {
                    anchor: anchor,
                    name: data.name,
                    params: data.params
                } );

            }

        },

        //获取当前处理对象的路径
        getPath: function ( data ) {

            switch ( data.itemtype ) {

                case ITEM_TYPE.MODULE:

                    return data.name;

                case ITEM_TYPE.CLASS:

                    return data.module + "." + data.name;

                case ITEM_TYPE.METHOD:

                    return this.getMethodPath( data );

                default:

                    return data.module + "." + data.class + ":" + data.name;

            }

        },

        getMethodPath: function ( data ) {

            var start = data.module + "." + data.class + ":" + data.name,
                paramStr = [];

            if ( data.params ) {

                data.params.forEach( function ( param ) {
                    paramStr.push( param.type[0] );
                } );

            }

            paramStr = "(" + paramStr.join( "," ) + ")";

            return start + paramStr;

        },

        getMembers: function ( data ) {

            if ( data.itemtype === ITEM_TYPE.CLASS ) {

                var result = [];

                Object.keys( data.items ).forEach( function ( key ) {

                    result.push( data.items[ key ] );

                } );

                return result;

            }

        },

        highlight: function ( htmlStr, callback ) {

            var match = /^<p><code>(.+)\n([^<]+)<\/code><\/p>$/i.exec( htmlStr );

            match && highlight( match[ 2 ], match[ 1 ], 'html', function(data) {

                callback( data );

            }, {
                O: 'style=colorful,linenos=table,encoding=utf-8 '
            });

            !match && callback( htmlStr );

        }

    };

    module.exports = new View();

} )();