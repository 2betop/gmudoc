(function() {
    'use strict';

    var _ = require( 'underscore' );

    function Organizer( opts ) {
        this._options = opts = _.extend( {}, opts );
        this.baseDir = opts.cwd || '';
        this._hash = {};
        this.root = {
            children: []
        };
    }

    _.extend( Organizer.prototype, {

        organize: function( raw ) {
            var me = this;

            me.raw = raw;
            eachObject( raw, me.organizeItem.bind( me ) );
        },

        organizeItem: function( comments ) {
            var me = this,
                nodes = comments.map( Node )
                    .filter( me.detectType.bind( me ) ),
                fileNode,
                lastModuleNode,
                lastClassNode;

            // 第一步先把fileNode找出来。
            nodes.filter(function( node ){
                fileNode = node.type === 'fileoverview' && node;
                return !fileNode;
            }).forEach(function( node ){
                var module,
                    klass,
                    parent;

                me.beforeSet( node );

                switch ( node.type ) {
                    case 'module':
                    case 'submodule':
                        me.setModule( node );
                        lastModuleNode = node;
                        break;

                    case 'class':
                        module = node.module || fileNode.module || lastModuleNode &&
                                lastModuleNode.module || 'temp';

                        node.set( 'module', module );
                        me.setClass( node, module );
                        lastClassNode = node;
                        break;

                    default:
                        module = node.module || fileNode.module ||
                                lastClassNode && lastClassNode.module ||
                                lastModuleNode && lastModuleNode.module || 'temp';

                        node.set( 'module', module );

                        klass = node.class || fileNode.class ||
                                lastClassNode && lastClassNode.class;
                        klass && node.set( 'class', klass );

                        parent =  klass ? me.getClass( klass, module ) : me.getModule( module );
                        parent.children.push( node );
                        break;
                }

                me.afterSet( node );
            });
        },

        getModule: function( name ) {
            if ( !this._hash[ name ] ) {
                this._hash[ name ] = {
                    name: name,
                    children: [],
                    temp: true
                };
                this.root.children.push( this._hash[ name ] );
            }

            return this._hash[ name ];
        },

        setModule: function( node ) {
            
            // @todo
            if ( node.type === 'submodule' ) {

            }

            var name = node.submodule || node.module,
                old = this._hash[ name ] || this._hash[ 'temp' ],
                idx;

            if ( old ) {
                idx = this.root.children.indexOf( old );
                this.root.children.splice( idx, 1, node );
            } else {
                this.root.children.push( node );
            }

            node.children = old ? old.children : [];
            
            this._hash[ name ] = node;
        },

        getClass: function( name, module ) {
            var key;

            module = this.getModule( module );
            key = module.name + ':' + name;

            if ( !this._hash[ key ] ) {
                this._hash[ key ] = {
                    name: name,
                    children: [],
                    temp: true
                };
                module.children.push( this._hash[ key ] );
            }

            return this._hash[ key ];
        },

        setClass: function( node, module ) {
            var name = node.class,
                key,
                old,
                idx;

            module = this.getModule( module );
            key = module.name + ':' + name;
            old = this._hash[ key ];

            if( old ) {
                idx = module.children.indexOf( old );
                module.children.splice( idx, 1, node );
            } else {
                module.children.push( node );
            }

            node.children = old ? old.children : [];
            this._hash[ key ] = node;
        },


        detectType: function( node ) {
            var candidates = [ 'fileoverview', 'module', 'submodule', 'class', 'method', 'property', 'attribute', 'event' ],
                len = candidates.length,
                type;

            while ( len-- ) {
                if ( node.has( candidates[ len ] ) ) {
                    type = candidates[ len ];
                    break;
                }
            }

            if ( !type && node.has( 'constructor' ) ) {
                type = 'method';
            }

            assignObject( node, 'type', type );

            return !!type;
        },

        // 没想到什么好名字，在插入之前执行，可以用来预处理node
        beforeSet: function( node ) {
            switch( node.type ) {
                case 'property':
                    if ( typeof node.property === 'object' ) {
                        node.has( 'name' ) || node.set( 'name', node.property.name );
                        node.has( 'types' ) || node.set( 'types', node.property.types );
                        node.has( 'description' ) || node.set( 'description', node.property.description );
                    }

                    break;
            }
        },

        afterSet: function( node ) {
            node.lock();
        }

    } );

    // 遍历对象
    function eachObject( obj, iterator ) {
        obj && Object.keys( obj ).forEach(function( key ) {
            iterator( obj[ key ], key );
        });
    }

    function assignObject( obj, name, value ) {
        Object.defineProperty( obj, name, {
            value: value,
            writable: true,
            enumerable: false,
            configurable: false
        } );
    }

    function Node( metas ) {
        var obj = Object.create( Node.prototype );

        assignObject( obj, 'length', 0 );
        assignObject( obj, '_hash', {} );

        metas && metas.forEach(function( meta ) {
            obj.add( meta.key, meta.value );
        });

        return obj;
    }

    _.extend( Node.prototype, {

        // 提供更好的遍历方式。
        forEach: function( iterator ) {
            eachObject( this, function( val ) {
                iterator( val.value, val.key );
            } );
        },

        has : function( key ) {
            return this._hash.hasOwnProperty( key );
        },

        get: function( key ) {
            return this.has( key ) ? this._hash[ key ] : null;
        },

        lock: function() {

        },

        set: function( key, val ) {
            var hash = this._hash,
                len;

            if ( hash[ key ] ) {
                len = this.length;
                while ( len-- ) {
                    this[ len ].key === key && [].splice.call( this, len, 1 );
                }

                this[ key ] = val;
            } else {
                assignObject( this, key, val );
            }

            hash[ key ] = val;
            this[ this.length++ ] = { key: key, value: val };
        },

        add: function( key, val ) {
            var hash = this._hash;

            if ( hash[ key ] ) {
                hash[ key ] = Array.isArray( hash[ key ] ) ? hash[ key ]: [ hash[ key ] ];
                hash[ key ].push( val );
                this[ key ] = hash[ key ];
            } else {
                hash[ key ] = val;
                assignObject( this, key, val );
            }

            this[ this.length++ ] = { key: key, value: val };
        }
    } );

    module.exports = Organizer;
})();