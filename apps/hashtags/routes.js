// 
// Routes file that exports route handlers for ease of testing.
// 

var 
  Hashtags = require('../../collections/hashtag_items')
  , helpers = require('./server/helpers');

exports.index = function(req, res, next) {
  var hashtags = new HashtagItems(null, {
    hashtag: 'mextures',
  });


  helpers.hashtag_media_get(hashtags.hashtag,function(error, media){
    media_res = typeof media !== 'undefined' ? media : [].reverse();
    // for(var m in media_res){
    //   media_res[m].images.low_resolution.url = "/proxied_image/" + encodeURIComponent(media_res[m].images.low_resolution.url);
    // }
    hashtags.set(media);

    res.locals.sd.HASHTAGS = hashtags.toJSON();
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