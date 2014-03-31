var redis = require('redis')
  , sd = require('sharify').data
  , settings = require('../settings')
  , http = require('request')
  , redisClient;



if (sd.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  redisClient =redis.createClient(rtg.port, rtg.hostname);
  redisClient.auth(rtg.auth.split(":")[1]); 
} else {
  redisClient = redis.createClient(sd.REDIS_PORT, sd.REDIS_HOST);
}

redisClient.on("error", function (err) {
  debug("ERROR: redisClient");
  debug(err);
});


function hashtag_media_get(hashtag,callback){
    // This function gets the most recent media stored in redis
  redisClient.lrange('media:'+hashtag, 0, sd.hashtag_items-1, function(error, media){
      // debug("getMedia: got " + media.length + " items");
      // Parse each media JSON to send to callback
      media = media.map(function(json){return JSON.parse(json);});
      if(media.length < sd.hashtag_items){
        hashtag_process(hashtag,"manual",function(media){
          callback(error,media);
        });
      }else{
        callback(error, media.reverse());
        //callback(error, media);
      }
  });
}



function hashtag_process(tag, update, callback){
  var path = '/tags/' + tag + '/media/recent/';
  var queryString = "?client_id="+ sd.IG_CLIENT_ID;
  hashtag_minid_get(tag, function(error,minID){
    if(minID){
      queryString += '&min_id=' + minID;
    } else {
        // If this is the first update, just grab the most recent.
      queryString += '&count='+sd.hashtag_items;
    }

    var options = {
      url: sd.API_URL + path + queryString,
      //url: sd.API_URL + sd.API_BASE_PATH + path + queryString,
      // Note that in all implementations, basePath will be ''. 
      // For internal APIs this is often not true ;)
    };

    console.log('hashtag process options')
    console.log(options)

    // Asynchronously ask the Instagram API for new media for a given
    // tag.
    http.get(options, function(e,i,response){
      var data = response;
      try {
        console.log(data);
        var parsedResponse = JSON.parse(data);
      } catch (parse_exception) {
        console.log('Couldn\'t parse data. Malformed?');
        console.log(parse_exception);
        return;
      }
      if(!parsedResponse || !parsedResponse['data']){
        console.log('Did not receive data for ' + tag +':');
        console.log(data);
        return;
      }
      hashtag_minid_set(tag, parsedResponse['data']);
        
      // Let all the redis listeners know that we've got new media.
      try{
        redisClient.publish('channel:' + tag , data);
        debug("*********Published: " + tag );
        debug("*********Published: " + data.length);
        if(update=="manual") {
          debug(parsedResponse);
          debug("*******manual: " + tag);
          debug("*********manual: " + data.length);
          debug("*********manual: " + parsedResponse.data.length);
          callback(parsedResponse.data);
        }
      }catch(e){
        debug("REDIS ERROR: redisClient.publish channel '" + tag);
        debug(e);
      }
    });
  });
}

function hashtag_minid_set(obj_id, data){
  var sorted = data.sort(function(a, b){
      return parseInt(b.id) - parseInt(a.id);
  });
  var nextMinID;
  try {
      nextMinID = parseInt(sorted[0].id);
      redisClient.set('min-id:channel:' + obj_id, nextMinID);
  } catch (e) {
      console.log('Error parsing min ID');
      console.log(sorted);
  }
}

function hashtag_minid_get(obj_id, callback){
  redisClient.get('min-id:channel:' + obj_id, callback);
}


function hashtag_minid_process(error,minID){
}

function debug(msg) {
  if (sd.debug) {
    console.log(msg);
  }
}
exports.debug = debug;


exports.hashtag_process = hashtag_process;
exports.hashtag_media_get = hashtag_media_get;
exports.hashtag_minid_get= hashtag_minid_get;
