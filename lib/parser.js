(function() {
    'use strict';

    var util = require( './util.js' ),
        EventEmitter = require( 'events' ).EventEmitter,
        rtype = /(.*?)\{(.*?)\}(.*)/,
        rfirstworld = /^\s*?([^\s]+)([\s\S]*)/,
        roptional = /\[(.*?)\]/,
        rtypesplit = /\s*[|,\/]\s*/g,
        rimportsplit = /\s*,\s*/g,
        rgrammer = /(.*?)=>(.*)/,
        _ = util._,

        // tag short name
        ALIAS,
        DIGESTERS,
        PROPERTIES;

    // interface
    function notImplemented() {
        throw new Error( 'Not implemented!' );
    }

    function ParserPlugin() {
        throw new Error( 'Not implemented!' );
    }
    util.inherits( ParserPlugin, EventEmitter );
    ParserPlugin.prototype.parse = notImplemented;

    // tag short name.
    ALIAS = {
        imports: 'import',
        desc: 'description',
        file: 'fileoverview',
        returns: 'return',
        peoperty: 'property'
    };

    // 定义如何去消化tag
    // key的顺序有关系，越在上面的越先得到解析。
    DIGESTERS = {

        // 将此block设置为global, 在其他block找不到必填属性时，从此block中取。
        fileoverview: function( tagname, value, block, raw ) {
            var m = this.files[ this.currentfile ];
            block[ tagname ] = value || true;
            this.global = m;
            return m;
        },

        namespace: function( tagname, value, block ) {
            block[ tagname ] = value;
        },

        // 文件依赖
        'import': function ( tagname, value, block, raw ) {
            value = value.split( rimportsplit );
            block[ tagname ] = value;
        },

        module: function( tagname, value, block, raw, tick ) {
            block[ tagname ] = value;

            this.currentmodule = value;

            if ( block.fileoverview ) {
                return;
            }

            // 接着往下解析，其他解析完后再执行下面的。
            tick();

            if ( !block.fileoverview && !block.itemtype ) {
                block.itemtype = tagname;
                block.name = value;

                // 在file中标记
                this.files[ this.currentfile ].modules[ this.currentmodule ] = 1;
                return this.modules[ this.currentmodule ];
            }
        },

        'for': function( tagname, value, block, raw ) {
            if ( block.module ) {
                return;
            }

            value = this.resolveFor( value );
            this.currentclass = value;
            block[ 'class' ] = value;
        },

        'class': function( tagname, value, block, raw, tick ) {
            var host, method;

            block[ tagname ] = value;

            this.currentclass = value;

            if ( block.fileoverview ) {
                return;
            }

            tick();

            if ( !block.itemtype ) {
                block.itemtype = tagname;

                if ( block.namespace && !~value.indexOf( block.namespace + '.' ) ) {
                    block.shortname = value;
                    value = block.namespace + '.' + value;

                    host = this.modules[ this.currentmodule ].classes;
                    host[ value ] = host[ block.shortname ];
                    delete host[ block.shortname ];

                    this.currentclass = value;
                }

                block.name = value;

                // 如果是constructor
                if ( block.isConstructor ) {
                    delete block.isConstructor;

                    method = {};
                    util.extend( method, block );
                    method.itemtype = 'constructor';
                    host = this.modules[ this.currentmodule ].classes[ this.currentclass ];
                    host.items.unshift( method );
                }

                // 在file中标记
                this.files[ this.currentfile ].classes[ this.currentclass ] = 1;

                return this.modules[ this.currentmodule ].classes[ this.currentclass ];
            }
        },

        property: function( tagname, value, block, raw ) {
            var match, host, clazz;

            block.itemtype = tagname;

            match = rtype.exec( value );

            if ( match ) {
                block.type = match[ 2 ].trim().split( rtypesplit );
                value = match[ 1 ] + match[ 3 ];
            }

            match = rfirstworld.exec( value );

            if ( match ) {
                block.description = block.description || match[ 2 ];
                value = match[ 1 ];
            }

            if ( block.namespace && !~value.indexOf( block.namespace + '.' ) ) {
                block.shortname = value;
                value = block.namespace + '.' + value;
            }

            block.name = value;

            debugger;
            block.module = this.currentmodule;
            host = this.modules[ block.module ];
            clazz = !block.hasOwnProperty( 'class') ? this.currentclass ||
                    this.global && this.global[ 'class' ] : block[ 'class' ];
            clazz = host.classes[ clazz ];
            host = clazz ? clazz.items : host.items;
            block['class'] = clazz ? clazz.name : '';
            host.push( block );
        },

        'method': 'property',
        'attribute': 'property',
        'config': 'property',
        'event': 'property',

        // @param {type} name desc
        // @param {type} [name] 名字用中括号括起来表示optional
        // @param {type} obj.name 可以对对象特需说明
        // @param {type} [name=3] 可以通过这个方式指定默认值
        param: function( tagname, value, block, raw ) {
            var ret = {},
                name,
                match,
                host,
                parts,
                part,
                parent;

            host = block.params = block.params || [];
            match = rtype.exec( value );

            if ( match ) {
                ret.type = match[ 2 ].trim().split( rtypesplit );
                value = match[ 1 ] + match[ 3 ];
            }

            match = rfirstworld.exec( value );

            if ( match ) {
                ret.description = match[ 2 ].trim();
                name = match[ 1 ].trim();
            }

            if ( name.charAt( name.length - 1 ) === '*' ) {
                ret.multiple = true;
                name = name.substr( 0, -1 );
            }

            if ( ~name.indexOf( '[' ) ) {
                match = roptional.exec( name );

                if ( match ) {
                    ret.optional = true;
                    name = match[ 1 ];

                    // extract optional=defaultvalue
                    parts = name.split( '=' );
                    if ( parts.length > 1 ) {
                        name = parts[ 0 ];
                        ret.defaultvalue = parts[ 1 ];
                    }
                }
            }

            if ( ~name.indexOf( '.' ) ) {
                parent = host;
                parts = name.split( '.' );

                while ( part = parts.shift() ) {
                    parent = util._.find( parent, function( item ) {
                      return item.name === part;
                    } );

                    if ( !parent ) {
                        break;
                    } else {
                        name = parts.join( '.' );
                        host = parent = parent.props = parent.props || [];
                    }
                }
            }

            ret.name = name;
            host.push( ret );
        },

        type: function( tagname, value, block, raw ) {
            block.type = value.split( rtypesplit );
        },

        // @grammar createClass(object[, superClass]) => fn
        grammar: function( tagname, value, block, raw ) {
            var match = rgrammer.exec( value ),
                ret = {
                    signature: value
                };

            block.grammars = block.grammars || [];

            if ( match ) {
                ret.signature = match[ 1 ];
                ret[ 'return' ] = match[ 2 ];
            }

            block.grammars.push( ret );
        },

        'return': function( tagname, value, block, raw ) {
            var match = rtype.exec( value ),
                ret = {
                    description: value
                };

            block.returns = block.returns || [];

            if ( match ) {
                ret.type = match[ 2 ].trim().split( rtypesplit );
                ret.description = match[ 3 ].trim();
            }

            block.returns.push( ret );
        },

        'constructor': function( tagname, value, block ) {
            block.isConstructor = true;
        },

        'static': function( tagname, value, block, raw ) {
            block.isStatic = true;
        }
    };

    PROPERTIES = {
        currentmodule: {
            get: function() {

                // 确保总是有个module存在，尽管没有定义。
                if ( !this._currentmodule ) {
                    this.modules.temp = {
                        name: 'temp',
                        classes: {},
                        items: [],
                        file: this.currentfile
                    }
                    this._currentmodule = 'temp';
                }

                return this._currentmodule;
            },

            set: function( val ) {

                // 自动创建。
                if ( val && !this.modules[ val ] ) {

                    // 如果之前创建了一个零时module, 则替换它。
                    if ( this._currentmodule === 'temp' ) {
                        this.modules.temp.name = val;
                        this.modules[ val ] = this.modules.temp;
                        delete this.modules.temp;
                    } else {
                        this.modules[ val ] = {
                            name: val,
                            classes: {},
                            items: [],
                            file: this.currentfile
                        };
                    }
                }
                return val;
            }
        },

        // 这里实际上是filename
        currentfile: {
            set: function( val ) {
                if ( val && !(val in this.files) ) {
                    this.files[ val ] = {
                        name: val,
                        modules: {},
                        classes: {}
                    };
                }
                return val;
            }
        },

        currentclass: {
            set: function( val ) {
                var module = this.modules[ this.currentmodule ];

                if ( val && !(val in module.classes) ) {
                    module.classes[ val ] = {
                        name: val,
                        file: this.currentfile,
                        module: module.name,
                        items: [],
                        plugins: [],
                        extensions: [],
                        plugin_for: [],
                        extension_for: []
                    };
                }
                return val;
            }
        }
    };


    function Parser() {
        this.fileMap = {};

        // 提供默认的getter, setter和包装setter, 当valuev变化时触发对应的change事件
        _.forEach( PROPERTIES, function( value, key ) {
            var set = value.set || function( value ) {
                    return value;
                };

            value.get = value.get || function() {
                return this[ '_' + key ];
            };

            value.set = function( value ) {
                var old = this[ key ],
                    now;

                now = set.apply( this, arguments );
                this[ '_' + key ] = now;

                old !== now || this.emit( key + 'Change', now, old );
            };
        } );
        Object.defineProperties( this, PROPERTIES );

        // 绑定事件
        this.on( 'currentfileChange', function() {
            this.global = null;
            this.currentclass = '';
        });
    }
    util.inherits( Parser, ParserPlugin );

    util.extend( Parser.prototype, {

        resolveFor: function( value ) {
            var host = this.modules[ this.currentmodule ].classes,
                found;

            _.forEach( host, function( clazz, name ) {
                if ( clazz.shortname === value ) {
                    found = clazz.name;
                    return false;
                }
            });

            return found || value;
        },

        parse: function( raw ) {
            this.raw = raw;
            this.files = {};
            this.modules = {};
            this.walk();
            return this.toJson();
        },

        walk: function() {
            _.forEach( this.raw, this.processFile.bind( this ) );
        },

        processFile: function( arr, filename ) {
            this.currentfile = filename;
            arr.forEach( this.processBlock.bind( this ) );
        },

        processBlock: function( raw ) {
            var me = this,
                digesterKeys = Object.keys( DIGESTERS ),
                block = {
                    // raw: raw.raw
                },
                sortedTags,
                tick,
                host;

            // DIGESTERS中，越在上面的越先解析。
            sortedTags = _( raw.tags ).sortBy(function( tag ) {
                return digesterKeys.indexOf( ALIAS.hasOwnProperty( tag.tag ) ? ALIAS[ tag.tag ] : tag.tag );
            });

            tick = function() {
                var tag = sortedTags.shift(),
                    tagname, value, digester, ret;

                if ( !tag ) {
                    return;
                }

                tagname = ALIAS.hasOwnProperty( tag.tag ) ? ALIAS[ tag.tag ] : tag.tag;
                value = tag.value;
                digester = DIGESTERS[ tagname ];

                if ( digester ) {
                    digester = typeof digester === 'string' ? DIGESTERS[ digester ] : digester;
                    ret = digester.call( me, tagname, value, block, raw, tick );
                    host = host || ret;
                } else {
                    block[ tagname ] = value;
                }
                tick();
            }

            tick();
            host && util.extend( host, block );

            this.emit( 'afterProcessBlock', block );
        },

        toJson: function() {
            var json = {};
            json.files = this.files;
            json.modules = this.modules;

            return json;
        }
    } );

    exports.ParserPlugin = ParserPlugin;
    exports.Parser = Parser;
})();