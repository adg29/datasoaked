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
  , _ = require('underscore')
  , models = require('../models/hashtag_item');

module.exports = HashtagItems = Backbone.Collection.extend({
  
  model: function(attrs,options){
    var m = null;
    if(attrs.retweet_count!=null){
        m = new models.TwitterItem(attrs, options);
    }
    else{
        m = new models.InstagramItem(attrs, options);
    }

    return m;
  },

  comparator: function(a, b) {
        var a_created = (a instanceof models.InstagramItem ? 'created_time' : 'created_at');
        var b_created = (b instanceof models.InstagramItem ? 'created_time' : 'created_at');
        var a_unix = (a_created=="created_time" ? a.get(a_created): (new Date(a.get(a_created)).getTime()/1000 ) );
        var b_unix = (b_created=="created_time" ? b.get(b_created): (new Date(b.get(b_created)).getTime()/1000 ) );
        return parseFloat( b_unix ) - parseFloat( a_unix );
  } ,

  countBySource: function(e){
    console.log('countBySource')
    this.count_source = _.countBy(this.models,function(m){
      return ( (m instanceof models.InstagramItem) ? 'instagram' : 'twitter');
    })
    console.log(this.count_source)
  },

  url: function() {
    // /v1/tags/snow/media/recent?access_token=ACCESS-TOKEN
    var url = sd.API_URL + '/tags/' + this.hashtag + '/media/recent?client_id=' + sd.IG_CLIENT_ID;
    return url;
  },

  initialize: function(models, options) {
    this.hashtag = options.hashtag;
    this.count_source = {},
    this.on('reset', this.countBySource, this);
    this.on('add', this.countBySource, this);
  },

  parse: function (response) {
      this.pagination = response.pagination || {};
      this.meta = response.meta || {};
      return response.data;
  },


});
