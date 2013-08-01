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
        returns: 'return'
    };

    // 定义如何去消化tag
    // key的顺序有关系，越在上面的越写得到解析。
    DIGESTERS = {

        // 将此block设置为global, 在其他block找不到必填属性时，从此block中取。
        fileoverview: function( tagname, value, block, raw ) {
            var m = this.files[ this.currentfile ];
            block[ tagname ] = value;
            return m;
        },

        // 文件依赖
        'import': function ( tagname, value, block, raw ) {
            value = value.split( rimportsplit );
            block[ tagname ] = value;
        },

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
            block.type = value.split(rtypesplit);
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

        'constructor': function( tagname, value, block, raw ) {
            block.isConstructor = true;
        },

        'static': function( tagname, value, block, raw ) {
            block.isStatic = true;
        },

        property: function( tagname, value, block, raw ) {
            var match;

            block.itemtype = tagname;

            match = rtype.exec( value );

            if ( match ) {
                block.type = match[ 2 ].trim().split( rtypesplit );
                value = match[ 1 ] + match[ 3 ];
            }

            match = rfirstworld.exec( value );

            if ( match ) {
                block.description = match[ 2 ];
                value = match[ 1 ];
            }

            block.name = value;
        },

        'method': 'property',
        'attribute': 'property',
        'config': 'property',
        'event': 'property',

        'class': function( tagname, value, block, raw ) {
            var notYetDefined = !block.itemtype;

            this.currentclass = value;
            block[ tagname ] = value;

            if ( notYetDefined ) {
                block.itemtype = tagname;

                return this.classes[ this.currentclass ];
            }
        },

        module: function( tagname, value, block, raw ) {
            var notYetDefined = !block.itemtype;

            this.currentmodule = value;
            block[ tagname ] = value;

            if ( notYetDefined ) {
                block.itemtype = tagname;

                return this.modules[ this.currentmodule ];
            }
        },

        'for': function( tagname, value, block, raw ) {
            value = this.resolveFor( value );
            this.currentclass = value;

            // 不影响后面的block自动定义成此class
            this.currentclass = null;

            switch( block.itemtype ) {
                case 'class':
                    // todo 等同于extensionfor

                    break;

                default:
                    block[ 'class' ] = value;
                    break;
            }
        },

        namespace: function( tagname, value, block, raw ) {
            var name = block[ block.itemtype ];

            if ( !name.indexOf( value + '.' ) === 0 ) {
                block.shortname = name;
                block[ block.itemtype ] = value + '.' + name;

                if ( block.itemtype === 'class' && this.classes[ name ] ) {
                    this.classes[ block[ block.itemtype ] ] = this.classes[ name ];
                    delete this.classes[ name ];
                }
            }

            block[ tagname ] = value;
        }

    };

    PROPERTIES = {
        currentmodule: {
            get: function() {
                return this._currentmodule;
            },

            set: function( val ) {
                if ( !this.modules[ val ] ) {
                    this.modules[ val ] = {
                        name: val,
                        classes: {},
                        items: {},
                        file: this.currentfile
                    };
                }
                return val;
            }
        },

        // 这里实际上是filename
        currentfile: {
            set: function( val ) {
                if ( !(val in this.files) ) {
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
                if ( !val ) {
                    return val;
                }

                if ( !(val in this.classes) ) {
                    this.classes[ val ] = {
                        name: val,
                        file: this.currentfile,
                        module: this.currentmodule,
                        classitems: {},
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
        util.eachObject( PROPERTIES, function( value, key ) {
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
            this.currentclass = '';
        });
    }
    util.inherits( Parser, ParserPlugin );

    util.extend( Parser.prototype, {

        resolveFor: function( value ) {
            var found;

            if ( !this.classes[ value ] ) {
                this.classes.forEach(function( clazz ){
                    clazz.shortname === value && (found = clazz.name);
                });
            }

            return found || value;
        },

        parse: function( raw ) {
            var files, modules, classes, classitems;

            this.raw = raw;
            files = this.files = {};
            modules = this.modules = {};
            classes = this.classes = {};
            classitems = this.classitems = [];
            this.walk();

            util.eachObject( modules, function( module, name ) {
                if ( module.file ) {
                    files[ module.file ].modules[ name ] = 1;
                }
            });

            util.eachObject(classes, function(clazz, name) {
                if ( clazz.module && modules[ clazz.module ] ) {
                    modules[ clazz.module ].classes[ name ] = 1;
                }

                if (clazz.file) {
                    files[ clazz.file ].classes[ name ] = 1;
                }
            });

            classitems.forEach(function( item ){
                var clazz = classes[ item[ 'class' ] ];
                clazz && (clazz.classitems[ item.name ] = 1);
            });

            return this.toJson();
        },

        walk: function() {
            util.eachObject( this.raw, this.processFile.bind( this ) );
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
                host;

            // DIGESTERS中，越在上面的越先解析。
            sortedTags = util._( raw.tags ).sortBy(function( tag ) {
                return digesterKeys.indexOf( ALIAS[ tag.tag ] || tag.tag );
            });

            sortedTags.forEach(function( tag ){
                var tagname = ALIAS[ tag.tag ] || tag.tag,
                    value = tag.value,
                    digester = DIGESTERS[ tagname ],
                    ret;

                if ( digester ) {
                    digester = typeof digester === 'string' ? DIGESTERS[ digester ] : digester;
                    ret = digester.call( me, tagname, value, block, raw );
                    host = host || ret;
                } else {
                    block[ tagname ] = value;
                }
            });

            if ( host ) {
                typeof host === 'function' ? host.call( this, block ) :
                        util.extend( host, block );
            } else if ( block.itemtype ) { // 只处理标记了的block
                this.classitems.push( block );
                block[ 'class' ] = block[ 'class' ] || this.currentclass;
                block.module = block.module || this.currentmodule;
            }

            this.emit( 'afterProcessBlock', block );
        },

        toJson: function() {
            var json = {};
            json.files = this.files;
            json.modules = this.modules;
            json.classes = this.classes;
            json.classitems = this.classitems;
            return json;
        }
    } );

    exports.ParserPlugin = ParserPlugin;
    exports.Parser = Parser;
})();