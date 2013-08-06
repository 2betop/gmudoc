( function() {

    var Doc = require('./doc.js'),
        doc = new Doc( {
            files: [ './Editor.js' ],
            outputDir: './'
        } ),
        fs = require('fs');
//        data = fs.readFile( "./debug.json", {
//            encoding: 'utf-8',
//            flag: 'r'
//        }, function ( err, data ) {
//
//            if ( err ) {
//                throw err;
//            }
//
//            doc.run();
////            doc._build( JSON.parse( data ) );
//
//        } );
        doc.run();



//    doc.run();

} )();