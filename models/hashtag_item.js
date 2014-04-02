// 
// Model for hashtag_item.
// 
// [Sharify](https://github.com/artsy/sharify) lets us require the API url
// and Backbone.sync is replaced with a server-side HTTP module in /lib/setup
// using [Backbone Super Sync](https://github.com/artsy/backbone-super-sync).
// This combined with [browerify](https://github.com/substack/node-browserify) 
// makes it simple to share this module in the browser and on the server.
//

var Backbone = require('backbone')
  , sd = require('sharify').data
  , models = {};

models.HashtagItem = HashtagItem = Backbone.Model.extend({

  url: function() {
    var url = sd.API_URL + '/media/' + this.get('uid') + '?client_id=' + sd.IG_CLIENT_ID;
    return url;
  }
});

models.TwitterItem = HashtagItem.extend({

  url: function() {
    var url = sd.API_URL + '/media/' + this.get('uid') + '?client_id=' + sd.IG_CLIENT_ID;
    return url;
  }
});

models.InstagramItem = HashtagItem.extend({

  url: function() {
    var url = sd.API_URL + '/media/' + this.get('uid') + '?client_id=' + sd.IG_CLIENT_ID;
    return url;
  }
});

module.exports = models;