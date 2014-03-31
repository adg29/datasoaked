// 
// Collection for hashtag items.
// 
// [Sharify](https://github.com/artsy/sharify) lets us require the API url
// and Backbone.sync is replaced with a server-side HTTP module in /lib/setup
// using [Backbone Super Sync](https://github.com/artsy/backbone-super-sync).
// This combined with [browerify](https://github.com/substack/node-browserify) 
// makes it simple to share this module in the browser and on the server.
// 

var Backbone = require('backbone')
  , sd = require('sharify').data
  , HashtagItem = require('../models/hashtag_item');

module.exports = HashtagItems = Backbone.Collection.extend({
  
  model: HashtagItem,

  url: function() {
    // /v1/tags/snow/media/recent?access_token=ACCESS-TOKEN
    var url = sd.API_URL + '/tags/' + this.hashtag + '/media/recent?client_id=' + sd.IG_CLIENT_ID;
    return url;
  },

  initialize: function(models, options) {
    this.hashtag = options.hashtag;
  },

  parse: function (response) {
      this.pagination = response.pagination || {};
      this.meta = response.meta || {};
      return response.data;
  },


});