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

  sceneSetting : {
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
          size:{original:20,minimum:2}
        }
        , aggregation: {height:250}
        , suspension:{
            decay:{power:1.02}
        }
    }
    , options:{
      layout:false
    }
    , chart:{
    }
  }
  , oneDay : 24*60*60

  , sceneData : {
      'twitter' : {
        label:"Twitter"
        , unit: 24*60*60
        , old:null
        , value:parseFloat(_.random(1,8))+.3237
        , ttl:0.993
      }
      , 'instagram' : {
        label:"Instagram"
        , unit: 24*60*60
        , old:null
        , value:parseFloat(_.random(1,8))+.1618
        , ttl:0.993
      }
  }

  , initialize: function() {
    _.bindAll(this,'render_viz','scene_setup');

    this.collection.reset(sd.HASHTAGS);

    this.scene_setup();

    this.scene = this.$("#demo").vs(this.sceneSetting).data('visualSedimentation')

    this.render_viz();

    this.on('socket:parsed', this.socket_parsed, this);
    this.on('socket:error', this.socket_error, this);

    this.collection.on('sync', this.render, this);
  }

  , render: function() {
    this.$('#hashtag-items').html(listTemplate({ hashtags: this.collection.models }));
  }

  , socket_parsed: function(d){
    var src = "";
    if(d.channelSrc=="twitter"){
      src = "twitter";
      this.createToken(src,this.sceneData[src]);
    }else{
      src = "instagram";
      this.createToken(src,this.sceneData[src]);
    }
    v.debug('d')
    v.debug(d)
    v.debug('socket_parsed')
  }

  , socket_error: function(e){
    v.debug('socket_error')
  }

  // customize tokens before create it  
  , createToken: function(i,data){
     var token = { 
        category: (i=="instagram" ? 1 : 0),
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
    this.scene.addToken(token);
  }

  , render_viz: function(){

    // Define data and legend 
    // unit 
    var oneYear = 365*24*60*60


    // setup the clock 
    var time     = new Date(),secondsToday

    // start the clock 
    var self = this;
    // var clock = window.setInterval(
    //               function (){
    //                time = new Date()
    //                previousYear = new Date(2010,12,0,06,0,0,00)
    //                diffPreviousYear = time.getTime()-previousYear.getTime()
    //                secondsToday = (time.getHours()*60*60) + (time.getMinutes()*60) + time.getSeconds()
    //                milliSecondsToday= (time.getHours()*60*60*1000) + (time.getMinutes()*60*1000) + time.getSeconds()*1000+time.getMilliseconds() 
                  
    //               var srcs = ['twitter'];
    //               for (var s in srcs) {
    //                 var src = srcs[s];
    //                 self.sceneData[src].now = Math.round(milliSecondsToday*self.sceneData[src].value/1000)
    //                 if(self.sceneData[src].now!=self.sceneData[src].old && _.random(2)==1) self.createToken(src,self.sceneData[src])
    //                 self.sceneData[src].old = self.sceneData[src].now
    //               };
    //              }
    //              , 1000); 

    // add legends 
    var labeling =function(setting,container){
      var divWidth = Math.round(setting.width/setting.data.model.length)

      for (var i in setting.data.model) {
       $('#'+container).append('<div class="label" style="width:'+divWidth+'px;">'+setting.data.model[i].label+'</div>');
      }
    }
    labeling(this.sceneSetting,"headerLabel")


  }

  , scene_setup : function(){
    for (src in this.sceneData) {
      this.sceneSetting.data.model.push({label:this.sceneData[src].label})
      var source_value_init = this.collection.count_source[src];
      this.sceneSetting.data.strata.push([{initValue: parseInt(source_value_init), label: this.sceneData[src].label + " Strata "}])
    };
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
      v.debug('incoming socket message')
      view.trigger('socket:parsed',data);
    }catch(e){
      view.trigger('socket:error',update);
      v.debug(e);
    }
  });


};