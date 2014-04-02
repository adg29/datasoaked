// 
// Routes file that exports route handlers for ease of testing.
// 

var 
  Hashtags = require('../../collections/hashtag_items')
  models = require('../../models/hashtag_item')
  , helpers = require('./server/helpers')
  , helpers_view = require('./templates/helpers');

exports.index = function(req, res, next) {
  var hashtags = new HashtagItems(null, {
    hashtag: 'mextures',
  });


  helpers.hashtag_media_get(hashtags.hashtag,function(error, media){
    helpers.debug('hashtag_media_get error')
    helpers.debug(error);
    media_res = typeof media !== 'undefined' ? media : [].reverse();
    // for(var m in media_res){
    //   media_res[m].images.low_resolution.url = "/proxied_image/" + encodeURIComponent(media_res[m].images.low_resolution.url);
    // }
    hashtags.set(media);

    res.locals.models = models;
    res.locals.moment = helpers_view.moment;
    res.locals._ = helpers_view._;
    res.locals.sd.HASHTAGS = hashtags.toJSON();
    helpers.debug('render index')
    res.render('index', { 
      hashtag: hashtags.hashtag
      , hashtags: hashtags.models 
    });

    // res.render('index', {
    //       images: media_res,
    //       hashtag: hashtags.hashtag
    // });
  });

  // hashtags.fetch({
  //   success: function() {
  //     res.locals.sd.HASHTAGS = hashtags.toJSON();
  //     res.render('index', { hashtags: hashtags.models });
  //   },
  //   error: function(m, err) { next(err.text); }
  // });
};