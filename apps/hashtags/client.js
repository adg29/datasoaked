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
    _ = require('underscore'),
    io = require('socket.io-browserify')
    socket = io.connect(window.location.origin),
    sd = require('sharify').data,
    Hashtags = require('../../collections/hashtag_items.js'),
    listTemplate = function() {
      return require('./templates/list.jade').apply(null, arguments)
    };
Backbone.$ = $;


console.log(window.location.origin)

socket.on('message', function(update){ 
  var data,tmp;
  try{
    tmp = update;
  }catch(e){
    console.log('ERROR message socket');
    console.log(e);
  }
  //try{
    console.log('message')
    // console.log(tmp);
    data = $.parseJSON(tmp);
    $(document).trigger(data);
  // }catch(e){
  //   //console.log(tmp);
  //   console.log(e);
  // }
});

module.exports.HashtagsView = HashtagsView = Backbone.View.extend({

  initialize: function() {
    this.collection.reset(sd.HASHTAGS);
    this.render_viz();
    this.collection.on('sync', this.render, this);
  },

  render: function() {
    this.$('#hashtag-items').html(listTemplate({ hashtags: this.collection.models }));
  },

  events: {
  },

  render_viz: function(){

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

      console.log('twitter')
      console.log(data[0].value)
      console.log('insta')
      console.log(data[1].value)



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
    //console.log(scene)

    // setup the clock 
    var time     = new Date(),secondsToday

    // start the clock 
    var clock    = window.setInterval(
                            function (){
                                 time = new Date()
                                 previousYear = new Date(2010,12,0,06,0,0,00)
                                 diffPreviousYear = time.getTime()-previousYear.getTime()
                                 //console.log(diffPreviousYear)
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
  new HashtagsView({
    el: $('body'),
    collection: new Hashtags(null, { hashtag: sd.hashtag })
  });
};