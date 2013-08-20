/**
 * 视图工具类
 */

( function () {

    "use strict";

    var defini = require( "../../new/lib/definition"),
        fs = require( "fs" ),
        ejs = require( 'ejs' ),
        fileOptions = {
            encoding: 'utf-8'
        },
        ITEM_TYPE = defini.TYPE;

    module.exports = {

        //解析method签名
        parseSignature: function ( data, isLink ) {

            var anchor = this.getPath( data ),
                isLink = !!isLink,
                tpl = null;

            //链接
            if ( isLink ) {

                tpl = fs.readFileSync( '../views/ueditor2/tpl/member/signature.link.ejs', fileOptions );

                return ejs.render( tpl, {
                    anchor: anchor,
                    name: data.name,
                    params: data.param
                } );

                //锚点
            } else {

                tpl = fs.readFileSync( '../views/ueditor2/tpl/member/signature.anchor.ejs', fileOptions );

                return ejs.render( tpl, {
                    anchor: anchor,
                    name: data.name,
                    params: data.param
                } );

            }

        },

        //获取当前处理对象的路径
        getPath: function ( data ) {

            switch ( data.__type ) {

                case ITEM_TYPE.MODULE:

                    return data.name;

                case ITEM_TYPE.CLASS:

                    return data.module + "." + data.name;

                case ITEM_TYPE.METHOD:
                case ITEM_TYPE.CONSTRUCTOR:

                    return this.getMethodPath( data );

                case ITEM_TYPE.PROPERTY:

                    return this.getPropertyPath( data );

                default:

                    return data.module + "." + data.class + ":" + data.name;

            }

        },

        getMethodPath: function ( data ) {

            var start = data.module + "." + data.class + ":" + data.name,
                paramStr = [];

            data.param && data.param.forEach( function ( par ) {
                paramStr.push( par.type );
            } );

            paramStr = "(" + paramStr.join( "," ) + ")";

            return start + paramStr;

        },

        getPropertyPath: function ( data ) {

            var start = data.module;

            if ( data.hasOwnProperty( "class" ) ) {
                start += "." + data[ 'class' ];
            }

            //静态属性和实力属性的path是有区别的
            if ( data.hasOwnProperty( "static" ) ) {

                start += "." + data.name;

            } else {

                start += ":" + data.name;

            }

            return start;

        },

        getMembers: function ( type, data ) {

            var result = [],
                tmp = null;

            data.__member && data.__member.forEach( function ( memberData ) {

                if ( memberData.__type === type ) {
                    result.push( memberData );
                }

            } );

            return result;

        }

    };

} )();