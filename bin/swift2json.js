// /mnt/hqfile_data/Shadi/swift-datedPdfs/IncomingMsgs/15570035-20160307_082026.txt');

var reverseMustache = require('reverse-mustache');
var fs = require('fs');
// var util = require('util');
var path = require('path');
var stringify = require('json-stable-stringify');

var bankingSwiftMessages = require('../lib/banking-swift-messages.js');

var filename = process.argv[2];
fs.statSync(filename); // will throw error if inexistant

try {
  var json = bankingSwiftMessages.parse(filename);

  // output sorted keys
  // https://www.npmjs.com/package/json-stable-stringify
  // THIS IS NOT SORTED: console.log(util.inspect(parsed,false,null));
  console.log(stringify(json,{space:4}));
} catch(err) {
    console.error(err); 
    process.exit(1);
}
