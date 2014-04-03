//
// The client-side code for the hashtags page.
//
// [Browserify](https://github.com/substack/node-browserify) lets us write this
// code as a common.js module, which means requiring dependecies instead of
// relying on globals. This module exports the Backbone view and an init
// function that gets used in /assets/hashtags.js. Doing this allows us to
// easily unit test these components, and makes the code more modular and
// composable in general.
//

var Backbone = require('backbone'),
    $ = require('jquery'),
    sd = require('sharify').data,
    Hashtags = require('../../collections/hashtag_items.js'),
    listTemplate = function() {
      return require('./templates/list.jade').apply(null, arguments)
    };
Backbone.$ = $;

module.exports.HashtagsView = HashtagsView = Backbone.View.extend({

  initialize: function() {
    this.collection.on('sync', this.render, this);
  },

  render: function() {
    this.$('#hashtag-items').html(listTemplate({ hashtags: this.collection.models }));
  },

  events: {
  },

});

module.exports.init = function() {
  new HashtagsView({
    el: $('body'),
    collection: new Hashtags(sd.HASHTAGS, { hashtag: 'ootd' })
  });
};