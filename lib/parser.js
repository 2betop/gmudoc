(function() {
    'use strict';

    var util = require( './util.js' ),
        EventEmitter = require( 'events' ).EventEmitter,
        ALIAS,
        DIGESTERS,
        PROPERTIES;

    // interface
    function notImplemented() {
        throw new Error( 'Not implemented!' );
    }

    function ParserPlugin() {
    }
    util.inherits( ParserPlugin, EventEmitter );
    ParserPlugin.prototype.parse = notImplemented;

    // tag short name.
    ALIAS = {
        imports: 'import',
        desc: 'description',
        file: 'fileoverview'
    };

    // 定义如何去消化tag
    DIGESTERS = {
        param: function( tagname, value, block, raw ) {

        },

        // 将此block设置为global, 在其他block找不到必填属性时，从此block中取。
        fileoverview: function( tagname, value, block, raw ) {
            this.global = block;
            block[ tagname ] = value;
            this.once( 'afterProcessBlock', function() {
                util.extend( this.files[ this.currentfile ], block );
            });
        },

        // 文件依赖
        'import': function ( tagname, value, block, raw ) {
            value = value.split(/\s*,\s*/g);
            block[ tagname ] = value;
        },

        module: function( tagname, value, block, raw ) {
            block.itemtype || (this.currentmodule = value);
            block[ tagname ] = value;
            //todo 把module的描述加上去。
        },

        'class': function( tagname, value, block, raw ) {
            block.itemtype || (this.currentClass = value);
            block[ tagname ] = value;
        },

        /**
         * @property {[type]} [propName] [description]
         * @param  {[type]} tagname [description]
         * @param  {[type]} value   [description]
         * @param  {[type]} block   [description]
         * @param  {[type]} raw     [description]
         * @return {[type]}         [description]
         */
        property: function( tagname, value, block, raw ) {
            block.itemtype = tagname;

            if ( !/^\{([^}]+)\}\s+(\w+)\s([\s\S]*)$/.test( value ) ) {
                block.type = RegExp.$1;
                block.name = RegExp.$2;
                block.description = RegExp.$3;
            }

            block.name = value;
        },

        'method': 'property',
        'attribute': 'property',
        'config': 'property',
        'event': 'property',

    };

    PROPERTIES = {
        currentmodule: {
            get: function() {
                if ( !this._currentmodule ) {
                    this.currentmodule = 'tempModule';
                }
            },

            set: function( val ) {
                if ( val !== 'tempModule' && this.modules[ 'tempModule' ] ) {
                    this.modules[ val ] = this.modules[ 'tempModule' ];
                    this.modules[ val ].name = val;
                    delete this.modules[ 'tempModule' ];
                }

                if ( !this.modules[ val ] ) {
                    this.modules[val] = {
                        name: val,
                        submodules: {},
                        classes: {},
                        fors: {},
                        namespaces: {}
                    };
                }
                return val;
            }
        },
        currentsubmodule: {

        },
        global: {},
        currentClass: {},

        // 这里实际上是filename
        currentfile: {
            set: function( val ) {
                if ( !(val in this.files) ) {
                    this.files[ val ] = {
                        name: val,
                        modules: {},
                        classes: {},
                        fors: {},
                        namespaces: {}
                    };
                }
                return val;
            }
        },

        currentnamespace: {
            set: function(val) {
                this.lastnamespace = this.currentnamespace;
                return val;
            }
        },
        lastnamespace: {

        },
        lastclass: {

        },

        currentclass: {

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

                if ( (now = set.apply( this, arguments )) ) {
                    this[ '_' + key ] = now;
                } else {
                    now = this[ '_' + key ];
                }

                old !== now || this.emit( key + 'Change', now, old );
            };
        } );
        Object.defineProperties( this, PROPERTIES );

        // 绑定事件
    }
    util.inherits( Parser, ParserPlugin );

    util.extend( Parser.prototype, {

        parse: function( raw ) {
            this.raw = raw;
            this.files = {};
            this.modules = {};
            this.classes = {};
            this.classitems = [];
            this.walk();
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
                block = {
                    raw: raw.raw
                },
                host;

            raw.tags.forEach(function(tag){
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
                util.extend( block, host );
            } else {
                this.classitems.push(block);
                block['class'] = this.class;
                block.module = this.module;
                host = this.submodule;

                if ( host ) {
                    block.submodule = host;
                }
                host = this.namespace;

                if ( host ) {
                    block.namespace = host;
                }
            }

            this.emit( 'afterProcessBlock', block );
        },

        toJson: function() {
            debugger;
        }
    } );

    exports.ParserPlugin = ParserPlugin;
    exports.Parser = Parser;
})();