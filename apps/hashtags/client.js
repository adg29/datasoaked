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

var _ = require('underscore')
    , $ = require('jquery')
    , v = require('./templates/helpers')
    , sd = require('sharify').data
    , io = require('socket.io-browserify')
    , socket = io.connect(window.location.origin)
    , Backbone = require('backbone')
    , Hashtags = require('../../collections/hashtag_items.js')
    , listTemplate = function() {
      return require('./templates/list.jade').apply(null, arguments)
    }
    , view = null;

Backbone.$ = $;

module.exports.HashtagsView = HashtagsView = Backbone.View.extend({

  initialize: function() {
    this.collection.reset(sd.HASHTAGS);

    this.render_viz();

    this.on('socket:parsed', this.socket_parsed, this);
    this.on('socket:error', this.socket_error, this);
    
    this.collection.on('sync', this.render, this);
  }

  , render: function() {
    this.$('#hashtag-items').html(listTemplate({ hashtags: this.collection.models }));
  }

  , socket_parsed: function(e){
    v.debug('socket_parsed')
  }

  , socket_error: function(e){
    v.debug('socket_error')
  }

  , render_viz: function(){

    // Define data and legend 
    // unit 
    var oneDay  = 24*60*60
    var oneYear = 365*24*60*60

    // data 
    var data=[
              {
                label:"Twitter",
                value:parseFloat(_.random(1,8))+.3237,
                unit:oneDay,
                old:null
                , ttl:0.993
              },
              {
                label:"Instagram",
                value:parseFloat(_.random(1,8))+.1618,
                unit:oneDay,
                old:null
                , ttl:0.993
              }
      ]

      v.debug('twitter')
      v.debug(data[0].value)
      v.debug('insta')
      v.debug(data[1].value)

    // Setting normal chart 
    sceneSetting = {
      x:0,
      y:0,
      width:300,
      height:500,
      data:{
            model:[]
            , strata: []
            , stream:{}
      }
      , sedimentation:{
          token:{
            size:{original:10,minimum:2}
          }
          , aggregation: {height:200}
          , suspension:{
              decay:{power:1.02}
          }
      }
    }

    // create column by datas  
    for (var i = data.length - 1; i >= 0; i--) {
      sceneSetting.data.model.push({label:data[i].label})
      var source_value_init = this.collection.count_source[(data[i].label).toLowerCase()];
      sceneSetting.data.strata.push([{initValue: source_value_init, label: data[i].label + " Strata " + i}])
    };

    // customize tokens before create it  
    function createToken(_this,i,data){
       var token = { 
          category:i,
          callback:{
           draw:function(token){
             var size = token.attr("size")
             token.attr("size",size*data.ttl)
           }
          }
        }
      if(typeof(data.texture)!="undefined"){
       token.texture = {}
       token.texture.src = data.texture
      }
      if(typeof(data.size)!="undefined"){
        token.size = data.size
      }
      _this.addToken(token);
    }

    // setup the scene
    var scene    = this.$("#demo").vs(sceneSetting).data('visualSedimentation');
    //v.debug(scene)

    // setup the clock 
    var time     = new Date(),secondsToday

    // start the clock 
    var clock    = window.setInterval(
                            function (){
                                 time = new Date()
                                 previousYear = new Date(2010,12,0,06,0,0,00)
                                 diffPreviousYear = time.getTime()-previousYear.getTime()
                                 //v.debug(diffPreviousYear)
                                 secondsToday = (time.getHours()*60*60) + (time.getMinutes()*60) + time.getSeconds()
                                 milliSecondsToday= (time.getHours()*60*60*1000) + (time.getMinutes()*60*1000) + time.getSeconds()*1000+time.getMilliseconds() 
                                
                                for (var i = data.length - 1; i >= 0; i--) {
                                  data[i].now = Math.round(milliSecondsToday*data[i].value/1000)
                                  if(data[i].now!=data[i].old) createToken(scene,i,data[i])
                                  data[i].old = data[i].now
                                };
                               }
                               , 1); 

    // add legends 
    var labeling =function(setting,container){
     var divWidth = Math.round(setting.width/setting.data.model.length)
     for (var i = setting.data.model.length-1; i >= 0 ; i--) {
       $('#'+container).append('<div class="label" style="width:'+divWidth+'px;">'+setting.data.model[i].label+'</div>');
     }
    }
    labeling(sceneSetting,"headerLabel")


  }

});

module.exports.init = function() {
  view = new HashtagsView({
    el: $('body'),
    collection: new Hashtags(null, { hashtag: sd.hashtag })
  });

  socket.on('message', function(update){ 
    var data;
    try{
      data = $.parseJSON(update);
      view.trigger('socket:parsed',data);
      v.debug('incoming socket message')
    }catch(e){
      view.trigger('socket:error',update);
      v.debug(e);
    }
  });


};