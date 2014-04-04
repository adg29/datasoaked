var c = require('../../../config')
    , helpers = require('./helpers')
    , redis = require('redis')
    , moment = require('moment')
    , sd = require('sharify').data
    , subscriptionPattern = '*:*:*'
    , pubSubClient
    , redisClient;


var pubSubClient;

if (process.env.REDISTOGO_URL) {
  // inside if statement
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  pubSubClient = redis.createClient(rtg.port, rtg.hostname);
  pubSubClient.auth(rtg.auth.split(":")[1]); 
} else {
  pubSubClient = redis.createClient(sd.REDIS_PORT, sd.REDIS_HOST);
}

if (process.env.REDISTOGO_URL) {
  // inside if statement
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
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
  var channel_split = channel.split(':')
    , data;
  if(true||pattern == subscriptionPattern){
      try {
        // this is where the pmessage comes in
        // the data from different apis will be structured differently
        // account for this in the json parse message data
        if(channel_split[1]=="twitter"){
          helpers.debug('twitter pmessage')
          data = JSON.parse(message).statuses;
        }else{
          helpers.debug('insta pmessage')
          data = JSON.parse(message).data;
        }

        // Channel name is really just a 'humanized' version of a slug
        // san-francisco turns into san francisco. Nothing fancy, just
        // works.
        var channelName = channel_split[2].replace(/-/g, ' ');
        helpers.debug(channelName);
      } catch (e) {
          helpers.debug('catch channel parse');
          helpers.debug(e);
          return;
      }
    
    // Store individual media JSON for retrieval by homepage later
    helpers.debug('Store individual media JSON for retrieval by homepage later');
    // helpers.debug(data);
    for(index in data){
        var media = data[index]
          , media_weight;
        if(channel_split[1]=="twitter"){
          media_weight = moment(media.created_at).unix();
        }else{
          media_weight = media.created_time;
        }
        // helpers.debug('indexmedia');
        // helpers.debug(media_weight);
        media.meta = {};
        media.meta.location = channelName;
        var redis_length;
        // helpers.debug('INFO len ' + redisClient.server_info.used_memory_human);
        //helpers.debug(redisClient.server_info);
        redisClient.zcount('media:'+channelName,'-inf', '+inf',function(err,len){
          redis_length = len;
          // helpers.debug('redis_len ' + redis_length);
          // helpers.debug(err);
          // #TODO redis trimming length should be a setting
          if(redis_length>200||parseInt(redisClient.server_info.used_memory_human)>4){
            redisClient.zremrangebyrank("media:"+channelName,0,200,function (err, didSucceed) {
              // helpers.debug('zrem didSucceed'); // true
              // helpers.debug(err); // true
              // helpers.debug(didSucceed); // true
            });
          }
        });
        redisClient.zadd('media:'+channelName, media_weight, JSON.stringify(media),function(err,result){
            // helpers.debug('zaddResult'); // true
            // helpers.debug(err); // true
            // helpers.debug(result); // true
          });
    }
    
    // Send out whole update to the listeners
    var update = {
      'type': 'newMedia',
      'media': data,
      'channelName': channelName
    };
    for(sessionId in c.io_clients){
      try{
        helpers.debug('try socket clients send') 
        helpers.debug(sessionId) 
        var client = c.io_clients[sessionId];
        client.send(JSON.stringify(update));
      }catch (e) {
        helpers.debug('catch socket clients send') 
        helpers.debug(sessionId) 
        helpers.debug(update) 
        helpers.debug(e) 
      }
    }
  }
});

exports.subscriptionPattern = subscriptionPattern;
