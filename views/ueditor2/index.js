( function () {

    "use strict";

    var $ = require( '../../new/lib/util' ),
        ejs = require( 'ejs' ),
        fs = require( 'fs' ),
        pygments = require('pygments').colorize,
        marked = require( 'marked' ),
        ViewHelper = require( "./viewhelper" ),
        fileOptions = {
            encoding: 'utf-8'
        },
        MEMBER_TYPE = {
            CONSTRUCTOR: 'constructor',
            METHOD: 'method',
            PROPERTY: 'property',
            EVENT: 'event'
        };

    function View () {
        this.data = null;
    }

    $.extend( View.prototype, {

        build: function ( jsonData, callback ) {

            var _self = this;

            _innerHelper.transform( jsonData, function () {

                callback( _self._render( jsonData ) );

            } );

        },

        _render: function ( data ) {

            var tplData = {
                    modules: []
                };

            $.forOwn( data, function ( moduleData ) {

                tplData.modules.push( _innerHelper.renderModule( moduleData ) );

            } );

            return _innerHelper.renderPage( tplData );

        }

    } );


    //内部工具类
    var _innerHelper = {

        transform: function ( data, transend ) {

            var examples = [],
                count = 0;

            $.forOwn( data, function ( module ) {

                module[ 'class' ] && $.forOwn( module[ 'class' ], function ( classData ) {

                    classData.__member && classData.__member.forEach( function ( memberData ) {

                        if ( memberData.hasOwnProperty( "example" ) ) {
                            examples.push( memberData );
                        }

                    } );

                } );


                module.__member && module.__member.forEach( function ( memberData ) {

                    if ( memberData.hasOwnProperty( "examples" ) ) {
                        examples.push( memberData );
                    }

                } );

            } );

            examples.forEach( function ( expArr ) {

                expArr.example.forEach( function ( examp, index ) {

                    count ++;

                    var content = marked( examp, {
                        langPrefix: ''
                    }),
                    language = /<code class="([^"]+)">((?:[\s\S](?!<\/code>))*)/.exec( content );

                    content = language[ 2 ];
                    language = language[ 1 ];

                    //反转义
                    content = content.replace( /&amp;/g, '&')
                                    .replace(/&lt;/g, '<')
                                    .replace(/$gt;/g, '>')
                                    .replace(/&quot;/g, '"')
                                    .replace(/&#39;/g, '"');

                    pygments( content, language, 'html', function( data ) {

                        count--;
                        expArr.example[ index ] = data;

                        if ( !count ) {
                            transend( data );
                        }

                    }, {
                        O: 'style=colorful,linenos=table,encoding=utf-8 '
                    });

                } );

            } );

        },

        renderModule: function ( module ) {

            var tpls = {
                    module: null,
                    classes: []
                },
                data = null;

            module.__member && module.__member.forEach( function ( memberData ) {

                memberData.member = {
                    method: [],
                    property: []
                };

                data = _innerHelper.renderMember( memberData );
                data.type && memberData.member[ data.type ].push( data.value );

            } );

            tpls.module = this.render( 'module.ejs', module );

            $.forOwn( module['class'], function ( clsData ) {

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
                method: [],
                constructor: []
            };

            clsData.__member.forEach( function ( member ) {

                data = _innerHelper.renderMember( member );

                data.type && clsData.members[ data.type ].push( data.value );

            } );

            return this.render( "cls.ejs", clsData );

        },

        renderMember: function ( member ) {

            switch ( member.__type ) {

                case MEMBER_TYPE.METHOD:

                    return {
                        type: MEMBER_TYPE.METHOD,
                        value: this.render( 'member/method.ejs', member )
                    };

                case MEMBER_TYPE.CONSTRUCTOR:

                    return {
                        type: MEMBER_TYPE.CONSTRUCTOR,
                        value: this.render( 'member/constructor.ejs', member )
                    };

                case MEMBER_TYPE.EVENT:

                    return {
                        type: MEMBER_TYPE.EVENT,
                        value: this.render( 'member/event.ejs', member )
                    };

                case MEMBER_TYPE.PROPERTY:

                    return {
                        type: MEMBER_TYPE.PROPERTY,
                        value: this.render( 'member/property.ejs', member )
                    };

                default:

                    debugger;
                    throw new Error( 'unknow member type!' );

            }

        },

        renderPage: function ( data ) {

            return this.render( 'layout.ejs', data );

        },

        readTpl: function ( tplFile ) {
            return fs.readFileSync( '../views/ueditor2/tpl/' + tplFile, fileOptions );
        },

        render: function ( file, data ) {
            data.ViewHelper = ViewHelper;
            data._self = data;
            return ejs.render( this.readTpl( file ), data );
        }

    };

    module.exports = new View();

} )();