var c = require('../../../config')
    , helpers = require('./helpers')
    , util = require('util')
    , redis = require('redis')
    , moment = require('moment')
    , sd = require('sharify').data
    , subscriptionPattern = '*:*:*'
    , pubSubClient
    , redisClient;


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

var pubSubErrorCallback = function (err) {
  helpers.debug("ERROR: pubSubClient");
  helpers.debug(err);
};

pubSubClient.on("error", pubSubErrorCallback);

var redisErrorCallback = function (err) {
  helpers.debug("ERROR: redisClient subscriptions.js");
  helpers.debug(err);
};

redisClient.on("error", redisErrorCallback);


pubSubClient.psubscribe(subscriptionPattern);


pubSubClient.on('pmessage', function(pattern, channel, message){
  /* Every time we receive a message, we check to see if it matches
     the subscription pattern. If it does, then go ahead and parse it. */
  // helpers.debug('pmessage from ' + pattern + " against " + subscriptionPattern)
  var channel_split = channel.split(':')
    , data;
  if(true||pattern == subscriptionPattern){
      try {
        // this is where the pmessage comes in
        // the data from different apis will be structured differently
        // account for this in the json parse message data
        if(channel_split[1]=="twitter"){
          helpers.debug('PUBSUB twitter pmessage', channelName);
          data = JSON.parse(message).statuses;
        }else{
          helpers.debug('PUBSUB insta pmessage', channelName);
          data = JSON.parse(message).data;
        }

        // Channel name is really just a 'humanized' version of a slug san-francisco turns into san francisco. Nothing fancy, just works.
        var channelName = channel_split[2].replace(/-/g, ' ');
      } catch (e) {
          helpers.debug('catch channel parse');
          helpers.debug(e);
          return;
      }

      //PUBSUB
      // can do this directly in async process
      // should not send a message for each piece of data
      var pubsub_update = {
        'type': 'newMedia',
        'media': data,
        'channelSrc': channel_split[1],
        'channelName': channelName
      };


      try{
        var ioNS = '/tag/'+channelName;
        helpers.debug('SOCKETIO EMIT ' + channelName);
        io.of(ioNS).emit('message',pubsub_update);
      }catch (e) {
        helpers.debug('SOCKETIO ERROR emit');
        // helpers.debug(update);
        helpers.debug(e);
      }



      /* REDIS helper method for a sorted record of hashtag items*/
      var mediaZadd = function(channelName , channel_split, media, media_weight, data){
        redisClient.zadd('media:'+channelName, media_weight, JSON.stringify(media),function(err,result){
          if(err){
            helpers.debug('REDIS zadd ERROR ');
            redisErrorCallback(err);
          }
          redisClient.expire('media:'+channelName, 60,function(err,result){
            // helpers.debug('expireZaddResult'); // true
            // helpers.debug(JSON.stringify(err)); // true
            // helpers.debug(result); // true
          });
        });

        /* 
          #TODO #ISSUE 
          too many cio_clients being created per tag 
        // console.log( util.inspect(c.io_clients),false,null );
        var channelClient = c.io_clients['/tag/'+channelName];
        if(typeof channelClient!='undefined' && Array.isArray(channelClient)){
          // helpers.debug( util.inspect(channelClient,false,null) );
          helpers.debug('DATASOAKED ' + channelName + ' clients ' + channelClient.length);
          for(i in channelClient){
            try{
              helpers.debug('SOCKET.IO client send ' +  i + ' '  +channelName);
              var client = channelClient[i];
              client.send(JSON.stringify(update));
            }catch (e) {
              helpers.debug('catch socket clients send') 
              helpers.debug(i);
              // helpers.debug(update);
              // helpers.debug(e);
            }
          }
        }
        */



      };

    
    // Store individual media JSON for retrieval by homepage later
    // helpers.debug('Store individual media JSON for retrieval by homepage later');
    // helpers.debug(channelName);
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
          if(parseInt(redisClient.server_info.used_memory_human)>4){
            redisClient.zremrangebyrank("media:"+channelName,0,1200,function (err, didSucceed) {
              // helpers.debug('zrem didSucceed'); // true
              // helpers.debug(err); // true
              // helpers.debug(didSucceed); // true
              mediaZadd(channelName , channel_split, media, media_weight, data);
            });
          }else{
            mediaZadd(channelName , channel_split, media, media_weight, data);
          }
        });
    }
    
  }
});

exports.subscriptionPattern = subscriptionPattern;
