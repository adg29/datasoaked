var helpers = require('./helpers')
    , redis = require('redis')
    , sd = require('sharify').data
    , subscriptionPattern = 'channel:*'
    , pubSubClient
    , redisClient;


var pubSubClient;

if (sd.REDISTOGO_URL) {
  // inside if statement
  var rtg   = require("url").parse(sd.REDISTOGO_URL);
  pubSubClient = redis.createClient(rtg.port, rtg.hostname);
  pubSubClient.auth(rtg.auth.split(":")[1]); 
} else {
  pubSubClient = redis.createClient(sd.REDIS_PORT, sd.REDIS_HOST);
}

if (sd.REDISTOGO_URL) {
  // inside if statement
  var rtg   = require("url").parse(sd.REDISTOGO_URL);
  redisClient = redis.createClient(rtg.port, rtg.hostname);
  redisClient.auth(rtg.auth.split(":")[1]); 
} else {
  redisClient = redis.createClient(sd.REDIS_PORT, sd.REDIS_HOST);
}


pubSubClient.psubscribe(subscriptionPattern);


pubSubClient.on('pmessage', function(pattern, channel, message){
  //helpers.debug("Handling " + pattern + " pmessage: " + message);

  /* Every time we receive a message, we check to see if it matches
     the subscription pattern. If it does, then go ahead and parse it. */

  helpers.debug('pmessage from ' + pattern + " against " + subscriptionPattern)
  if(true||pattern == subscriptionPattern){
      try {
        var data = JSON.parse(message)['data'];
        
        // Channel name is really just a 'humanized' version of a slug
        // san-francisco turns into san francisco. Nothing fancy, just
        // works.
        var channelName = channel.split(':')[1].replace(/-/g, ' ');
      } catch (e) {
          helpers.debug('catch channel parse');
          helpers.debug(e);
          return;
      }
    
    // Store individual media JSON for retrieval by homepage later
    helpers.debug('Store individual media JSON for retrieval by homepage later');
    helpers.debug(channelName);
    //helpers.debug(data);
    for(index in data){
        var media = data[index];
        // helpers.debug('indexmedia');
        // helpers.debug(media);
        media.meta = {};
        media.meta.location = channelName;
        var redis_length;
          helpers.debug('INFO len ' + redisClient.server_info.used_memory_human);
          //helpers.debug(redisClient.server_info);
        redisClient.llen('media:'+channelName,function(err,len){
          redis_length = len;
          helpers.debug('redis_len ' + redis_length);
          if(redis_length>200||parseInt(redisClient.server_info.used_memory_human)>4){
            redisClient.ltrim("media:"+channelName,0,200,function (err, didSucceed) {
              helpers.debug('ltrimDidSucceed'); // true
              helpers.debug(JSON.stringify(err)); // true
              helpers.debug(didSucceed); // true
            });
          }
        });
        redisClient.lpush('media:'+channelName, JSON.stringify(media),function(err,result){
            // helpers.debug('lpushResult'); // true
            // helpers.debug(JSON.stringify(err)); // true
            // helpers.debug(result); // true
          });
    }
    
    // Send out whole update to the listeners
    var update = {
      'type': 'newMedia',
      'media': data,
      'channelName': channelName
    };
  }
});

exports.subscriptionPattern = subscriptionPattern;
