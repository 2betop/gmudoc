(function() {
    'use strict';
    
    // 取出注释正文。去掉多余的星号空格。
    function trimAsterisk( str ) {
        return str
                .replace( /\r\n/gm, '\n' )
                .replace( /^\/\*\*.*(?!\*)/, '' )
                .replace( /\*+\/$/, '' )
                .replace( /^\s*\*\s?/mg, '' )
                .trim();
    }

    exports.parseComment = function( str ) {
        var ret = [],
            tags;

        str = trimAsterisk( str );
        
        // 如果第一段文字没有用tag包起来，则用desc包起来
        str = (/^@/.test( str ) ? '' : '@desc ') + str;

        tags = str.match( /@\w+[^@$]*/g );

        tags && tags.forEach(function( tag ) {
            var part = tag.trim().match( /^@(\w+)\s?([\s\S]*)$/ ),
                obj = {
                   key:  part[ 1 ],
                   val: part[ 2 ] 
                };
            
            switch( obj.key ) {

                case 'param':

                    // 如果是以下格式，则把信息分开
                    // @param {Number|String} name desc
                    if ( /^{(.*?)}\s+(\w+)\s+([\s\S]*)$/.test( obj.val ) ) {
                        obj.name = RegExp.$2;
                        obj.val = RegExp.$3;
                        obj.types = RegExp.$1.split( '|' )
                    }

                    break;

                case 'return':

                    // 如果是以下格式，则把信息分开
                    // @return {Number|String} desc
                    if ( /^{(.*?)}\s+([\s\S]*)$/.test( obj.val ) ) {
                        obj.val = RegExp.$2;
                        obj.types = RegExp.$1.split( / *[|,\/] */ )
                    }
                    break;
            }
            
            ret.push( obj );
        });

        return ret;
    }
})();