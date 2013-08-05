( function () {

    "use strict";

    var util = require( '../../lib/util.js' ),
        ejs = require( 'ejs' ),
        fs = require( 'fs' ),
        markdown = require( 'markdown-js' ),
        fileOptions = {
            encoding: 'utf-8'
        },
        MEMBER_TYPE = {
            METHOD: 'method',
            PROPERTY: 'property',
            EVENT: 'event'
        };

    function View () {
        this.data = null;
    }

    util.extend( View.prototype, {

        transform: function ( jsonData ) {

            this.data = jsonData;

        },

        render: function () {

            var modules = this.data.modules,
                tplData = {
                    modules: []
                };

            for ( var key in modules ) {

                tplData.modules.push( _innerHelper.renderModule( modules[ key ] ) );

            }

            return _innerHelper.renderPage( tplData );

        }

    } );


    //内部工具类
    var _innerHelper = {

        renderModule: function ( module ) {

            var tpls = {
                module: null,
                classes: []
            };

            tpls.module = this.render( 'module.ejs', module );

            module.classes.forEach( function ( clsData ) {

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

            clsData.classitems.forEach( function ( member ) {

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
            return ejs.render( this.readTpl( file ), data )
        }

    },

    //视图工具类
    ViewHelper = {

        markdownToHtml: function ( str ) {

            return this.filter( markdown.makeHtml( str ) );

        },

        //解析method签名
        parseSignature: function ( data ) {

            var fullpath = [
                    data.module,
                    data['class']
                ],
                anchor = fullpath.join( "." ) + ":" + data.name;

            return _innerHelper.render( 'signature.ejs', {
                anchor: anchor,
                name: data.name,
                params: data.params
            } );

        },

        //获取当前处理对象的路径
        getPath: function ( data ) {

            var path = [
                data.module
            ];

            if ( data['class'] ) {
                path.push( data['class'] );
            }

            path = path.join(".");

            path += ':' + data.name;

            return path;

        },

        filter: function ( htmlStr ) {

            return htmlStr.replace( /<p><code>(.+)\n/ig, function( str, $1 ) {
                return '<pre class="prettyprint linenums lang-'+ $1 +'">\n';
            }).replace( /<\/code><\/p>/ig, '</pre>' );

        }

    };

    module.exports = new View();

} )();