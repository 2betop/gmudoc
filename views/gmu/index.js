(function(){
    var util = require( '../../lib/util.js' ),
        _ = util._,
        ejs = require( 'ejs' ),
        marked = require( 'marked' ),
        path = require( 'path' ),
        GlobCollector = require( '../../lib/collector.js' ).GlobCollector,
        view;

    function View() {
        var me = this;

        this.locals = {};
        this.localStack = [ this.locals ];
        this.themeDir = path.join( __dirname, 'tpl' );


        // 注册变量和方法给tpl用
        this.asign( '_', _ );
        this.asign( 'title', 'GMU API 文档' );
        [ 'renderTpl', 'forUrl', 'gennerateID', 'markdown',
                'formatExample', 'renderParams'
                ].forEach(function( name ) {

            me.asign( name, function() {
                return me[ name ].apply( me, arguments );
            } );
        });
    }

    util.extend( View.prototype, {
        asign: function( key, val ) {
            this.locals[ key ] = val;
        },

        fetch: function( key ) {
            return this.locals[ key ] || '';
        },

        build: function( json, complete ) {
            this.files = {};
            this.transform( json );
            this.render();
            complete( this.files );
        },

        gennerateID: function( str ) {
            return str.replace(/[^a-zA-Z0-9_]+/g, '_');
        },

        forUrl: function( href ) {
            return '#' + this.gennerateID( href );
        },

        transform: function( json ) {
            var navs = {},
                modules = {},
                me = this;

            _.forEach( json.modules, function( module ) {
                var modulename = module.name,
                    host = navs[ modulename ] = {};

                _.forEach( module.classes, function( clazz ) {
                    if ( !clazz || clazz.plugin_for.length ) {
                        return;
                    }

                    var classname = clazz.name,
                        methods = [],
                        options = [],
                        events = [];

                    _.forEach( clazz.items, function( item ){
                        host[ classname ] = host[ classname ] || [];

                        switch( item.itemtype ) {
                            case 'event':
                                events.push( item );
                                break;

                            case 'property':
                                options.push( item );
                                break;

                            case 'method':
                            case 'constructor':
                                methods.push( item );

                                host[ classname ].push({
                                    text: item.shortname || item.name,
                                    href: me.forUrl( modulename + ':' + classname + ':' + item.name )
                                });
                                break;
                        }
                    } );

                    events.length && host[ classname ].unshift({
                        text: 'events',
                        href: me.forUrl( modulename + ':' + classname + ':events' )
                    });

                    options.length && host[ classname ].unshift({
                        text: 'options',
                        href: me.forUrl( modulename + ':' + classname + ':options' )
                    });

                    delete clazz.items;
                    clazz.methods = methods;
                    clazz.options = options;
                    clazz.events = events;
                    clazz.title = clazz.title || '';
                    clazz.description = clazz.description || '';

                    clazz.plugins = clazz.plugins.map(function( name ){
                        var obj = module.classes[ name ];
                        delete module.classes[ name ];
                        return obj;
                    });

                    clazz.plugins.length && host[ classname ].push({
                        text: 'plugins',
                        href: me.forUrl( modulename + ':' + classname + ':plugins' )
                    });
                } );

                module.title = module.title || '';
                module.description = module.description || '';
            } );

            me.asign( 'navs', navs );
            me.asign( 'modules', json.modules );

            this.files['debug.json'] = JSON.stringify( this.locals, null, 4);
        },

        renderTpl: function( file, data ) {
            var fileconent,
                locals;

            locals = this.localStack[ this.localStack.length - 1 ];

            data = data ? _.extend( {}, locals, data ) : locals;
            file = path.join( this.themeDir, file + '.ejs' );

            fileconent = util.readFile( file );

            this.localStack.push( data );
            fileconent = ejs.render( fileconent, {
                locals: data
            } );
            this.localStack.pop();

            return fileconent;
        },

        render: function() {
            var content = this.renderTpl( 'layout' ),
                collector = new GlobCollector(),
                files = this.files;

            files[ 'index.html' ] = content;
            collector.collect(['**/*.*', '!*.ejs'], this.themeDir ).forEach(function( file ){
                files[ file.relative ] = util.readFile( file.absolute );
            });
        },

        renderParams: function( params ) {
            var me = this,
                html = '';

            if ( params && params.length ) {
                html += '<ul class="params-list">';

                _.forEach( params, function( param ) {
                    html += '<li><span class="meta">';

                    param.name && (html += '<code>' + param.name + '</code>');

                    html += ' {' + param.type.join( ', ') + '}';

                    if ( param.optional ) {
                        html += ' [ 可选 ]';
                    }

                    if ( param.defaultvalue ) {
                        html += ' [ 默认值: ' + param.defaultvalue + ' ] ';
                    }

                    html += '</span>';

                    html += ' ' +  param.description  ? me.markdown( param.description ) : '';

                    if ( param.props ) {
                        html += me.renderParams.call( me, param.props );
                    }

                    html += '</li>';
                } );

                html += '</ul>';
            }

            return html;
        },

        markdown: function( text ) {
            return marked( text );
        },

        formatExample: function( text ) {
            if ( !/```/.test( text ) ) {
                text = '```javascript\n' + text + '\n```';
            }
            return this.markdown( text );
        }
    } );




    module.exports = view = new View();

    // hack marked.InlineLexer
    (function(){
        var outputLink = marked.InlineLexer.prototype.outputLink;


        marked.InlineLexer.prototype.outputLink = function(cap, link) {
            var match = /^#(.*:.*)/.exec( link.href );
            if ( match ) {
                link.href = view.forUrl( match[ 1 ] );
            }
            return outputLink.apply( this, arguments );
        };
    })();
})();