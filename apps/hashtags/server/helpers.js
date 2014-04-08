var redis = require('redis')
  , sd = require('sharify').data
  , settings = require('../settings')
  , http = require('request')
  , async = require('async')
  , Twit = require('twit')
  , subscriptions = require('./subscriptions')
  , twit
  , redisClient;



if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  redisClient =redis.createClient(rtg.port, rtg.hostname);
  redisClient.auth(rtg.auth.split(":")[1]); 
} else {
  redisClient = redis.createClient(sd.REDIS_PORT, sd.REDIS_HOST);
}

redisClient.on("error", function (err) {
  debug("callback ERROR: redisClient");
  debug(err);
});


twit = new Twit({
  //   consumer_key:         'YSlfYB1TZrfdTOYFZO1C7vNlM'
  // , consumer_secret:      'RSeYd37CTb1pzdfNXPjrkTmSpdLNHaghxItQCVF3TiRdDIkxNK'
  // , access_token:         '6506472-iUZUCHc98lS3kpvWKbrZsCT1bljImPEiXVuXg5xs97'
  // , access_token_secret:  'jlFVXEHc1BNXmypi13VhAhVJ1MGo4aUkVuXqV8f5zPiWv'
  consumer_key: 'oGpm3szB2AmwqwRkkdQvdA'
  , consumer_secret: 'us6NPD7xwbPKWd3BKJMSSgkpg3kVd1WNGmzs9YtJs'
  , access_token: '6506472-JsyKyxIcX4zGQVEkjQdJdY7pm0AhAjfdthE9D0N79S'
  , access_token_secret: 'LvoDBaQAPcBMUEFxSuD4rONnTV7aodOF5h9sWaJtPvIVg'
})


function hashtag_media_get(hashtag,callback){
  // This function gets the most recent media stored in redis
  redisClient.zrevrange('media:'+hashtag, 0, sd.hashtag_items-1, function(error, media){
      debug('zrange callback')
      if(error===null){
        debug("getMedia: got " + media.length + " items");
        // Parse each media JSON to send to callback
        media = media.map(function(json){return JSON.parse(json);});
        if(true || media.length < sd.hashtag_items){
          hashtag_process(hashtag,"manual",function(media){
            callback(error,media);
          });
        }else{
          debug('media_get via zrange')
          callback(error, media);
        }
      }else{
        debug('zrange error')
        debug(error);
      }
  });
}

function subscribe(hashtag,host){
  var options = {url:sd.IG_API_URL+"/subscriptions"
    ,form:{ object:'tag'
            , aspect:'media'
            , object_id:hashtag
            , callback_url: 'http://'+host+'/callbacks/tag/'+hashtag
            , client_id:sd.IG_CLIENT_ID
            , client_secret:sd.IG_CLIENT_SECRET
          }};

  var stream = twit.stream('statuses/filter', { track: hashtag });

  stream.on('tweet', function (t) {
    debug('tweet');
    var tweet = {statuses:[t]};
    try{
      redisClient.publish('channel:twitter:' + hashtag , JSON.stringify(tweet));
      debug("*********Published: " + hashtag );
    }catch(e){
      debug("REDIS ERROR: redisClient.publish streaming twitter channel " + hashtag);
      debug(e);
      return;
    }
  });

  // debug('subscribe:')
  // debug(options)
  http.post(options,function(e,i,r){
    // debug('error')
    // debug(e)
    // debug(r);
  });
}




function hashtag_process(tag, update, process_callback){
  var path = '/tags/' + tag + '/media/recent/';
  var queryString = "?client_id="+ sd.IG_CLIENT_ID;

  async.parallel({
      twitter: function(callback) {
          debug('twitter');
          // _hashtag_process_twitter
          twit.get('search/tweets', { q: tag, count: sd.hashtag_items}, function(err, reply) {
            debug('twitter parsedResponse');
            try{
              // debug("*********Published: " + JSON.stringify(reply));
              redisClient.publish('channel:twitter:' + tag , JSON.stringify(reply));
              //function(e){ callback(null,new Error); return; }
              debug("*********Published: " + tag );
              // debug("*********Published: " + JSON.stringify(reply));
              if(update=="manual") {
                debug("*******manual: " + tag);
                debug("*********manual: " + reply.statuses.length);
                callback(null,reply.statuses);
                return;
              }
            }catch(e){
              debug("REDIS ERROR: redisClient.publish twitter channel " + tag);
              debug(e);
              callback(null,e);
              return;
            }
          });
      },
      instagram: function(callback) {
        debug('hashtag_minid_get');
        hashtag_minid_get(tag, function(error,minID){
          debug(minID);
          if(minID){
            queryString += '&min_id=' + minID;
          } else {
              // If this is the first update, just grab the most recent.
            queryString += '&count='+sd.hashtag_items;
          }


          var options = {
            url: sd.IG_API_URL + path + queryString,
            //url: sd.IG_API_URL + sd.IG_API_BASE_PATH + path + queryString,
            // Note that in all implementations, basePath will be ''. 
            // For internal APIs this is often not true ;)
          };

          // Asynchronously ask the Instagram API for new media for a given
          // tag.
          http.get(options, function(e,i,response){
            var data = response;
            try {
              var parsedResponse = JSON.parse(data);
            } catch (parse_exception) {
              debug('Couldn\'t parse data. Malformed?');
              debug(parse_exception);
              callback(null,parse_exception);
              return;
            }
            if(!parsedResponse || !parsedResponse['data']){
              debug('Did not receive data for ' + tag +':');
              debug(data);
              callback(null,new Error);
              return;
            }
            hashtag_minid_set(tag, parsedResponse['data']);
              
            // Let all the redis listeners know that we've got new media.
            try{
              redisClient.publish('channel:instagram:' + tag , data);
              debug("*********Published: " + tag );
              debug("*********Published: " + data.length);
              if(update=="manual") {
                debug("*******manual: " + tag);
                debug("*********manual: " + data.length);
                debug("*********manual: " + parsedResponse.data.length);
                callback(null,parsedResponse.data);
                return;
              }
            }catch(e){
              debug("REDIS ERROR: redisClient.publish channel '" + tag);
              debug(e);
              callback(null,e);
              return;
            }
          });
        });
      }
  }, function(err, results) {
      debug('async results')
      if(!(results.instagram instanceof Error) && ! (results.twitter instanceof Error) ){
        debug('both')
        if(update=="manual") process_callback(results.twitter.concat(results.instagram));
      }
      else if(! (results.instagram instanceof Error) ){
        debug('insta')
        if(update=="manual") process_callback(results.instagram);
      }
      else if(! (results.twitter instanceof Error) ){
        debug('twit')
        if(update=="manual") process_callback(results.twitter);
      }
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
      debug('Error parsing min ID');
      debug(sorted);
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
    if (msg instanceof Error)
      console.log(msg.stack)
  }
}
exports.debug = debug;

exports.subscribe = subscribe;
exports.hashtag_process = hashtag_process;
exports.hashtag_media_get = hashtag_media_get;
exports.hashtag_minid_get= hashtag_minid_get;
