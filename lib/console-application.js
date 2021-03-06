/*jshint esversion: 6 */

// var util = require('util');
var stringify = require('json-stable-stringify'),
  bankingSwiftMessages = require('../lib/banking-swift-messages.js'),
  mongoHandler = require('../lib/mongo-handler.js'),
  co = require('co'),
  basename = require('basename')
;

//--------------------------
// https://github.com/janl/mustache.js/blob/master/bin/mustache#L130
function usage() {
    console.error("Error: Usage ... swift2json -f path/to/filename.txt [-m localhost]");
    console.error("                 swift2json -d path/to/folder       [-m localhost]");
    console.error("Note that either -d or -f is allowed. Also, -d requires -m");
    process.exit(3);
}


function getParam(option) {
  var mIndex = process.argv.indexOf(option);
  if(mIndex === -1) {
    return false;
  }
  return process.argv.splice(mIndex, 2)[1];
}

// 255 is selected for xargs in the dockerfile
// http://stackoverflow.com/a/26485626/4126114
function mongoErr(err) {
  console.error("Mongo error: "+err.stack);
  process.exit(255);
}

function handleFile(filename) {
  var json;
  try {
    // this is an array of json for each transfer in the swift text file
    json = bankingSwiftMessages.parse(filename);
  } catch(err) {
    // before throwing, I want to save the error in mongo
    if(mongoHandler.hostname) {
      return mongoHandler.upsert(filename,{error:err.message}).then(
        function() {
          console.log("Saved to mongo the ERROR of "+filename);
          // now throw
          throw err;
        },
        mongoErr
      );
    }
    // now throw
    throw err;
  }

  if(mongoHandler.hostname) {
    return json.map(function(single,index) {
      var key = basename(filename)+(json.length>1?"_"+index:"");
      mongoHandler.upsert(
        key, // note that this gets a basename again, so I cant use "/" as separator from the index
        single
      ).then(
        function() {
          console.log(
            "Saved to mongo "+
            (json.length>1?("part "+index+" of "):"")+
            "the PARSED JSON of "+filename
          );
        },
        mongoErr
      );
    });
  }

  // output sorted keys
  // https://www.npmjs.com/package/json-stable-stringify
  // THIS IS NOT SORTED: console.log(util.inspect(parsed,false,null));
  console.log(stringify(json,{space:4}));
}

function checkMongo(filename) {
  if(!mongoHandler.hostname) {
    return co(function*() {
      // empty
    });
  }

  return mongoHandler.get(filename).then(function(doc) {
    if(doc.length === 1) {
      throw new Error("Already found in mongo. Skipping: "+filename);
    }
  }, mongoErr);
}


module.exports.process = function(filename) {
  return checkMongo(filename).then(function() {
    handleFile(filename);
  }).catch(function(err) {
    throw err;
  });
};
module.exports.usage = usage;
module.exports.getParam = getParam;
module.exports.setHost = function(mh) {
  if(mh) {
    mongoHandler.hostname = mh;
  }
};
