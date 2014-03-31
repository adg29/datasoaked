// 
// Routes file that exports route handlers for ease of testing.
// 

var Hashtags = require('../../collections/hashtags');

exports.index = function(req, res, next) {
  var hashtags = new HashtagItems(null, {
    tag: 'mextures',
  });
  hashtags.fetch({
    success: function() {
      res.locals.sd.HASHTAGS = hashtags.toJSON();
      res.render('index', { hashtags: hashtags.models });
    },
    error: function(m, err) { next(err.text); }
  });
};