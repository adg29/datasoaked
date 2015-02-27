var redis = require('redis')
  , sd = require('sharify').data
  , util = require('util')
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
      debug('REDIS zrange callback')
      if(error===null){
        debug("REDIS getMedia: got " + media.length + " items");
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

  http.post(options,function(e,i,r){
    // debug('error')
    // debug(e)
    // adebug('***InstaPOST');
    // adebug(r);
  });

  var stream = twit.stream('statuses/filter', { track: hashtag });

  stream.on('tweet', function (t) {
    // debug('tweet');
    var tweet = {statuses:[t]};
    try{
      // redisClient.publish('channel:twitter:' + hashtag , JSON.stringify(tweet));
      // adebug("*********Published: streaming twitter channel " + hashtag);
    }catch(e){
      // adebug("REDIS ERROR: redisClient.publish streaming twitter channel " + hashtag);
      debug(e);
      return;
    }
  });

}




function hashtag_process(tag, update, process_callback){
  var path = '/tags/' + tag + '/media/recent/';
  var queryString = "?client_id="+ sd.IG_CLIENT_ID;

  async.parallel({
      twitter: function(callback) {
          debug('ASYNC twitter');
          // #TEMP gate to avoid calling twitter
          callback(null,[])
          return;
          twit.get('search/tweets', { q: tag, count: sd.hashtag_items}, function(err, reply) {
            debug('API TWIT reply');
            if(err==null && typeof(reply)!='undefined'){
              try{
                // debug("PMESSAGE twitter sending");
                // redisClient.publish('channel:twitter:' + tag , JSON.stringify(reply));
                //function(e){ callback(null,new Error); return; }
                if(update=="manual") { // #ISSUE manual is unclear. Likely refers to an API request trigerred by a browser rathern than a socket
                  debug("API TWIT manual: " + tag);
                  debug("API TWIT manual: " + reply.statuses.length);
                  callback(null,reply.statuses);
                  return;
                }
              }catch(e){
                debug("REDIS ERROR: redisClient.publish twitter channel " + tag);
                debug(e);
                callback(null,e);
                return;
              }
            }else{
              debug('TWIT ERROR')
              debug(JSON.stringify(err));
              callback(null,new Error(JSON.stringify(err)));
              return;
            }
          });
      },
      instagram: function(callback) {
        // Build query string  based on redis record
        debug('ASYNC INSTA hashtag_minid_get via redis');
        hashtag_minid_get(tag, function(error,minID){
          // debug(minID);
          if(minID){
            queryString += '&min_id=' + minID;
          } else {
              // If this is the first update, just grab the most recent.
            queryString += '&count='+sd.hashtag_items;
          }

          var options = {
            url: sd.IG_API_URL + path + queryString,
            //url: sd.IG_API_URL + sd.IG_API_BASE_PATH + path + queryString // Note that in all implementations, basePath will be ''. For internal APIs this is often not true ;)
          };

          // Asynchronously ask the Instagram API for new media for a given tag.
          // #TODO should not be making API calls if no one is expecting an update. a potential ratelimit #ISSUE
          http.get(options, function(e,res,response){
            if(e){
                debug('ASYNC INSTA ERROR',e)
                callback(null,new Error(e));
            }else if(typeof res!='undefined'){
              debug("API INSTA " + res.headers['x-ratelimit-remaining'] + " remaining - on /callbacks/instagram/tag/" + tag);
              // Check response for ratelimit remaining value and delete subscriptions
              // if remaining count is low
              if( parseInt(res.headers['x-ratelimit-remaining'])<=250 ){
                // #TODO save x-ratelimit-remaining AND query before subscribing or requesting new media

                var del_queryString = "?client_id="+ sd.IG_CLIENT_ID + "&client_secret="+ sd.IG_CLIENT_SECRET + "&object=all";
                var del_options = {
                  url: sd.IG_API_URL + '/subscriptions' + del_queryString
                };
                http.del(del_options, function(e,res,response){
                  debug('insta http del \n' +  util.inspect(response,false,null) );
                });
              }
              // Data in response contains collection of media items, some of which could be duplicates
              var data = response;

              try {
                var parsedResponse = JSON.parse(data);
              } catch (parse_exception) {
                debug('Couldn\'t parse data. Malformed?');
                debug(parse_exception);
                // async parallel callback
                callback(null,parse_exception);
                return;
              }
              if(!parsedResponse || !parsedResponse['data']){
                debug('Did not receive data for ' + tag +':');
                debug(data);
                // async parallel callback
                callback(null,new Error);
                return;
              }

              hashtag_minid_set(tag, parsedResponse['data']);
                
              // Redis publishing
              if(e==null && typeof(data)!='undefined'){
                try{
                  debug("PMESSAGE insta sending");
                  // Redis pubsub listener will receive this payload and save the records
                  redisClient.publish('channel:instagram:' + tag , data);
                  // adebug("*********hashtag_process publishing: " + tag );
                  if(update=="manual") {
                    debug("REDIS manual: " + tag);
                    adebug("REDIS manual: " + parsedResponse.data.length);
                    // async parallel callback
                    callback(null,parsedResponse.data);
                    return;
                  }
                }catch(e){
                  debug("REDIS ERROR: redisClient.publish channel '" + tag);
                  debug(e);
                  // async parallel callback
                  callback(null,e);
                  return;
                }
              }else{
                debug('INSTA ERROR:')
                debug(e)
                // async parallel callback
                callback(null,new Error(JSON.stringify(e)));
              }
            }
          });
        });
      }
  }, function(err, results) {
      adebug('ASYNC result #ISSUE very unclear if process_callback is defined and what it is, seems to be linked to manual updates'); // debug( util.inspect(results,false,null) );
      if(!(results.instagram instanceof Error) && ! (results.twitter instanceof Error) ){
        adebug('both')
        if(update=="manual") process_callback(results.twitter.concat(results.instagram));
      }
      else if(! (results.instagram instanceof Error) ){
        adebug('insta')
        if(update=="manual") process_callback(results.instagram);
      }
      else if(! (results.twitter instanceof Error) ){
        adebug('twit')
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

function adebug(msg) {
    console.log(msg);
    if (msg instanceof Error)
      console.log(msg.stack)
    if (msg instanceof Object)
      console.log( util.inspect(msg,false,null) );
}
exports.adebug = adebug;

exports.subscribe = subscribe;
exports.hashtag_process = hashtag_process;
exports.hashtag_media_get = hashtag_media_get;
exports.hashtag_minid_get= hashtag_minid_get;
