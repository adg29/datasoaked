// 
// Routes file that exports route handlers for ease of testing.
// 

var 
  util = require('util')
  , Hashtags = require('../../collections/hashtag_items')
  , models = require('../../models/hashtag_item')
  , helpers = require('./server/helpers')
  , helpersv = require('./templates/helpers')
  , url = require('url')
  , sd = require('sharify').data;

exports.index = function(req, res, next) {
  sd.hashtag = req.params.tag || sd.hashtag;
  sd.debug = true;
  var hashtags = new HashtagItems(null, {
    hashtag: sd.hashtag,
  });

  helpers.subscribe(sd.hashtag,req.host);

  helpers.hashtag_media_get(hashtags.hashtag,function(error, media){
    if(error!==null && error){
      helpers.debug('hashtag_media_get error')
      helpers.debug(error);
    }
    hashtags.reset(media);

    res.locals.models = models; // include access to models
    res.locals.moment = helpersv.moment; // include moment lib
    res.locals._ = helpersv._; // include underscore lib
    res.locals.sd.hashtag = sd.hashtag;
    // res.locals.sd.HASHTAGS = hashtags.toJSON();
    helpers.debug('render index')
    res.render('index', { 
      hashtag: hashtags.hashtag
      , hashtags: hashtags.models 
    });
  });

  // hashtags.fetch({
  //   success: function() {
  //     res.locals.sd.HASHTAGS = hashtags.toJSON();
  //     res.render('index', { hashtags: hashtags.models });
  //   },
  //   error: function(m, err) { next(err.text); }
  // });
};


exports.challenge_callback_instagram = function(req, res, next){
    // The GET callback for each subscription verification.
  helpers.debug("GET " + req.url); 
  var params = url.parse(req.url, true).query;
  var challenge = params['hub.challenge'] || 'No hub.challenge present';
  helpers.debug(challenge)
  res.send(challenge);
};

exports.subscription_callback_instagram = function(req, res, next){
  helpers.debug(req.params.tag + " ****** /callbacks/instagram/tag/" + req.params.tag);
  // The POST callback for Instagram to call every time there's an update to one of our subscriptions.

  var tag = req.params.tag;
  // we use the data in the update to query the  API to get the data we want.
  // [{"changed_aspect": "media", "object": "tag", "object_id": "nyfw", "time": 1424050888, "subscription_id": 16842889, "data": {}}]
  var updates = JSON.parse(req.rawBody);
  for(index in updates){
    var update = updates[index];
    if(update['object'] == "tag"){
      helpers.debug('DATASOAKED ROUTE subscription_callback_instagram')
      //Expect hashtag_process to query twitter and instagram via async and publish messages indicating changes in media sets
      helpers.hashtag_process(tag, update);
    }
  }
  res.send('OK');
}