//
// The javscript asset package for the "hashtags" app.
//
// It's a good pattern to organize your asset packages by a package per app.
// This generally means these javascript asset files are going to be quite
// small, often just a line of initialize code like this.
//

require('../apps/hashtags/templates/lib/visualsedimentation.js')
require('jquery')(require('../apps/hashtags/client.js').init)

     // Define data and legend 
     // unit 
     var oneDay  = 24*60*60
     var oneYear = 365*24*60*60
    
     // data 
     var data=[
                {
                  label:"Twitter",
                  value:1.3237,
                  unit:oneDay,
                  old:null
                  , ttl:0.993
                },
                {
                  label:"Instagram",
                  value:11.1618,
                  unit:oneDay,
                  old:null
                  , ttl:0.993
                }
        ]



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
        sceneSetting.data.strata.push([{initValue: 20, label: data[i].label + " Strata " + i}])
      };

      // customize tokens before create it  
      function createToken(_this,i,data){
         var token = { 
            category:i,
            callback:{
             draw:function(token){
               // var size = token.attr("size")
               // token.attr("size",size*data.ttl)
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
      var scene    = $("#demo").vs(sceneSetting).data('visualSedimentation');
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
                                 , 500); 
  
    // add legends 
    var labeling =function(setting,container){
       var divWidth = Math.round(setting.width/setting.data.model.length)
       for (var i = setting.data.model.length-1; i >= 0 ; i--) {
         $('#'+container).append('<div class="label" style="width:'+divWidth+'px;">'+setting.data.model[i].label+'</div>');
       }
    }
    labeling(sceneSetting,"headerLabel")



