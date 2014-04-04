// 
// Routes file that exports route handlers for ease of testing.
// 

var 
  Hashtags = require('../../collections/hashtag_items')
  , models = require('../../models/hashtag_item')
  , helpers = require('./server/helpers')
  , helpers_view = require('./templates/helpers')
  , url = require('url')
  , sd = require('sharify').data;

exports.index = function(req, res, next) {
  var hashtags = new HashtagItems(null, {
    hashtag: sd.hashtag,
  });


  helpers.hashtag_media_get(hashtags.hashtag,function(error, media){
    helpers.debug('hashtag_media_get error')
    helpers.debug(error);
    hashtags.reset(media);

    res.locals.models = models; // include access to models
    res.locals.moment = helpers_view.moment; // include moment lib
    res.locals._ = helpers_view._; // include underscore lib
    res.locals.sd.HASHTAGS = hashtags.toJSON();
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

exports.challenge_callback_instagram = function(req, res){
    // The GET callback for each subscription verification.
  helpers.debug("GET " + req.url); 
  var params = url.parse(req.url, true).query;
  res.send(params['hub.challenge'] || 'No hub.challenge present');
};

exports.subscription_callback_instagram = function(req, res){
  helpers.debug("/callbacks/instagram/tag/" + req.params.tag);
   // The POST callback for Instagram to call every time there's an update
   // to one of our subscriptions.
    
   // Go through and process each update. Note that every update doesn't
   // include the updated data - we use the data in the update to query
   // the  API to get the data we want.
}