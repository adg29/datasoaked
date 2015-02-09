(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    , sd = require('sharify').data
    , v = require('./templates/helpers')
    , io = require('socket.io-browserify')
    , socket = io.connect(window.location.origin+'/socket/'+sd.hashtag)
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
      console.log('twitter');
      console.log(d);
      this.createToken(src,this.sceneData[src]);
    }else{
      src = "instagram";
      console.log('insta');
      console.log(d);
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
},{"../../collections/hashtag_items.js":6,"./templates/helpers":2,"./templates/list.jade":4,"backbone":8,"jquery":11,"sharify":13,"socket.io-browserify":14,"underscore":15}],2:[function(require,module,exports){
var _ = require('underscore')
	, moment = require('moment')
  	, sd = require('sharify').data;


moment.fn.fromNoww = function (a) {
    if (Math.abs(moment().diff(this)) <= 1000) { // 1000 milliseconds
        return 'just now';
    }
    if (Math.abs(moment().diff(this)) < 60000) { // 1000 milliseconds
        return Math.floor(Math.abs(moment.duration(this.diff(a)).asSeconds()))  + ' seconds ago';//this.fromNow();
    }
    return this.fromNow(a);
}

function debug(msg) {
  if (sd.debug) {
    console.log(msg);
    if (msg instanceof Error)
      console.log(msg.stack)
  }
}
exports.debug = debug;

exports.moment = moment;
exports._ = _;
},{"moment":12,"sharify":13,"underscore":15}],3:[function(require,module,exports){
/*
 * Visual Sedimentation Library v0.01
 * http://www.visualsedimentation.org/
 *
 * Copyright 2013, Samuel Huron & Romain Vuillemont
 * Licensed under the CeCILL-B or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 *
 *
 *
 *
 * Includes jquery.js
 * http://jquery.com/
 * Copyright 2010, John Resig
 * Released under Dual licensed under the MIT or GPL Version 2 licenses.
 * 
 * Includes d3.js
 * http://d3js.org/
 * Copyright 2012, Michael Bostock
 * Released under BSD licenses.
 * 
 * Includes Box2DWeb
 * http://www.gphysics.com
 * Copyright 2006, Erin Catto 
 * Released under zlib License.
 * 
 * Includes Sizzle.js
 * http://sizzlejs.com/
 * Copyright 2010, The Dojo Foundation
 * Released under the MIT, BSD, and GPL Licenses.
 *
 * Date: Tue Jan 01 14:25:48 2010 -0500
 */

$ = require('jquery');
(function(){if(!Date.now){Date.now=function(){return +new Date}}try{document.createElement("div").style.setProperty("opacity",0,"")}catch(DF){var Bv=CSSStyleDeclaration.prototype,D4=Bv.setProperty;Bv.setProperty=function(e,Ew,Ev){D4.call(this,e,Ew+"",Ev)}}d3={version:"2.8.1"};function Ep(Ex,Ew){try{for(var Ev in Ew){Object.defineProperty(Ex.prototype,Ev,{value:Ew[Ev],enumerable:false})}}catch(Ey){Ex.prototype=Ew}}var B2=At;function En(Ev){var e=-1,Ex=Ev.length,Ew=[];while(++e<Ex){Ew.push(Ev[e])}return Ew}function At(e){return Array.prototype.slice.call(e)}try{B2(document.documentElement.childNodes)[0].nodeType}catch(EM){B2=En}var Ci=[].__proto__?function(Ev,e){Ev.__proto__=e}:function(Ew,e){for(var Ev in e){Ew[Ev]=e[Ev]}};d3.map=function(e){var Ew=new AK;for(var Ev in e){Ew.set(Ev,e[Ev])}return Ew};function AK(){}Ep(AK,{has:function(e){return Er+e in this},get:function(e){return this[Er+e]},set:function(e,Ev){return this[Er+e]=Ev},remove:function(e){e=Er+e;return e in this&&delete this[e]},keys:function(){var e=[];this.forEach(function(Ev){e.push(Ev)});return e},values:function(){var e=[];this.forEach(function(Ev,Ew){e.push(Ew)});return e},entries:function(){var e=[];this.forEach(function(Ev,Ew){e.push({key:Ev,value:Ew})});return e},forEach:function(Ev){for(var e in this){if(e.charCodeAt(0)===Bx){Ev.call(this,e.substring(1),this[e])}}}});var Er="\0",Bx=Er.charCodeAt(0);function t(){return this}d3.functor=function(e){return typeof e==="function"?e:function(){return e}};d3.rebind=function(Ew,Ev){var e=1,Ey=arguments.length,Ex;while(++e<Ey){Ew[Ex=arguments[e]]=CT(Ew,Ev,Ev[Ex])}return Ew};function CT(Ev,e,Ew){return function(){var Ex=Ew.apply(e,arguments);return arguments.length?Ev:Ex}}d3.ascending=function(Ev,e){return Ev<e?-1:Ev>e?1:Ev>=e?0:NaN};d3.descending=function(Ev,e){return e<Ev?-1:e>Ev?1:e>=Ev?0:NaN};d3.mean=function(E0,Ey){var Ez=E0.length,Ev,e=0,Ex=-1,Ew=0;if(arguments.length===1){while(++Ex<Ez){if(ET(Ev=E0[Ex])){e+=(Ev-e)/++Ew}}}else{while(++Ex<Ez){if(ET(Ev=Ey.call(E0,E0[Ex],Ex))){e+=(Ev-e)/++Ew}}}return Ew?e:undefined};d3.median=function(Ev,e){if(arguments.length>1){Ev=Ev.map(e)}Ev=Ev.filter(ET);return Ev.length?d3.quantile(Ev.sort(d3.ascending),0.5):undefined};d3.min=function(Ez,Ex){var Ew=-1,Ey=Ez.length,Ev,e;if(arguments.length===1){while(++Ew<Ey&&((Ev=Ez[Ew])==null||Ev!=Ev)){Ev=undefined}while(++Ew<Ey){if((e=Ez[Ew])!=null&&Ev>e){Ev=e}}}else{while(++Ew<Ey&&((Ev=Ex.call(Ez,Ez[Ew],Ew))==null||Ev!=Ev)){Ev=undefined}while(++Ew<Ey){if((e=Ex.call(Ez,Ez[Ew],Ew))!=null&&Ev>e){Ev=e}}}return Ev};d3.max=function(Ez,Ex){var Ew=-1,Ey=Ez.length,Ev,e;if(arguments.length===1){while(++Ew<Ey&&((Ev=Ez[Ew])==null||Ev!=Ev)){Ev=undefined}while(++Ew<Ey){if((e=Ez[Ew])!=null&&e>Ev){Ev=e}}}else{while(++Ew<Ey&&((Ev=Ex.call(Ez,Ez[Ew],Ew))==null||Ev!=Ev)){Ev=undefined}while(++Ew<Ey){if((e=Ex.call(Ez,Ez[Ew],Ew))!=null&&e>Ev){Ev=e}}}return Ev};d3.extent=function(E0,Ex){var Ew=-1,Ez=E0.length,Ev,e,Ey;if(arguments.length===1){while(++Ew<Ez&&((Ev=Ey=E0[Ew])==null||Ev!=Ev)){Ev=Ey=undefined}while(++Ew<Ez){if((e=E0[Ew])!=null){if(Ev>e){Ev=e}if(Ey<e){Ey=e}}}}else{while(++Ew<Ez&&((Ev=Ey=Ex.call(E0,E0[Ew],Ew))==null||Ev!=Ev)){Ev=undefined}while(++Ew<Ez){if((e=Ex.call(E0,E0[Ew],Ew))!=null){if(Ev>e){Ev=e}if(Ey<e){Ey=e}}}}return[Ev,Ey]};d3.random={normal:function(e,Ev){if(arguments.length<2){Ev=1}if(arguments.length<1){e=0}return function(){var Ew,Ey,Ex;do{Ew=Math.random()*2-1;Ey=Math.random()*2-1;Ex=Ew*Ew+Ey*Ey}while(!Ex||Ex>1);return e+Ev*Ew*Math.sqrt(-2*Math.log(Ex)/Ex)}}};function ET(e){return e!=null&&!isNaN(e)}d3.sum=function(Ez,Ex){var Ew=0,Ey=Ez.length,e,Ev=-1;if(arguments.length===1){while(++Ev<Ey){if(!isNaN(e=+Ez[Ev])){Ew+=e}}}else{while(++Ev<Ey){if(!isNaN(e=+Ex.call(Ez,Ez[Ev],Ev))){Ew+=e}}}return Ew};d3.quantile=function(Ew,E0){var Ex=(Ew.length-1)*E0+1,Ey=Math.floor(Ex),Ev=Ew[Ey-1],Ez=Ex-Ey;return Ez?Ev+Ez*(Ew[Ey]-Ev):Ev};d3.transpose=function(e){return d3.zip.apply(d3,e)};d3.zip=function(){if(!(Ez=arguments.length)){return[]}for(var Ex=-1,e=d3.min(arguments,Cz),Ew=new Array(e);++Ex<e;){for(var Ev=-1,Ez,Ey=Ew[Ex]=new Array(Ez);++Ev<Ez;){Ey[Ev]=arguments[Ev][Ex]}}return Ew};function Cz(e){return e.length}d3.bisector=function(e){return{left:function(Ew,Ev,Ez,Ey){if(arguments.length<3){Ez=0}if(arguments.length<4){Ey=Ew.length}while(Ez<Ey){var Ex=Ez+Ey>>1;if(e.call(Ew,Ew[Ex],Ex)<Ev){Ez=Ex+1}else{Ey=Ex}}return Ez},right:function(Ew,Ev,Ez,Ey){if(arguments.length<3){Ez=0}if(arguments.length<4){Ey=Ew.length}while(Ez<Ey){var Ex=Ez+Ey>>1;if(Ev<e.call(Ew,Ew[Ex],Ex)){Ey=Ex}else{Ez=Ex+1}}return Ez}}};var Do=d3.bisector(function(e){return e});d3.bisectLeft=Do.left;d3.bisect=d3.bisectRight=Do.right;d3.first=function(Ez,Ex){var Ew=0,Ey=Ez.length,Ev=Ez[0],e;if(arguments.length===1){Ex=d3.ascending}while(++Ew<Ey){if(Ex.call(Ez,Ev,e=Ez[Ew])>0){Ev=e}}return Ev};d3.last=function(Ez,Ex){var Ew=0,Ey=Ez.length,Ev=Ez[0],e;if(arguments.length===1){Ex=d3.ascending}while(++Ew<Ey){if(Ex.call(Ez,Ev,e=Ez[Ew])<=0){Ev=e}}return Ev};d3.nest=function(){var Ex={},Ew=[],E0=[],Ev,Ey;function Ez(E8,E6){if(E6>=Ew.length){return Ey?Ey.call(Ex,E8):(Ev?E8.sort(Ev):E8)}var E7=-1,E2=E8.length,FA=Ew[E6++],E5,E4,E3=new AK,E9,E1={};while(++E7<E2){if(E9=E3.get(E5=FA(E4=E8[E7]))){E9.push(E4)}else{E3.set(E5,[E4])}}E3.forEach(function(FB){E1[FB]=Ez(E3.get(FB),E6)});return E1}function e(E4,E5){if(E5>=Ew.length){return E4}var E1=[],E2=E0[E5++],E3;for(E3 in E4){E1.push({key:E3,values:e(E4[E3],E5)})}if(E2){E1.sort(function(E7,E6){return E2(E7.key,E6.key)})}return E1}Ex.map=function(E1){return Ez(E1,0)};Ex.entries=function(E1){return e(Ez(E1,0),0)};Ex.key=function(E1){Ew.push(E1);return Ex};Ex.sortKeys=function(E1){E0[Ew.length-1]=E1;return Ex};Ex.sortValues=function(E1){Ev=E1;return Ex};Ex.rollup=function(E1){Ey=E1;return Ex};return Ex};d3.keys=function(Ew){var Ev=[];for(var e in Ew){Ev.push(e)}return Ev};d3.values=function(Ew){var e=[];for(var Ev in Ew){e.push(Ew[Ev])}return e};d3.entries=function(Ew){var e=[];for(var Ev in Ew){e.push({key:Ev,value:Ew[Ev]})}return e};d3.permute=function(Ey,Ev){var e=[],Ew=-1,Ex=Ev.length;while(++Ew<Ex){e[Ew]=Ey[Ev[Ew]]}return e};d3.merge=function(e){return Array.prototype.concat.apply([],e)};d3.split=function(E0,Ey){var Ex=[],e=[],Ew,Ev=-1,Ez=E0.length;if(arguments.length<2){Ey=Cg}while(++Ev<Ez){if(Ey.call(e,Ew=E0[Ev],Ev)){e=[]}else{if(!e.length){Ex.push(e)}e.push(Ew)}}return Ex};function Cg(e){return e==null}function BR(e){return e.replace(/(^\s+)|(\s+$)/g,"").replace(/\s+/g," ")}d3.range=function(E0,Ey,Ez){if(arguments.length<3){Ez=1;if(arguments.length<2){Ey=E0;E0=0}}if((Ey-E0)/Ez===Infinity){throw new Error("infinite range")}var Ev=[],e=Dl(Math.abs(Ez)),Ex=-1,Ew;E0*=e,Ey*=e,Ez*=e;if(Ez<0){while((Ew=E0+Ez*++Ex)>Ey){Ev.push(Ew/e)}}else{while((Ew=E0+Ez*++Ex)<Ey){Ev.push(Ew/e)}}return Ev};function Dl(e){var Ev=1;while(e*Ev%1){Ev*=10}return Ev}d3.requote=function(e){return e.replace(Bg,"\\$&")};var Bg=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;d3.round=function(e,Ev){return Ev?Math.round(e*(Ev=Math.pow(10,Ev)))/Ev:Math.round(e)};d3.xhr=function(e,Ew,Ex){var Ev=new XMLHttpRequest;if(arguments.length<3){Ex=Ew,Ew=null}else{if(Ew&&Ev.overrideMimeType){Ev.overrideMimeType(Ew)}}Ev.open("GET",e,true);if(Ew){Ev.setRequestHeader("Accept",Ew)}Ev.onreadystatechange=function(){if(Ev.readyState===4){Ex(Ev.status<300?Ev:null)}};Ev.send(null)};d3.text=function(e,Ew,Ex){function Ev(Ey){Ex(Ey&&Ey.responseText)}if(arguments.length<3){Ex=Ew;Ew=null}d3.xhr(e,Ew,Ev)};d3.json=function(e,Ev){d3.text(e,"application/json",function(Ew){Ev(Ew?JSON.parse(Ew):null)})};d3.html=function(e,Ev){d3.text(e,"text/html",function(Ex){if(Ex!=null){var Ew=document.createRange();Ew.selectNode(document.body);Ex=Ew.createContextualFragment(Ex)}Ev(Ex)})};d3.xml=function(e,Ew,Ex){function Ev(Ey){Ex(Ey&&Ey.responseXML)}if(arguments.length<3){Ex=Ew;Ew=null}d3.xhr(e,Ew,Ev)};var CJ={svg:"http://www.w3.org/2000/svg",xhtml:"http://www.w3.org/1999/xhtml",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};d3.ns={prefix:CJ,qualify:function(e){var Ev=e.indexOf(":"),Ew=e;if(Ev>=0){Ew=e.substring(0,Ev);e=e.substring(Ev+1)}return CJ.hasOwnProperty(Ew)?{space:CJ[Ew],local:e}:e}};d3.dispatch=function(){var e=new Ce,Ev=-1,Ew=arguments.length;while(++Ev<Ew){e[arguments[Ev]]=C2(e)}return e};function Ce(){}Ce.prototype.on=function(Ew,Ex){var Ev=Ew.indexOf("."),e="";if(Ev>0){e=Ew.substring(Ev+1);Ew=Ew.substring(0,Ev)}return arguments.length<2?this[Ew].on(e):this[Ew].on(e,Ex)};function C2(e){var Ew=[],Ev=new AK;function Ex(){var E0=Ew,Ez=-1,E1=E0.length,Ey;while(++Ez<E1){if(Ey=E0[Ez].on){Ey.apply(this,arguments)}}return e}Ex.on=function(Ez,E1){var Ey=Ev.get(Ez),E0;if(arguments.length<2){return Ey&&Ey.on}if(Ey){Ey.on=null;Ew=Ew.slice(0,E0=Ew.indexOf(Ey)).concat(Ew.slice(E0+1));Ev.remove(Ez)}if(E1){Ew.push(Ev.set(Ez,{on:E1}))}return e};return Ex}d3.format=function(E2){var Ez=BK.exec(E2),E4=Ez[1]||" ",Ev=Ez[3]||"",Ex=Ez[5],e=+Ez[6],E5=Ez[7],E0=Ez[8],E1=Ez[9],Ew=1,E3="",Ey=false;if(E0){E0=+E0.substring(1)}if(Ex){E4="0";if(E5){e-=Math.floor((e-1)/4)}}switch(E1){case"n":E5=true;E1="g";break;case"%":Ew=100;E3="%";E1="f";break;case"p":Ew=100;E3="%";E1="r";break;case"d":Ey=true;E0=0;break;case"s":Ew=-1;E1="r";break}if(E1=="r"&&!E0){E1="g"}E1=R.get(E1)||Ag;return function(E9){if(Ey&&(E9%1)){return""}var E6=(E9<0)&&(E9=-E9)?"\u2212":Ev;if(Ew<0){var E8=d3.formatPrefix(E9,E0);E9*=E8.scale;E3=E8.symbol}else{E9*=Ew}E9=E1(E9,E0);if(Ex){var E7=E9.length+E6.length;if(E7<e){E9=new Array(e-E7+1).join(E4)+E9}if(E5){E9=Bj(E9)}E9=E6+E9}else{if(E5){E9=Bj(E9)}E9=E6+E9;var E7=E9.length;if(E7<e){E9=new Array(e-E7+1).join(E4)+E9}}return E9+E3}};var BK=/(?:([^{])?([<>=^]))?([+\- ])?(#)?(0)?([0-9]+)?(,)?(\.[0-9]+)?([a-zA-Z%])?/;var R=d3.map({g:function(e,Ev){return e.toPrecision(Ev)},e:function(e,Ev){return e.toExponential(Ev)},f:function(e,Ev){return e.toFixed(Ev)},r:function(e,Ev){return d3.round(e,Ev=CL(e,Ev)).toFixed(Math.max(0,Math.min(20,Ev)))}});function CL(e,Ev){return Ev-(e?1+Math.floor(Math.log(e+Math.pow(10,1+Math.floor(Math.log(e)/Math.LN10)-Ev))/Math.LN10):1)}function Ag(e){return e+""}function Bj(Ex){var Ev=Ex.lastIndexOf("."),Ew=Ev>=0?Ex.substring(Ev):(Ev=Ex.length,""),e=[];while(Ev>0){e.push(Ex.substring(Ev-=3,Ev+3))}return e.reverse().join(",")+Ew}var BH=["y","z","a","f","p","n","μ","m","","k","M","G","T","P","E","Z","Y"].map(B1);d3.formatPrefix=function(Ew,e){var Ev=0;if(Ew){if(Ew<0){Ew*=-1}if(e){Ew=d3.round(Ew,CL(Ew,e))}Ev=1+Math.floor(1e-12+Math.log(Ew)/Math.LN10);Ev=Math.max(-24,Math.min(24,Math.floor((Ev<=0?Ev+1:Ev-1)/3)*3))}return BH[8+Ev/3]};function B1(Ev,e){return{scale:Math.pow(10,(8-e)*3),symbol:Ev}}var A2=AP(2),Y=AP(3),EO=function(){return Bi};var p=d3.map({linear:EO,poly:AP,quad:function(){return A2},cubic:function(){return Y},sin:function(){return Df},exp:function(){return DC},circle:function(){return CH},elastic:o,back:ED,bounce:function(){return BB}});var I=d3.map({"in":Bi,out:U,"in-out":AW,"out-in":function(e){return AW(U(e))}});d3.ease=function(Ev){var Ex=Ev.indexOf("-"),Ew=Ex>=0?Ev.substring(0,Ex):Ev,e=Ex>=0?Ev.substring(Ex+1):"in";Ew=p.get(Ew)||EO;e=I.get(e)||Bi;return DJ(e(Ew.apply(null,Array.prototype.slice.call(arguments,1))))};function DJ(e){return function(Ev){return Ev<=0?0:Ev>=1?1:e(Ev)}}function U(e){return function(Ev){return 1-e(1-Ev)}}function AW(e){return function(Ev){return 0.5*(Ev<0.5?e(2*Ev):(2-e(2-2*Ev)))}}function Bi(e){return e}function AP(Ev){return function(e){return Math.pow(e,Ev)}}function Df(e){return 1-Math.cos(e*Math.PI/2)}function DC(e){return Math.pow(2,10*(e-1))}function CH(e){return 1-Math.sqrt(1-e*e)}function o(e,Ew){var Ev;if(arguments.length<2){Ew=0.45}if(arguments.length<1){e=1;Ev=Ew/4}else{Ev=Ew/(2*Math.PI)*Math.asin(1/e)}return function(Ex){return 1+e*Math.pow(2,10*-Ex)*Math.sin((Ex-Ev)*2*Math.PI/Ew)}}function ED(e){if(!e){e=1.70158}return function(Ev){return Ev*Ev*((e+1)*Ev-e)}}function BB(e){return e<1/2.75?7.5625*e*e:e<2/2.75?7.5625*(e-=1.5/2.75)*e+0.75:e<2.5/2.75?7.5625*(e-=2.25/2.75)*e+0.9375:7.5625*(e-=2.625/2.75)*e+0.984375}d3.event=null;function Ee(){d3.event.stopPropagation();d3.event.preventDefault()}function u(){var Ew=d3.event,Ev;while(Ev=Ew.sourceEvent){Ew=Ev}return Ew}function EN(Ew){var e=new Ce,Ev=0,Ex=arguments.length;while(++Ev<Ex){e[arguments[Ev]]=C2(e)}e.of=function(Ez,Ey){return function(E0){try{var E1=E0.sourceEvent=d3.event;E0.target=Ew;d3.event=E0;e[E0.type].apply(Ez,Ey)}finally{d3.event=E1}}};return e}d3.interpolate=function(Ev,e){var Ew=d3.interpolators.length,Ex;while(--Ew>=0&&!(Ex=d3.interpolators[Ew](Ev,e))){}return Ex};d3.interpolateNumber=function(Ev,e){e-=Ev;return function(Ew){return Ev+e*Ew}};d3.interpolateRound=function(Ev,e){e-=Ev;return function(Ew){return Math.round(Ev+e*Ew)}};d3.interpolateString=function(E1,E0){var Ex,Ez,Ey,E3=0,E2=0,E4=[],e=[],Ew,Ev;DS.lastIndex=0;for(Ez=0;Ex=DS.exec(E0);++Ez){if(Ex.index){E4.push(E0.substring(E3,E2=Ex.index))}e.push({i:E4.length,x:Ex[0]});E4.push(null);E3=DS.lastIndex}if(E3<E0.length){E4.push(E0.substring(E3))}for(Ez=0,Ew=e.length;(Ex=DS.exec(E1))&&Ez<Ew;++Ez){Ev=e[Ez];if(Ev.x==Ex[0]){if(Ev.i){if(E4[Ev.i+1]==null){E4[Ev.i-1]+=Ev.x;E4.splice(Ev.i,1);for(Ey=Ez+1;Ey<Ew;++Ey){e[Ey].i--}}else{E4[Ev.i-1]+=Ev.x+E4[Ev.i+1];E4.splice(Ev.i,2);for(Ey=Ez+1;Ey<Ew;++Ey){e[Ey].i-=2}}}else{if(E4[Ev.i+1]==null){E4[Ev.i]=Ev.x}else{E4[Ev.i]=Ev.x+E4[Ev.i+1];E4.splice(Ev.i+1,1);for(Ey=Ez+1;Ey<Ew;++Ey){e[Ey].i--}}}e.splice(Ez,1);Ew--;Ez--}else{Ev.x=d3.interpolateNumber(parseFloat(Ex[0]),parseFloat(Ev.x))}}while(Ez<Ew){Ev=e.pop();if(E4[Ev.i+1]==null){E4[Ev.i]=Ev.x}else{E4[Ev.i]=Ev.x+E4[Ev.i+1];E4.splice(Ev.i+1,1)}Ew--}if(E4.length===1){return E4[0]==null?e[0].x:function(){return E0}}return function(E5){for(Ez=0;Ez<Ew;++Ez){E4[(Ev=e[Ez]).i]=Ev.x(E5)}return E4.join("")}};d3.interpolateTransform=function(E7,E6){var E8=[],Ev=[],Ez,Ey=d3.transform(E7),Ex=d3.transform(E6),E3=Ey.translate,E2=Ex.translate,Ew=Ey.rotate,e=Ex.rotate,E1=Ey.skew,E0=Ex.skew,E5=Ey.scale,E4=Ex.scale;if(E3[0]!=E2[0]||E3[1]!=E2[1]){E8.push("translate(",null,",",null,")");Ev.push({i:1,x:d3.interpolateNumber(E3[0],E2[0])},{i:3,x:d3.interpolateNumber(E3[1],E2[1])})}else{if(E2[0]||E2[1]){E8.push("translate("+E2+")")}else{E8.push("")}}if(Ew!=e){Ev.push({i:E8.push(E8.pop()+"rotate(",null,")")-2,x:d3.interpolateNumber(Ew,e)})}else{if(e){E8.push(E8.pop()+"rotate("+e+")")}}if(E1!=E0){Ev.push({i:E8.push(E8.pop()+"skewX(",null,")")-2,x:d3.interpolateNumber(E1,E0)})}else{if(E0){E8.push(E8.pop()+"skewX("+E0+")")}}if(E5[0]!=E4[0]||E5[1]!=E4[1]){Ez=E8.push(E8.pop()+"scale(",null,",",null,")");Ev.push({i:Ez-4,x:d3.interpolateNumber(E5[0],E4[0])},{i:Ez-2,x:d3.interpolateNumber(E5[1],E4[1])})}else{if(E4[0]!=1||E4[1]!=1){E8.push(E8.pop()+"scale("+E4+")")}}Ez=Ev.length;return function(FA){var E9=-1,FB;while(++E9<Ez){E8[(FB=Ev[E9]).i]=FB.x(FA)}return E8.join("")}};d3.interpolateRgb=function(Ev,e){Ev=d3.rgb(Ev);e=d3.rgb(e);var Ex=Ev.r,Ew=Ev.g,E0=Ev.b,Ez=e.r-Ex,Ey=e.g-Ew,E1=e.b-E0;return function(E2){return"#"+BI(Math.round(Ex+Ez*E2))+BI(Math.round(Ew+Ey*E2))+BI(Math.round(E0+E1*E2))}};d3.interpolateHsl=function(Ew,e){Ew=d3.hsl(Ew);e=d3.hsl(e);var E1=Ew.h,E0=Ew.s,Ex=Ew.l,Ez=e.h-E1,Ey=e.s-E0,Ev=e.l-Ex;return function(E2){return Ac(E1+Ez*E2,E0+Ey*E2,Ex+Ev*E2).toString()}};d3.interpolateArray=function(Ey,Ew){var Ev=[],E1=[],Ex=Ey.length,e=Ew.length,E0=Math.min(Ey.length,Ew.length),Ez;for(Ez=0;Ez<E0;++Ez){Ev.push(d3.interpolate(Ey[Ez],Ew[Ez]))}for(;Ez<Ex;++Ez){E1[Ez]=Ey[Ez]}for(;Ez<e;++Ez){E1[Ez]=Ew[Ez]}return function(E2){for(Ez=0;Ez<E0;++Ez){E1[Ez]=Ev[Ez](E2)}return E1}};d3.interpolateObject=function(Ev,e){var Ex={},Ey={},Ew;for(Ew in Ev){if(Ew in e){Ex[Ew]=DD(Ew)(Ev[Ew],e[Ew])}else{Ey[Ew]=Ev[Ew]}}for(Ew in e){if(!(Ew in Ev)){Ey[Ew]=e[Ew]}}return function(Ez){for(Ew in Ex){Ey[Ew]=Ex[Ew](Ez)}return Ey}};var DS=/[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g;function DD(e){return e=="transform"?d3.interpolateTransform:d3.interpolate}d3.interpolators=[d3.interpolateObject,function(Ev,e){return(e instanceof Array)&&d3.interpolateArray(Ev,e)},function(Ev,e){return(typeof Ev==="string"||typeof e==="string")&&d3.interpolateString(Ev+"",e+"")},function(Ev,e){return(typeof e==="string"?x.has(e)||/^(#|rgb\(|hsl\()/.test(e):e instanceof Ct||e instanceof DB)&&d3.interpolateRgb(Ev,e)},function(Ev,e){return !isNaN(Ev=+Ev)&&!isNaN(e=+e)&&d3.interpolateNumber(Ev,e)}];function EW(Ev,e){e=e-(Ev=+Ev)?1/(e-Ev):0;return function(Ew){return(Ew-Ev)*e}}function AF(Ev,e){e=e-(Ev=+Ev)?1/(e-Ev):0;return function(Ew){return Math.max(0,Math.min(1,(Ew-Ev)*e))}}d3.rgb=function(Ew,Ev,e){return arguments.length===1?(Ew instanceof Ct?CO(Ew.r,Ew.g,Ew.b):AR(""+Ew,CO,Ac)):CO(~~Ew,~~Ev,~~e)};function CO(Ew,Ev,e){return new Ct(Ew,Ev,e)}function Ct(Ew,Ev,e){this.r=Ew;this.g=Ev;this.b=e}Ct.prototype.brighter=function(Ev){Ev=Math.pow(0.7,arguments.length?Ev:1);var Ey=this.r,Ex=this.g,e=this.b,Ew=30;if(!Ey&&!Ex&&!e){return CO(Ew,Ew,Ew)}if(Ey&&Ey<Ew){Ey=Ew}if(Ex&&Ex<Ew){Ex=Ew}if(e&&e<Ew){e=Ew}return CO(Math.min(255,Math.floor(Ey/Ev)),Math.min(255,Math.floor(Ex/Ev)),Math.min(255,Math.floor(e/Ev)))};Ct.prototype.darker=function(e){e=Math.pow(0.7,arguments.length?e:1);return CO(Math.floor(e*this.r),Math.floor(e*this.g),Math.floor(e*this.b))};Ct.prototype.hsl=function(){return Ds(this.r,this.g,this.b)};Ct.prototype.toString=function(){return"#"+BI(this.r)+BI(this.g)+BI(this.b)};function BI(e){return e<16?"0"+Math.max(0,e).toString(16):Math.min(255,e).toString(16)}function AR(Ez,Ex,E0){var e=0,Ew=0,Ey=0,E2,E1,Ev;E2=/([a-z]+)\((.*)\)/i.exec(Ez);if(E2){E1=E2[2].split(",");switch(E2[1]){case"hsl":return E0(parseFloat(E1[0]),parseFloat(E1[1])/100,parseFloat(E1[2])/100);case"rgb":return Ex(Ch(E1[0]),Ch(E1[1]),Ch(E1[2]))}}if(Ev=x.get(Ez)){return Ex(Ev.r,Ev.g,Ev.b)}if(Ez!=null&&Ez.charAt(0)==="#"){if(Ez.length===4){e=Ez.charAt(1);e+=e;Ew=Ez.charAt(2);Ew+=Ew;Ey=Ez.charAt(3);Ey+=Ey}else{if(Ez.length===7){e=Ez.substring(1,3);Ew=Ez.substring(3,5);Ey=Ez.substring(5,7)}}e=parseInt(e,16);Ew=parseInt(Ew,16);Ey=parseInt(Ey,16)}return Ex(e,Ew,Ey)}function Ds(e,Ey,E0){var Ew=Math.min(e/=255,Ey/=255,E0/=255),E1=Math.max(e,Ey,E0),Ez=E1-Ew,Ex,E2,Ev=(E1+Ew)/2;if(Ez){E2=Ev<0.5?Ez/(E1+Ew):Ez/(2-E1-Ew);if(e==E1){Ex=(Ey-E0)/Ez+(Ey<E0?6:0)}else{if(Ey==E1){Ex=(E0-e)/Ez+2}else{Ex=(e-Ey)/Ez+4}}Ex*=60}else{E2=Ex=0}return CX(Ex,E2,Ev)}function Ch(Ev){var e=parseFloat(Ev);return Ev.charAt(Ev.length-1)==="%"?Math.round(e*2.55):e}var x=d3.map({aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#00ffff",aquamarine:"#7fffd4",azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",black:"#000000",blanchedalmond:"#ffebcd",blue:"#0000ff",blueviolet:"#8a2be2",brown:"#a52a2a",burlywood:"#deb887",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",darkgreen:"#006400",darkgrey:"#a9a9a9",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",darkturquoise:"#00ced1",darkviolet:"#9400d3",deeppink:"#ff1493",deepskyblue:"#00bfff",dimgray:"#696969",dimgrey:"#696969",dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",fuchsia:"#ff00ff",gainsboro:"#dcdcdc",ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gray:"#808080",green:"#008000",greenyellow:"#adff2f",grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",indianred:"#cd5c5c",indigo:"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",lavender:"#e6e6fa",lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",lightcoral:"#f08080",lightcyan:"#e0ffff",lightgoldenrodyellow:"#fafad2",lightgray:"#d3d3d3",lightgreen:"#90ee90",lightgrey:"#d3d3d3",lightpink:"#ffb6c1",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",lightskyblue:"#87cefa",lightslategray:"#778899",lightslategrey:"#778899",lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#00ff00",limegreen:"#32cd32",linen:"#faf0e6",magenta:"#ff00ff",maroon:"#800000",mediumaquamarine:"#66cdaa",mediumblue:"#0000cd",mediumorchid:"#ba55d3",mediumpurple:"#9370db",mediumseagreen:"#3cb371",mediumslateblue:"#7b68ee",mediumspringgreen:"#00fa9a",mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",navajowhite:"#ffdead",navy:"#000080",oldlace:"#fdf5e6",olive:"#808000",olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",palevioletred:"#db7093",papayawhip:"#ffefd5",peachpuff:"#ffdab9",peru:"#cd853f",pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",red:"#ff0000",rosybrown:"#bc8f8f",royalblue:"#4169e1",saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",seashell:"#fff5ee",sienna:"#a0522d",silver:"#c0c0c0",skyblue:"#87ceeb",slateblue:"#6a5acd",slategray:"#708090",slategrey:"#708090",snow:"#fffafa",springgreen:"#00ff7f",steelblue:"#4682b4",tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",white:"#ffffff",whitesmoke:"#f5f5f5",yellow:"#ffff00",yellowgreen:"#9acd32"});x.forEach(function(e,Ev){x.set(e,AR(Ev,CO,Ac))});d3.hsl=function(Ew,Ev,e){return arguments.length===1?(Ew instanceof DB?CX(Ew.h,Ew.s,Ew.l):AR(""+Ew,Ds,CX)):CX(+Ew,+Ev,+e)};function CX(Ew,Ev,e){return new DB(Ew,Ev,e)}function DB(Ew,Ev,e){this.h=Ew;this.s=Ev;this.l=e}DB.prototype.brighter=function(e){e=Math.pow(0.7,arguments.length?e:1);return CX(this.h,this.s,this.l/e)};DB.prototype.darker=function(e){e=Math.pow(0.7,arguments.length?e:1);return CX(this.h,this.s,e*this.l)};DB.prototype.rgb=function(){return Ac(this.h,this.s,this.l)};DB.prototype.toString=function(){return this.rgb().toString()};function Ac(Ez,Ey,e){var Ex,Ew;Ez=Ez%360;if(Ez<0){Ez+=360}Ey=Ey<0?0:Ey>1?1:Ey;e=e<0?0:e>1?1:e;Ew=e<=0.5?e*(1+Ey):e+Ey-e*Ey;Ex=2*e-Ew;function Ev(E1){if(E1>360){E1-=360}else{if(E1<0){E1+=360}}if(E1<60){return Ex+(Ew-Ex)*E1/60}if(E1<180){return Ew}if(E1<240){return Ex+(Ew-Ex)*(240-E1)/60}return Ex}function E0(E1){return Math.round(Ev(E1)*255)}return CO(E0(Ez+120),E0(Ez),E0(Ez-120))}function CA(e){Ci(e,B9);return e}var Bn=function(e,Ev){return Ev.querySelector(e)},Db=function(e,Ev){return Ev.querySelectorAll(e)},CW=document.documentElement,B=CW.matchesSelector||CW.webkitMatchesSelector||CW.mozMatchesSelector||CW.msMatchesSelector||CW.oMatchesSelector,A=function(Ev,e){return B.call(Ev,e)};if(typeof Sizzle==="function"){Bn=function(e,Ev){return Sizzle(e,Ev)[0]};Db=function(e,Ev){return Sizzle.uniqueSort(Sizzle(e,Ev))};A=Sizzle.matchesSelector}var B9=[];d3.selection=function(){return D7};d3.selection.prototype=B9;B9.select=function(Ez){var Ew=[],E3,e,E2,Ex;if(typeof Ez!=="function"){Ez=S(Ez)}for(var E0=-1,Ey=this.length;++E0<Ey;){Ew.push(E3=[]);E3.parentNode=(E2=this[E0]).parentNode;for(var E1=-1,Ev=E2.length;++E1<Ev;){if(Ex=E2[E1]){E3.push(e=Ez.call(Ex,Ex.__data__,E1));if(e&&"__data__" in Ex){e.__data__=Ex.__data__}}else{E3.push(null)}}}return CA(Ew)};function S(e){return function(){return Bn(e,this)}}B9.selectAll=function(Ey){var Ev=[],E2,Ew;if(typeof Ey!=="function"){Ey=Bc(Ey)}for(var Ez=-1,Ex=this.length;++Ez<Ex;){for(var E1=this[Ez],E0=-1,e=E1.length;++E0<e;){if(Ew=E1[E0]){Ev.push(E2=B2(Ey.call(Ew,Ew.__data__,E0)));E2.parentNode=Ew}}}return CA(Ev)};function Bc(e){return function(){return Db(e,this)}}B9.attr=function(Ev,E1){Ev=d3.ns.qualify(Ev);if(arguments.length<2){var Ez=this.node();return Ev.local?Ez.getAttributeNS(Ev.space,Ev.local):Ez.getAttribute(Ev)}function Ew(){this.removeAttribute(Ev)}function Ey(){this.removeAttributeNS(Ev.space,Ev.local)}function E2(){this.setAttribute(Ev,E1)}function Ex(){this.setAttributeNS(Ev.space,Ev.local,E1)}function E0(){var E3=E1.apply(this,arguments);if(E3==null){this.removeAttribute(Ev)}else{this.setAttribute(Ev,E3)}}function e(){var E3=E1.apply(this,arguments);if(E3==null){this.removeAttributeNS(Ev.space,Ev.local)}else{this.setAttributeNS(Ev.space,Ev.local,E3)}}return this.each(E1==null?(Ev.local?Ey:Ew):(typeof E1==="function"?(Ev.local?e:E0):(Ev.local?Ex:E2)))};B9.classed=function(e,Ew){var Ex=e.split(G),Ey=Ex.length,Ev=-1;if(arguments.length>1){while(++Ev<Ey){Dy.call(this,Ex[Ev],Ew)}return this}else{while(++Ev<Ey){if(!Dy.call(this,Ex[Ev])){return false}}return true}};var G=/\s+/g;function Dy(e,Ey){var Ev=new RegExp("(^|\\s+)"+d3.requote(e)+"(\\s+|$)","g");if(arguments.length<2){var Ex=this.node();if(E1=Ex.classList){return E1.contains(e)}var E1=Ex.className;Ev.lastIndex=0;return Ev.test(E1.baseVal!=null?E1.baseVal:E1)}function E0(){if(E4=this.classList){return E4.add(e)}var E4=this.className,E2=E4.baseVal!=null,E3=E2?E4.baseVal:E4;Ev.lastIndex=0;if(!Ev.test(E3)){E3=BR(E3+" "+e);if(E2){E4.baseVal=E3}else{this.className=E3}}}function Ez(){if(E4=this.classList){return E4.remove(e)}var E4=this.className,E2=E4.baseVal!=null,E3=E2?E4.baseVal:E4;E3=BR(E3.replace(Ev," "));if(E2){E4.baseVal=E3}else{this.className=E3}}function Ew(){(Ey.apply(this,arguments)?E0:Ez).call(this)}return this.each(typeof Ey==="function"?Ew:Ey?E0:Ez)}B9.style=function(Ew,Ez,Ex){if(arguments.length<3){Ex=""}if(arguments.length<2){return window.getComputedStyle(this.node(),null).getPropertyValue(Ew)}function Ev(){this.style.removeProperty(Ew)}function Ey(){this.style.setProperty(Ew,Ez,Ex)}function e(){var E0=Ez.apply(this,arguments);if(E0==null){this.style.removeProperty(Ew)}else{this.style.setProperty(Ew,E0,Ex)}}return this.each(Ez==null?Ev:(typeof Ez==="function"?e:Ey))};B9.property=function(Ev,Ex){if(arguments.length<2){return this.node()[Ev]}function e(){delete this[Ev]}function Ew(){this[Ev]=Ex}function Ey(){var Ez=Ex.apply(this,arguments);if(Ez==null){delete this[Ev]}else{this[Ev]=Ez}}return this.each(Ex==null?e:(typeof Ex==="function"?Ey:Ew))};B9.text=function(e){return arguments.length<1?this.node().textContent:this.each(typeof e==="function"?function(){var Ev=e.apply(this,arguments);this.textContent=Ev==null?"":Ev}:e==null?function(){this.textContent=""}:function(){this.textContent=e})};B9.html=function(e){return arguments.length<1?this.node().innerHTML:this.each(typeof e==="function"?function(){var Ev=e.apply(this,arguments);this.innerHTML=Ev==null?"":Ev}:e==null?function(){this.innerHTML=""}:function(){this.innerHTML=e})};B9.append=function(Ev){Ev=d3.ns.qualify(Ev);function e(){return this.appendChild(document.createElementNS(this.namespaceURI,Ev))}function Ew(){return this.appendChild(document.createElementNS(Ev.space,Ev.local))}return this.select(Ev.local?Ew:e)};B9.insert=function(e,Ew){e=d3.ns.qualify(e);function Ev(){return this.insertBefore(document.createElementNS(this.namespaceURI,e),Bn(Ew,this))}function Ex(){return this.insertBefore(document.createElementNS(e.space,e.local),Bn(Ew,this))}return this.select(e.local?Ex:Ev)};B9.remove=function(){return this.each(function(){var e=this.parentNode;if(e){e.removeChild(this)}})};B9.data=function(E1,E3){var Ey=-1,Ev=this.length,E2,Ew;if(!arguments.length){E1=new Array(Ev=(E2=this[0]).length);while(++Ey<Ev){if(Ew=E2[Ey]){E1[Ey]=Ew.__data__}}return E1}function Ez(FG,E8){var FB,E5=FG.length,E7=E8.length,FE=Math.min(E5,E7),FD=Math.max(E5,E7),FI=[],FF=[],FC=[],E6,E4;if(E3){var FJ=new AK,FH=[],FA,E9=E8.length;for(FB=-1;++FB<E5;){FA=E3.call(E6=FG[FB],E6.__data__,FB);if(FJ.has(FA)){FC[E9++]=E6}else{FJ.set(FA,E6)}FH.push(FA)}for(FB=-1;++FB<E7;){FA=E3.call(E8,E4=E8[FB],FB);if(FJ.has(FA)){FI[FB]=E6=FJ.get(FA);E6.__data__=E4;FF[FB]=FC[FB]=null}else{FF[FB]=b(E4);FI[FB]=FC[FB]=null}FJ.remove(FA)}for(FB=-1;++FB<E5;){if(FJ.has(FH[FB])){FC[FB]=FG[FB]}}}else{for(FB=-1;++FB<FE;){E6=FG[FB];E4=E8[FB];if(E6){E6.__data__=E4;FI[FB]=E6;FF[FB]=FC[FB]=null}else{FF[FB]=b(E4);FI[FB]=FC[FB]=null}}for(;FB<E7;++FB){FF[FB]=b(E8[FB]);FI[FB]=FC[FB]=null}for(;FB<FD;++FB){FC[FB]=FG[FB];FF[FB]=FI[FB]=null}}FF.update=FI;FF.parentNode=FI.parentNode=FC.parentNode=FG.parentNode;E0.push(FF);Ex.push(FI);e.push(FC)}var E0=Az([]),Ex=CA([]),e=CA([]);if(typeof E1==="function"){while(++Ey<Ev){Ez(E2=this[Ey],E1.call(E2,E2.parentNode.__data__,Ey))}}else{while(++Ey<Ev){Ez(E2=this[Ey],E1)}}Ex.enter=function(){return E0};Ex.exit=function(){return e};return Ex};function b(e){return{__data__:e}}B9.datum=B9.map=function(e){return arguments.length<1?this.property("__data__"):this.property("__data__",e)};B9.filter=function(e){var Ew=[],E2,E1,Ex;if(typeof e!=="function"){e=AY(e)}for(var Ez=0,Ey=this.length;Ez<Ey;Ez++){Ew.push(E2=[]);E2.parentNode=(E1=this[Ez]).parentNode;for(var E0=0,Ev=E1.length;E0<Ev;E0++){if((Ex=E1[E0])&&e.call(Ex,Ex.__data__,E0)){E2.push(Ex)}}}return CA(Ew)};function AY(e){return function(){return A(this,e)}}B9.order=function(){for(var Ev=-1,e=this.length;++Ev<e;){for(var Ez=this[Ev],Ew=Ez.length-1,Ex=Ez[Ew],Ey;--Ew>=0;){if(Ey=Ez[Ew]){if(Ex&&Ex!==Ey.nextSibling){Ex.parentNode.insertBefore(Ey,Ex)}Ex=Ey}}}return this};B9.sort=function(Ev){Ev=D3.apply(this,arguments);for(var Ew=-1,e=this.length;++Ew<e;){this[Ew].sort(Ev)}return this.order()};function D3(e){if(!arguments.length){e=d3.ascending}return function(Ew,Ev){return e(Ew&&Ew.__data__,Ev&&Ev.__data__)}}B9.on=function(Ex,Ey,e){if(arguments.length<3){e=false}var Ev="__on"+Ex,Ew=Ex.indexOf(".");if(Ew>0){Ex=Ex.substring(0,Ew)}if(arguments.length<2){return(Ew=this.node()[Ev])&&Ew._}return this.each(function(E3,E0){var E1=this,E2=E1[Ev];if(E2){E1.removeEventListener(Ex,E2,E2.$);delete E1[Ev]}if(Ey){E1.addEventListener(Ex,E1[Ev]=Ez,Ez.$=e);Ez._=Ey}function Ez(E4){var E5=d3.event;d3.event=E4;try{Ey.call(E1,E1.__data__,E0)}finally{d3.event=E5}}})};B9.each=function(E0){for(var Ev=-1,e=this.length;++Ev<e;){for(var Ey=this[Ev],Ew=-1,Ez=Ey.length;++Ew<Ez;){var Ex=Ey[Ew];if(Ex){E0.call(Ex,Ex.__data__,Ew,Ev)}}}return this};B9.call=function(e){e.apply(this,(arguments[0]=this,arguments));return this};B9.empty=function(){return !this.node()};B9.node=function(E0){for(var Ev=0,e=this.length;Ev<e;Ev++){for(var Ey=this[Ev],Ew=0,Ez=Ey.length;Ew<Ez;Ew++){var Ex=Ey[Ew];if(Ex){return Ex}}}return null};B9.transition=function(){var Ev=[],Ew,Ez;for(var Ex=-1,e=this.length;++Ex<e;){Ev.push(Ew=[]);for(var E0=this[Ex],Ey=-1,E1=E0.length;++Ey<E1;){Ew.push((Ez=E0[Ey])?{node:Ez,delay:Cn,duration:EE}:null)}}return D5(Ev,EL||++EZ,Date.now())};var D7=CA([[document]]);D7[0].parentNode=CW;d3.select=function(e){return typeof e==="string"?D7.select(e):CA([[e]])};d3.selectAll=function(e){return typeof e==="string"?D7.selectAll(e):CA([B2(e)])};function Az(e){Ci(e,Cq);return e}var Cq=[];d3.selection.enter=Az;d3.selection.enter.prototype=Cq;Cq.append=B9.append;Cq.insert=B9.insert;Cq.empty=B9.empty;Cq.node=B9.node;Cq.select=function(Ez){var Ew=[],E4,e,E2,E3,Ey;for(var E0=-1,Ex=this.length;++E0<Ex;){E2=(E3=this[E0]).update;Ew.push(E4=[]);E4.parentNode=E3.parentNode;for(var E1=-1,Ev=E3.length;++E1<Ev;){if(Ey=E3[E1]){E4.push(E2[E1]=e=Ez.call(E3.parentNode,Ey.__data__,E1));e.__data__=Ey.__data__}else{E4.push(null)}}}return CA(Ew)};function D5(e,Ez,Ex){Ci(e,CR);var Ew=new AK,Ev=d3.dispatch("start","end"),Ey=Ad;e.id=Ez;e.time=Ex;e.tween=function(E0,E1){if(arguments.length<2){return Ew.get(E0)}if(E1==null){Ew.remove(E0)}else{Ew.set(E0,E1)}return e};e.ease=function(E0){if(!arguments.length){return Ey}Ey=typeof E0==="function"?E0:d3.ease.apply(d3,arguments);return e};e.each=function(E0,E1){if(arguments.length<2){return B3.call(e,E0)}Ev.on(E0,E1);return e};d3.timer(function(E0){e.each(function(E8,E5,E4){var FA=[],E2=this,E6=e[E4][E5].delay,E3=e[E4][E5].duration,FB=E2.__transition__||(E2.__transition__={active:0,count:0});++FB.count;E6<=E0?E1(E0):d3.timer(E1,E6,Ex);function E1(FC){if(FB.active>Ez){return E9()}FB.active=Ez;Ew.forEach(function(FD,FE){if(tween=FE.call(E2,E8,E5)){FA.push(tween)}});Ev.start.call(E2,E8,E5);if(!E7(FC)){d3.timer(E7,0,Ex)}return 1}function E7(FC){if(FB.active!==Ez){return E9()}var FD=(FC-E6)/E3,FE=Ey(FD),FF=FA.length;while(FF>0){FA[--FF].call(E2,FE)}if(FD>=1){E9();EL=Ez;Ev.end.call(E2,E8,E5);EL=0;return 1}}function E9(){if(!--FB.count){delete E2.__transition__}return 1}});return 1},0,Ex);return e}var Q={};function EC(Ew,Ev,e){return e!=""&&Q}function E(Ex,e){var Ew=DD(Ex);function Ev(E2,E1,Ez){var E0=e.call(this,E2,E1);return E0==null?Ez!=""&&Q:Ez!=E0&&Ew(Ez,E0)}function Ey(E1,E0,Ez){return Ez!=e&&Ew(Ez,e)}return typeof e==="function"?Ev:e==null?EC:(e+="",Ey)}var CR=[],EZ=0,EL=0,D=0,EA=250,C3=d3.ease("cubic-in-out"),Cn=D,EE=EA,Ad=C3;CR.call=B9.call;d3.transition=function(e){return arguments.length?(EL?e.transition():e):D7.transition()};d3.transition.prototype=CR;CR.select=function(Ez){var Ew=[],E3,e,Ex;if(typeof Ez!=="function"){Ez=S(Ez)}for(var E0=-1,Ey=this.length;++E0<Ey;){Ew.push(E3=[]);for(var E2=this[E0],E1=-1,Ev=E2.length;++E1<Ev;){if((Ex=E2[E1])&&(e=Ez.call(Ex.node,Ex.node.__data__,E1))){if("__data__" in Ex.node){e.__data__=Ex.node.__data__}E3.push({node:e,delay:Ex.delay,duration:Ex.duration})}else{E3.push(null)}}}return D5(Ew,this.id,this.time).ease(this.ease())};CR.selectAll=function(E0){var Ex=[],E5,e,Ey;if(typeof E0!=="function"){E0=Bc(E0)}for(var E2=-1,Ez=this.length;++E2<Ez;){for(var E4=this[E2],E3=-1,Ew=E4.length;++E3<Ew;){if(Ey=E4[E3]){e=E0.call(Ey.node,Ey.node.__data__,E3);Ex.push(E5=[]);for(var E1=-1,Ev=e.length;++E1<Ev;){E5.push({node:e[E1],delay:Ey.delay,duration:Ey.duration})}}}}return D5(Ex,this.id,this.time).ease(this.ease())};CR.attr=function(e,Ev){return this.attrTween(e,E(e,Ev))};CR.attrTween=function(e,Ew){var Ev=d3.ns.qualify(e);function Ex(E1,Ez){var E0=Ew.call(this,E1,Ez,this.getAttribute(Ev));return E0===Q?(this.removeAttribute(Ev),null):E0&&function(E2){this.setAttribute(Ev,E0(E2))}}function Ey(E1,Ez){var E0=Ew.call(this,E1,Ez,this.getAttributeNS(Ev.space,Ev.local));return E0===Q?(this.removeAttributeNS(Ev.space,Ev.local),null):E0&&function(E2){this.setAttributeNS(Ev.space,Ev.local,E0(E2))}}return this.tween("attr."+e,Ev.local?Ey:Ex)};CR.style=function(e,Ew,Ev){if(arguments.length<3){Ev=""}return this.styleTween(e,E(e,Ew),Ev)};CR.styleTween=function(e,Ew,Ev){if(arguments.length<3){Ev=""}return this.tween("style."+e,function(Ez,Ex){var Ey=Ew.call(this,Ez,Ex,window.getComputedStyle(this,null).getPropertyValue(e));return Ey===Q?(this.style.removeProperty(e),null):Ey&&function(E0){this.style.setProperty(e,Ey(E0),Ev)}})};CR.text=function(e){return this.tween("text",function(Ew,Ev){this.textContent=typeof e==="function"?e.call(this,Ew,Ev):e})};CR.remove=function(){return this.each("end.transition",function(){var e;if(!this.__transition__&&(e=this.parentNode)){e.removeChild(this)}})};CR.delay=function(Ev){var e=this;return e.each(typeof Ev==="function"?function(Ey,Ex,Ew){e[Ew][Ex].delay=Ev.apply(this,arguments)|0}:(Ev=Ev|0,function(Ey,Ex,Ew){e[Ew][Ex].delay=Ev}))};CR.duration=function(Ev){var e=this;return e.each(typeof Ev==="function"?function(Ey,Ex,Ew){e[Ew][Ex].duration=Math.max(1,Ev.apply(this,arguments)|0)}:(Ev=Math.max(1,Ev|0),function(Ey,Ex,Ew){e[Ew][Ex].duration=Ev}))};function B3(E4){var e=EL,Ey=Ad,E2=Cn,Ez=EE;EL=this.id;Ad=this.ease();for(var E0=0,Ex=this.length;E0<Ex;E0++){for(var E3=this[E0],E1=0,Ev=E3.length;E1<Ev;E1++){var Ew=E3[E1];if(Ew){Cn=this[E0][E1].delay;EE=this[E0][E1].duration;E4.call(Ew=Ew.node,Ew.__data__,E1,E0)}}}EL=e;Ad=Ey;Cn=E2;EE=Ez;return this}CR.transition=function(){return this.select(t)};var A6=null,BE,C1;d3.timer=function(Ez,e,Ey){var Ex=false,Ew,Ev=A6;if(arguments.length<3){if(arguments.length<2){e=0}else{if(!isFinite(e)){return}}Ey=Date.now()}while(Ev){if(Ev.callback===Ez){Ev.then=Ey;Ev.delay=e;Ex=true;break}Ew=Ev;Ev=Ev.next}if(!Ex){A6={callback:Ez,then:Ey,delay:e,next:A6}}if(!BE){C1=clearTimeout(C1);BE=1;EU(EV)}};function EV(){var e,Ew=Date.now(),Ex=A6;while(Ex){e=Ew-Ex.then;if(e>=Ex.delay){Ex.flush=Ex.callback(e)}Ex=Ex.next}var Ev=Cs()-Ew;if(Ev>24){if(isFinite(Ev)){clearTimeout(C1);C1=setTimeout(EV,Ev)}BE=0}else{BE=1;EU(EV)}}d3.timer.flush=function(){var e,Ev=Date.now(),Ew=A6;while(Ew){e=Ev-Ew.then;if(!Ew.delay){Ew.flush=Ew.callback(e)}Ew=Ew.next}Cs()};function Cs(){var Ev=null,e=A6,Ew=Infinity;while(e){if(e.flush){e=Ev?Ev.next=e.next:A6=e.next}else{Ew=Math.min(Ew,e.then+e.delay);e=(Ev=e).next}}return Ew}var EU=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(e){setTimeout(e,17)};d3.transform=function(Ev){var Ew=document.createElementNS(d3.ns.prefix.svg,"g"),e={a:1,b:0,c:0,d:1,e:0,f:0};return(d3.transform=function(Ex){Ew.setAttribute("transform",Ex);var Ey=Ew.transform.baseVal.consolidate();return new N(Ey?Ey.matrix:e)})(Ev)};function N(e){var Ex=[e.a,e.b],Ev=[e.c,e.d],Ez=DA(Ex),Ew=Cj(Ex,Ev),Ey=DA(Ax(Ev,Ex,-Ew))||0;if(Ex[0]*Ev[1]<Ev[0]*Ex[1]){Ex[0]*=-1;Ex[1]*=-1;Ez*=-1;Ew*=-1}this.rotate=(Ez?Math.atan2(Ex[1],Ex[0]):Math.atan2(-Ev[0],Ev[1]))*CY;this.translate=[e.e,e.f];this.scale=[Ez,Ey];this.skew=Ey?Math.atan2(Ew,Ey)*CY:0}N.prototype.toString=function(){return"translate("+this.translate+")rotate("+this.rotate+")skewX("+this.skew+")scale("+this.scale+")"};function Cj(Ev,e){return Ev[0]*e[0]+Ev[1]*e[1]}function DA(e){var Ev=Math.sqrt(Cj(e,e));if(Ev){e[0]/=Ev;e[1]/=Ev}return Ev}function Ax(Ev,e,Ew){Ev[0]+=Ew*e[0];Ev[1]+=Ew*e[1];return Ev}var CY=180/Math.PI;d3.mouse=function(e){return AS(e,u())};var BP=/WebKit/.test(navigator.userAgent)?-1:0;function AS(Ex,E0){var Ey=Ex.ownerSVGElement||Ex;if(Ey.createSVGPoint){var Ev=Ey.createSVGPoint();if((BP<0)&&(window.scrollX||window.scrollY)){Ey=d3.select(document.body).append("svg").style("position","absolute").style("top",0).style("left",0);var Ew=Ey[0][0].getScreenCTM();BP=!(Ew.f||Ew.e);Ey.remove()}if(BP){Ev.x=E0.pageX;Ev.y=E0.pageY}else{Ev.x=E0.clientX;Ev.y=E0.clientY}Ev=Ev.matrixTransform(Ex.getScreenCTM().inverse());return[Ev.x,Ev.y]}var Ez=Ex.getBoundingClientRect();return[E0.clientX-Ez.left-Ex.clientLeft,E0.clientY-Ez.top-Ex.clientTop]}d3.touches=function(e,Ev){if(arguments.length<2){Ev=u().touches}return Ev?B2(Ev).map(function(Ex){var Ew=AS(e,Ex);Ew.identifier=Ex.identifier;return Ew}):[]};function AJ(){}d3.scale={};function CP(Ev){var Ew=Ev[0],e=Ev[Ev.length-1];return Ew<e?[Ew,e]:[e,Ew]}function AT(e){return e.rangeExtent?e.rangeExtent():CP(e.range())}function Dk(E0,Ey){var Ez=0,Ex=E0.length-1,Ew=E0[Ez],Ev=E0[Ex],e;if(Ev<Ew){e=Ez;Ez=Ex;Ex=e;e=Ew;Ew=Ev;Ev=e}if(e=Ev-Ew){Ey=Ey(e);E0[Ez]=Ey.floor(Ew);E0[Ex]=Ey.ceil(Ev)}return E0}function Cc(){return Math}d3.scale.linear=function(){return CM([0,1],[0,1],d3.interpolate,false)};function CM(Ez,Ex,Ey,E1){var Ew,Ev;function e(){var E2=Math.min(Ez.length,Ex.length)>2?f:AI,E3=E1?AF:EW;Ew=E2(Ez,Ex,E3,Ey);Ev=E2(Ex,Ez,E3,d3.interpolate);return E0}function E0(E2){return Ew(E2)}E0.invert=function(E2){return Ev(E2)};E0.domain=function(E2){if(!arguments.length){return Ez}Ez=E2.map(Number);return e()};E0.range=function(E2){if(!arguments.length){return Ex}Ex=E2;return e()};E0.rangeRound=function(E2){return E0.range(E2).interpolate(d3.interpolateRound)};E0.clamp=function(E2){if(!arguments.length){return E1}E1=E2;return e()};E0.interpolate=function(E2){if(!arguments.length){return Ey}Ey=E2;return e()};E0.ticks=function(E2){return Cm(Ez,E2)};E0.tickFormat=function(E2){return Cw(Ez,E2)};E0.nice=function(){Dk(Ez,AM);return e()};E0.copy=function(){return CM(Ez,Ex,Ey,E1)};return e()}function Dc(Ev,e){return d3.rebind(Ev,e,"range","rangeRound","interpolate","clamp")}function AM(e){e=Math.pow(10,Math.round(Math.log(e)/Math.LN10)-1);return{floor:function(Ev){return Math.floor(Ev/e)*e},ceil:function(Ev){return Math.ceil(Ev/e)*e}}}function O(Ez,e){var Ew=CP(Ez),Ev=Ew[1]-Ew[0],Ey=Math.pow(10,Math.floor(Math.log(Ev/e)/Math.LN10)),Ex=e/Ev*Ey;if(Ex<=0.15){Ey*=10}else{if(Ex<=0.35){Ey*=5}else{if(Ex<=0.75){Ey*=2}}}Ew[0]=Math.ceil(Ew[0]/Ey)*Ey;Ew[1]=Math.floor(Ew[1]/Ey)*Ey+Ey*0.5;Ew[2]=Ey;return Ew}function Cm(Ev,e){return d3.range.apply(d3,O(Ev,e))}function Cw(Ev,e){return d3.format(",."+Math.max(0,-Math.floor(Math.log(O(Ev,e)[2])/Math.LN10+0.01))+"f")}function AI(Ey,e,Ez,Ew){var Ev=Ez(Ey[0],Ey[1]),Ex=Ew(e[0],e[1]);return function(E0){return Ex(Ev(E0))}}function f(E0,Ev,E1,Ey){var Ex=[],Ez=[],Ew=0,e=Math.min(E0.length,Ev.length)-1;if(E0[e]<E0[0]){E0=E0.slice().reverse();Ev=Ev.slice().reverse()}while(++Ew<=e){Ex.push(E1(E0[Ew-1],E0[Ew]));Ez.push(Ey(Ev[Ew-1],Ev[Ew]))}return function(E2){var E3=d3.bisect(E0,E2,1,e)-1;return Ez[E3](Ex[E3](E2))}}d3.scale.log=function(){return D1(d3.scale.linear(),Dd)};function D1(e,Ev){var Ew=Ev.pow;function Ex(Ey){return e(Ev(Ey))}Ex.invert=function(Ey){return Ew(e.invert(Ey))};Ex.domain=function(Ey){if(!arguments.length){return e.domain().map(Ew)}Ev=Ey[0]<0?Dg:Dd;Ew=Ev.pow;e.domain(Ey.map(Ev));return Ex};Ex.nice=function(){e.domain(Dk(e.domain(),Cc));return Ex};Ex.ticks=function(){var E3=CP(e.domain()),E4=[];if(E3.every(isFinite)){var E2=Math.floor(E3[0]),E1=Math.ceil(E3[1]),E0=Ew(E3[0]),Ez=Ew(E3[1]);if(Ev===Dg){E4.push(Ew(E2));for(;E2++<E1;){for(var Ey=9;Ey>0;Ey--){E4.push(Ew(E2)*Ey)}}}else{for(;E2<E1;E2++){for(var Ey=1;Ey<10;Ey++){E4.push(Ew(E2)*Ey)}}E4.push(Ew(E2))}for(E2=0;E4[E2]<E0;E2++){}for(E1=E4.length;E4[E1-1]>Ez;E1--){}E4=E4.slice(E2,E1)}return E4};Ex.tickFormat=function(E2,E1){if(arguments.length<2){E1=Bo}if(arguments.length<1){return E1}var Ey=E2/Ex.ticks().length,Ez=Ev===Dg?(E0=-1e-12,Math.floor):(E0=1e-12,Math.ceil),E0;return function(E3){return E3/Ew(Ez(Ev(E3)+E0))<Ey?E1(E3):""}};Ex.copy=function(){return D1(e.copy(),Ev)};return Dc(Ex,e)}var Bo=d3.format(".0e");function Dd(e){return Math.log(e<0?0:e)/Math.LN10}function Dg(e){return -Math.log(e>0?0:-e)/Math.LN10}Dd.pow=function(e){return Math.pow(10,e)};Dg.pow=function(e){return -Math.pow(10,-e)};d3.scale.pow=function(){return Dp(d3.scale.linear(),1)};function Dp(e,Ew){var Ev=DU(Ew),Ex=DU(1/Ew);function Ey(Ez){return e(Ev(Ez))}Ey.invert=function(Ez){return Ex(e.invert(Ez))};Ey.domain=function(Ez){if(!arguments.length){return e.domain().map(Ex)}e.domain(Ez.map(Ev));return Ey};Ey.ticks=function(Ez){return Cm(Ey.domain(),Ez)};Ey.tickFormat=function(Ez){return Cw(Ey.domain(),Ez)};Ey.nice=function(){return Ey.domain(Dk(Ey.domain(),AM))};Ey.exponent=function(Ez){if(!arguments.length){return Ew}var E0=Ey.domain();Ev=DU(Ew=Ez);Ex=DU(1/Ew);return Ey.domain(E0)};Ey.copy=function(){return Dp(e.copy(),Ew)};return Dc(Ey,e)}function DU(Ev){return function(e){return e<0?-Math.pow(-e,Ev):Math.pow(e,Ev)}}d3.scale.sqrt=function(){return d3.scale.pow().exponent(0.5)};d3.scale.ordinal=function(){return BF([],{t:"range",x:[]})};function BF(Ez,Ew){var Ey,Ev,Ex;function E0(E1){return Ev[((Ey.get(E1)||Ey.set(E1,Ez.push(E1)))-1)%Ev.length]}function e(E2,E1){return d3.range(Ez.length).map(function(E3){return E2+E1*E3})}E0.domain=function(E1){if(!arguments.length){return Ez}Ez=[];Ey=new AK;var E3=-1,E4=E1.length,E2;while(++E3<E4){if(!Ey.has(E2=E1[E3])){Ey.set(E2,Ez.push(E2))}}return E0[Ew.t](Ew.x,Ew.p)};E0.range=function(E1){if(!arguments.length){return Ev}Ev=E1;Ex=0;Ew={t:"range",x:E1};return E0};E0.rangePoints=function(E1,E4){if(arguments.length<2){E4=0}var E5=E1[0],E2=E1[1],E3=(E2-E5)/(Ez.length-1+E4);Ev=e(Ez.length<2?(E5+E2)/2:E5+E3*E4/2,E3);Ex=0;Ew={t:"rangePoints",x:E1,p:E4};return E0};E0.rangeBands=function(E1,E5){if(arguments.length<2){E5=0}var E2=E1[1]<E1[0],E6=E1[E2-0],E3=E1[1-E2],E4=(E3-E6)/(Ez.length+E5);Ev=e(E6+E4*E5,E4);if(E2){Ev.reverse()}Ex=E4*(1-E5);Ew={t:"rangeBands",x:E1,p:E5};return E0};E0.rangeRoundBands=function(E1,E6){if(arguments.length<2){E6=0}var E3=E1[1]<E1[0],E7=E1[E3-0],E4=E1[1-E3],E5=Math.floor((E4-E7)/(Ez.length+E6)),E2=E4-E7-(Ez.length-E6)*E5;Ev=e(E7+Math.round(E2/2),E5);if(E3){Ev.reverse()}Ex=Math.round(E5*(1-E6));Ew={t:"rangeRoundBands",x:E1,p:E6};return E0};E0.rangeBand=function(){return Ex};E0.rangeExtent=function(){return CP(Ew.x)};E0.copy=function(){return BF(Ez,Ew)};return E0.domain(Ez)}d3.scale.category10=function(){return d3.scale.ordinal().range(BM)};d3.scale.category20=function(){return d3.scale.ordinal().range(BA)};d3.scale.category20b=function(){return d3.scale.ordinal().range(EK)};d3.scale.category20c=function(){return d3.scale.ordinal().range(EJ)};var BM=["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"];var BA=["#1f77b4","#aec7e8","#ff7f0e","#ffbb78","#2ca02c","#98df8a","#d62728","#ff9896","#9467bd","#c5b0d5","#8c564b","#c49c94","#e377c2","#f7b6d2","#7f7f7f","#c7c7c7","#bcbd22","#dbdb8d","#17becf","#9edae5"];var EK=["#393b79","#5254a3","#6b6ecf","#9c9ede","#637939","#8ca252","#b5cf6b","#cedb9c","#8c6d31","#bd9e39","#e7ba52","#e7cb94","#843c39","#ad494a","#d6616b","#e7969c","#7b4173","#a55194","#ce6dbd","#de9ed6"];var EJ=["#3182bd","#6baed6","#9ecae1","#c6dbef","#e6550d","#fd8d3c","#fdae6b","#fdd0a2","#31a354","#74c476","#a1d99b","#c7e9c0","#756bb1","#9e9ac8","#bcbddc","#dadaeb","#636363","#969696","#bdbdbd","#d9d9d9"];d3.scale.quantile=function(){return V([],[])};function V(Ew,Ev){var Ex;function e(){var Ez=0,E1=Ew.length,E0=Ev.length;Ex=[];while(++Ez<E0){Ex[Ez-1]=d3.quantile(Ew,Ez/E0)}return Ey}function Ey(Ez){if(isNaN(Ez=+Ez)){return NaN}return Ev[d3.bisect(Ex,Ez)]}Ey.domain=function(Ez){if(!arguments.length){return Ew}Ew=Ez.filter(function(E0){return !isNaN(E0)}).sort(d3.ascending);return e()};Ey.range=function(Ez){if(!arguments.length){return Ev}Ev=Ez;return e()};Ey.quantiles=function(){return Ex};Ey.copy=function(){return V(Ew,Ev)};return e()}d3.scale.quantize=function(){return By(0,1,[0,1])};function By(Ey,Ew,Ev){var Ez,Ex;function E0(E1){return Ev[Math.max(0,Math.min(Ex,Math.floor(Ez*(E1-Ey))))]}function e(){Ez=Ev.length/(Ew-Ey);Ex=Ev.length-1;return E0}E0.domain=function(E1){if(!arguments.length){return[Ey,Ew]}Ey=+E1[0];Ew=+E1[E1.length-1];return e()};E0.range=function(E1){if(!arguments.length){return Ev}Ev=E1;return e()};E0.copy=function(){return By(Ey,Ew,Ev)};return e()}d3.scale.identity=function(){return Cd([0,1])};function Cd(Ev){function e(Ew){return +Ew}e.invert=e;e.domain=e.range=function(Ew){if(!arguments.length){return Ev}Ev=Ew.map(e);return e};e.ticks=function(Ew){return Cm(Ev,Ew)};e.tickFormat=function(Ew){return Cw(Ev,Ew)};e.copy=function(){return Cd(Ev)};return e}d3.svg={};d3.svg.arc=function(){var Ey=An,Ex=BV,Ew=Dh,e=AA;function Ev(){var E2=Ey.apply(this,arguments),E1=Ex.apply(this,arguments),E0=Ew.apply(this,arguments)+Ec,Ez=e.apply(this,arguments)+Ec,E8=(Ez<E0&&(E8=E0,E0=Ez,Ez=E8),Ez-E0),E5=E8<Math.PI?"0":"1",E4=Math.cos(E0),E7=Math.sin(E0),E3=Math.cos(Ez),E6=Math.sin(Ez);return E8>=Eh?(E2?"M0,"+E1+"A"+E1+","+E1+" 0 1,1 0,"+(-E1)+"A"+E1+","+E1+" 0 1,1 0,"+E1+"M0,"+E2+"A"+E2+","+E2+" 0 1,0 0,"+(-E2)+"A"+E2+","+E2+" 0 1,0 0,"+E2+"Z":"M0,"+E1+"A"+E1+","+E1+" 0 1,1 0,"+(-E1)+"A"+E1+","+E1+" 0 1,1 0,"+E1+"Z"):(E2?"M"+E1*E4+","+E1*E7+"A"+E1+","+E1+" 0 "+E5+",1 "+E1*E3+","+E1*E6+"L"+E2*E3+","+E2*E6+"A"+E2+","+E2+" 0 "+E5+",0 "+E2*E4+","+E2*E7+"Z":"M"+E1*E4+","+E1*E7+"A"+E1+","+E1+" 0 "+E5+",1 "+E1*E3+","+E1*E6+"L0,0Z")}Ev.innerRadius=function(Ez){if(!arguments.length){return Ey}Ey=d3.functor(Ez);return Ev};Ev.outerRadius=function(Ez){if(!arguments.length){return Ex}Ex=d3.functor(Ez);return Ev};Ev.startAngle=function(Ez){if(!arguments.length){return Ew}Ew=d3.functor(Ez);return Ev};Ev.endAngle=function(Ez){if(!arguments.length){return e}e=d3.functor(Ez);return Ev};Ev.centroid=function(){var E0=(Ey.apply(this,arguments)+Ex.apply(this,arguments))/2,Ez=(Ew.apply(this,arguments)+e.apply(this,arguments))/2+Ec;return[Math.cos(Ez)*E0,Math.sin(Ez)*E0]};return Ev};var Ec=-Math.PI/2,Eh=2*Math.PI-0.000001;function An(e){return e.innerRadius}function BV(e){return e.outerRadius}function Dh(e){return e.startAngle}function AA(e){return e.endAngle}function Cv(Ev){var e=D9,E0=D8,Ex=CE,Ez=A7.get(Ex),Ey=0.7;function Ew(E1){return E1.length<1?null:"M"+Ez(Ev(AH(this,E1,e,E0)),Ey)}Ew.x=function(E1){if(!arguments.length){return e}e=E1;return Ew};Ew.y=function(E1){if(!arguments.length){return E0}E0=E1;return Ew};Ew.interpolate=function(E1){if(!arguments.length){return Ex}if(!A7.has(E1+="")){E1=CE}Ez=A7.get(Ex=E1);return Ew};Ew.tension=function(E1){if(!arguments.length){return Ey}Ey=E1;return Ew};return Ew}d3.svg.line=function(){return Cv(Object)};function AH(E3,Ey,E0,Ez){var E2=[],Ex=-1,e=Ey.length,Ew=typeof E0==="function",Ev=typeof Ez==="function",E1;if(Ew&&Ev){while(++Ex<e){E2.push([E0.call(E3,E1=Ey[Ex],Ex),Ez.call(E3,E1,Ex)])}}else{if(Ew){while(++Ex<e){E2.push([E0.call(E3,Ey[Ex],Ex),Ez])}}else{if(Ev){while(++Ex<e){E2.push([E0,Ez.call(E3,Ey[Ex],Ex)])}}else{while(++Ex<e){E2.push([E0,Ez])}}}}return E2}function D9(e){return e[0]}function D8(e){return e[1]}var CE="linear";var A7=d3.map({linear:Ek,"step-before":Ah,"step-after":EY,basis:C0,"basis-open":Ae,"basis-closed":BT,bundle:BU,cardinal:B7,"cardinal-open":A4,"cardinal-closed":P,monotone:Bl});function Ek(Ev){var e=0,Ey=Ev.length,Ex=Ev[0],Ew=[Ex[0],",",Ex[1]];while(++e<Ey){Ew.push("L",(Ex=Ev[e])[0],",",Ex[1])}return Ew.join("")}function Ah(Ev){var e=0,Ey=Ev.length,Ex=Ev[0],Ew=[Ex[0],",",Ex[1]];while(++e<Ey){Ew.push("V",(Ex=Ev[e])[1],"H",Ex[0])}return Ew.join("")}function EY(Ev){var e=0,Ey=Ev.length,Ex=Ev[0],Ew=[Ex[0],",",Ex[1]];while(++e<Ey){Ew.push("H",(Ex=Ev[e])[0],"V",Ex[1])}return Ew.join("")}function A4(Ev,e){return Ev.length<4?Ek(Ev):Ev[1]+BZ(Ev.slice(1,Ev.length-1),A0(Ev,e))}function P(Ev,e){return Ev.length<3?Ek(Ev):Ev[0]+BZ((Ev.push(Ev[0]),Ev),A0([Ev[Ev.length-2]].concat(Ev,[Ev[1]]),e))}function B7(Ew,Ev,e){return Ew.length<3?Ek(Ew):Ew[0]+BZ(Ew,A0(Ew,Ev))}function BZ(E0,Ez){if(Ez.length<1||(E0.length!=Ez.length&&E0.length!=Ez.length+2)){return Ek(E0)}var E1=E0.length!=Ez.length,E4="",E2=E0[0],e=E0[1],Ey=Ez[0],E3=Ey,Ew=1;if(E1){E4+="Q"+(e[0]-Ey[0]*2/3)+","+(e[1]-Ey[1]*2/3)+","+e[0]+","+e[1];E2=E0[1];Ew=2}if(Ez.length>1){E3=Ez[1];e=E0[Ew];Ew++;E4+="C"+(E2[0]+Ey[0])+","+(E2[1]+Ey[1])+","+(e[0]-E3[0])+","+(e[1]-E3[1])+","+e[0]+","+e[1];for(var Ev=2;Ev<Ez.length;Ev++,Ew++){e=E0[Ew];E3=Ez[Ev];E4+="S"+(e[0]-E3[0])+","+(e[1]-E3[1])+","+e[0]+","+e[1]}}if(E1){var Ex=E0[Ew];E4+="Q"+(e[0]+E3[0]*2/3)+","+(e[1]+E3[1]*2/3)+","+Ex[0]+","+Ex[1]}return E4}function A0(E0,Ey){var Ew=[],Ex=(1-Ey)/2,E2,E1=E0[0],Ez=E0[1],Ev=1,e=E0.length;while(++Ev<e){E2=E1;E1=Ez;Ez=E0[Ev];Ew.push([Ex*(Ez[0]-E2[0]),Ex*(Ez[1]-E2[1])])}return Ew}function C0(E1){if(E1.length<3){return Ek(E1)}var Ew=1,Ev=E1.length,Ex=E1[0],e=Ex[0],Ez=Ex[1],E0=[e,e,e,(Ex=E1[1])[0]],Ey=[Ez,Ez,Ez,Ex[1]],E2=[e,",",Ez];Au(E2,E0,Ey);while(++Ew<Ev){Ex=E1[Ew];E0.shift();E0.push(Ex[0]);Ey.shift();Ey.push(Ex[1]);Au(E2,E0,Ey)}Ew=-1;while(++Ew<2){E0.shift();E0.push(Ex[0]);Ey.shift();Ey.push(Ex[1]);Au(E2,E0,Ey)}return E2.join("")}function Ae(Ex){if(Ex.length<4){return Ek(Ex)}var Ez=[],Ew=-1,E0=Ex.length,Ey,Ev=[0],e=[0];while(++Ew<3){Ey=Ex[Ew];Ev.push(Ey[0]);e.push(Ey[1])}Ez.push(Dn(EP,Ev)+","+Dn(EP,e));--Ew;while(++Ew<E0){Ey=Ex[Ew];Ev.shift();Ev.push(Ey[0]);e.shift();e.push(Ey[1]);Au(Ez,Ev,e)}return Ez.join("")}function BT(Ey){var E0,Ex=-1,E1=Ey.length,e=E1+4,Ez,Ew=[],Ev=[];while(++Ex<4){Ez=Ey[Ex%E1];Ew.push(Ez[0]);Ev.push(Ez[1])}E0=[Dn(EP,Ew),",",Dn(EP,Ev)];--Ex;while(++Ex<e){Ez=Ey[Ex%E1];Ew.shift();Ew.push(Ez[0]);Ev.shift();Ev.push(Ez[1]);Au(E0,Ew,Ev)}return E0.join("")}function BU(E0,Ez){var Ew=E0.length-1,Ev=E0[0][0],Ey=E0[0][1],E3=E0[Ew][0]-Ev,E2=E0[Ew][1]-Ey,Ex=-1,e,E1;while(++Ex<=Ew){e=E0[Ex];E1=Ex/Ew;e[0]=Ez*e[0]+(1-Ez)*(Ev+E1*E3);e[1]=Ez*e[1]+(1-Ez)*(Ey+E1*E2)}return C0(E0)}function Dn(Ev,e){return Ev[0]*e[0]+Ev[1]*e[1]+Ev[2]*e[2]+Ev[3]*e[3]}var ES=[0,2/3,1/3,0],EQ=[0,1/3,2/3,0],EP=[0,1/6,2/3,1/6];function Au(Ev,e,Ew){Ev.push("C",Dn(ES,e),",",Dn(ES,Ew),",",Dn(EQ,e),",",Dn(EQ,Ew),",",Dn(EP,e),",",Dn(EP,Ew))}function Eq(Ev,e){return(e[1]-Ev[1])/(e[0]-Ev[0])}function CI(Ex){var Ew=0,Ev=Ex.length-1,e=[],E0=Ex[0],Ez=Ex[1],Ey=e[0]=Eq(E0,Ez);while(++Ew<Ev){e[Ew]=Ey+(Ey=Eq(E0=Ez,Ez=Ex[Ew+1]))}e[Ew]=Ey;return e}function AC(E1){var Ey=[],Ex,E0,Ez,E2,e=CI(E1),Ew=-1,Ev=E1.length-1;while(++Ew<Ev){Ex=Eq(E1[Ew],E1[Ew+1]);if(Math.abs(Ex)<0.000001){e[Ew]=e[Ew+1]=0}else{E0=e[Ew]/Ex;Ez=e[Ew+1]/Ex;E2=E0*E0+Ez*Ez;if(E2>9){E2=Ex*3/Math.sqrt(E2);e[Ew]=E2*E0;e[Ew+1]=E2*Ez}}}Ew=-1;while(++Ew<=Ev){E2=(E1[Math.min(Ev,Ew+1)][0]-E1[Math.max(0,Ew-1)][0])/(6*(1+e[Ew]*e[Ew]));Ey.push([E2||0,e[Ew]*E2||0])}return Ey}function Bl(e){return e.length<3?Ek(e):e[0]+BZ(e,AC(e))}d3.svg.line.radial=function(){var e=Cv(h);e.radius=e.x,delete e.x;e.angle=e.y,delete e.y;return e};function h(Ex){var e,Ew=-1,Ez=Ex.length,Ey,Ev;while(++Ew<Ez){e=Ex[Ew];Ey=e[0];Ev=e[1]+Ec;e[0]=Ey*Math.cos(Ev);e[1]=Ey*Math.sin(Ev)}return Ex}function Es(Ez){var Ew=D9,Ev=D9,E3=0,E1=D8,E0,Ey,Ex,E2=0.7;function e(E6){if(E6.length<1){return null}var E5=AH(this,E6,Ew,E3),E4=AH(this,E6,Ew===Ev?Bq(E5):Ev,E3===E1?Bp(E5):E1);return"M"+Ey(Ez(E4),E2)+"L"+Ex(Ez(E5.reverse()),E2)+"Z"}e.x=function(E4){if(!arguments.length){return Ev}Ew=Ev=E4;return e};e.x0=function(E4){if(!arguments.length){return Ew}Ew=E4;return e};e.x1=function(E4){if(!arguments.length){return Ev}Ev=E4;return e};e.y=function(E4){if(!arguments.length){return E1}E3=E1=E4;return e};e.y0=function(E4){if(!arguments.length){return E3}E3=E4;return e};e.y1=function(E4){if(!arguments.length){return E1}E1=E4;return e};e.interpolate=function(E4){if(!arguments.length){return E0}if(!A7.has(E4+="")){E4=CE}Ey=A7.get(E0=E4);Ex=Ey.reverse||Ey;return e};e.tension=function(E4){if(!arguments.length){return E2}E2=E4;return e};return e.interpolate("linear")}Ah.reverse=EY;EY.reverse=Ah;d3.svg.area=function(){return Es(Object)};function Bq(e){return function(Ew,Ev){return e[Ev][0]}}function Bp(e){return function(Ew,Ev){return e[Ev][1]}}d3.svg.area.radial=function(){var e=Es(h);e.radius=e.x,delete e.x;e.innerRadius=e.x0,delete e.x0;e.outerRadius=e.x1,delete e.x1;e.angle=e.y,delete e.y;e.startAngle=e.y0,delete e.y0;e.endAngle=e.y1,delete e.y1;return e};d3.svg.chord=function(){var e=AB,E1=AL,E0=X,E2=Dh,Ey=AA;function Ez(E7,E5){var E6=E3(this,e,E7,E5),E4=E3(this,E1,E7,E5);return"M"+E6.p0+Ev(E6.r,E6.p1,E6.a1-E6.a0)+(Ew(E6,E4)?Ex(E6.r,E6.p1,E6.r,E6.p0):Ex(E6.r,E6.p1,E4.r,E4.p0)+Ev(E4.r,E4.p1,E4.a1-E4.a0)+Ex(E4.r,E4.p1,E6.r,E6.p0))+"Z"}function E3(E7,FA,FB,E8){var E6=FA.call(E7,FB,E8),E9=E0.call(E7,E6,E8),E5=E2.call(E7,E6,E8)+Ec,E4=Ey.call(E7,E6,E8)+Ec;return{r:E9,a0:E5,a1:E4,p0:[E9*Math.cos(E5),E9*Math.sin(E5)],p1:[E9*Math.cos(E4),E9*Math.sin(E4)]}}function Ew(E5,E4){return E5.a0==E4.a0&&E5.a1==E4.a1}function Ev(E5,E6,E4){return"A"+E5+","+E5+" 0 "+ +(E4>Math.PI)+",1 "+E6}function Ex(E5,E7,E4,E6){return"Q 0,0 "+E6}Ez.radius=function(E4){if(!arguments.length){return E0}E0=d3.functor(E4);return Ez};Ez.source=function(E4){if(!arguments.length){return e}e=d3.functor(E4);return Ez};Ez.target=function(E4){if(!arguments.length){return E1}E1=d3.functor(E4);return Ez};Ez.startAngle=function(E4){if(!arguments.length){return E2}E2=d3.functor(E4);return Ez};Ez.endAngle=function(E4){if(!arguments.length){return Ey}Ey=d3.functor(E4);return Ez};return Ez};function AB(e){return e.source}function AL(e){return e.target}function X(e){return e.radius}function Dx(e){return e.startAngle}function CQ(e){return e.endAngle}d3.svg.diagonal=function(){var Ew=AB,Ex=AL,e=L;function Ev(E2,Ez){var E3=Ew.call(this,E2,Ez),E0=Ex.call(this,E2,Ez),Ey=(E3.y+E0.y)/2,E1=[E3,{x:E3.x,y:Ey},{x:E0.x,y:Ey},E0];E1=E1.map(e);return"M"+E1[0]+"C"+E1[1]+" "+E1[2]+" "+E1[3]}Ev.source=function(Ey){if(!arguments.length){return Ew}Ew=d3.functor(Ey);return Ev};Ev.target=function(Ey){if(!arguments.length){return Ex}Ex=d3.functor(Ey);return Ev};Ev.projection=function(Ey){if(!arguments.length){return e}e=Ey;return Ev};return Ev};function L(e){return[e.x,e.y]}d3.svg.diagonal.radial=function(){var Ew=d3.svg.diagonal(),e=L,Ev=Ew.projection;Ew.projection=function(Ex){return arguments.length?Ev(M(e=Ex)):e};return Ew};function M(e){return function(){var Ex=e.apply(this,arguments),Ew=Ex[0],Ev=Ex[1]+Ec;return[Ew*Math.cos(Ev),Ew*Math.sin(Ev)]}}d3.svg.mouse=d3.mouse;d3.svg.touches=d3.touches;d3.svg.symbol=function(){var Ev=AQ,e=Cr;function Ew(Ey,Ex){return(Ei.get(Ev.call(this,Ey,Ex))||A8)(e.call(this,Ey,Ex))}Ew.type=function(Ex){if(!arguments.length){return Ev}Ev=d3.functor(Ex);return Ew};Ew.size=function(Ex){if(!arguments.length){return e}e=d3.functor(Ex);return Ew};return Ew};function Cr(){return 64}function AQ(){return"circle"}function A8(e){var Ev=Math.sqrt(e/Math.PI);return"M0,"+Ev+"A"+Ev+","+Ev+" 0 1,1 0,"+(-Ev)+"A"+Ev+","+Ev+" 0 1,1 0,"+Ev+"Z"}var Ei=d3.map({circle:A8,cross:function(e){var Ev=Math.sqrt(e/5)/2;return"M"+-3*Ev+","+-Ev+"H"+-Ev+"V"+-3*Ev+"H"+Ev+"V"+-Ev+"H"+3*Ev+"V"+Ev+"H"+Ev+"V"+3*Ev+"H"+-Ev+"V"+Ev+"H"+-3*Ev+"Z"},diamond:function(e){var Ev=Math.sqrt(e/(2*BC)),Ew=Ev*BC;return"M0,"+-Ev+"L"+Ew+",0 0,"+Ev+" "+-Ew+",0Z"},square:function(e){var Ev=Math.sqrt(e)/2;return"M"+-Ev+","+-Ev+"L"+Ev+","+-Ev+" "+Ev+","+Ev+" "+-Ev+","+Ev+"Z"},"triangle-down":function(e){var Ew=Math.sqrt(e/A5),Ev=Ew*A5/2;return"M0,"+Ev+"L"+Ew+","+-Ev+" "+-Ew+","+-Ev+"Z"},"triangle-up":function(e){var Ew=Math.sqrt(e/A5),Ev=Ew*A5/2;return"M0,"+-Ev+"L"+Ew+","+Ev+" "+-Ew+","+Ev+"Z"}});d3.svg.symbolTypes=Ei.keys();var A5=Math.sqrt(3),BC=Math.tan(30*Math.PI/180);d3.svg.axis=function(){var Ex=d3.scale.linear(),E0="bottom",Ey=6,e=6,Ev=6,E4=3,E3=[10],Ez=null,E2,E1=0;function Ew(E5){E5.each(function(){var FO=d3.select(this);var FP=Ez==null?(Ex.ticks?Ex.ticks.apply(Ex,E3):Ex.domain()):Ez,FI=E2==null?(Ex.tickFormat?Ex.tickFormat.apply(Ex,E3):String):E2;var FA=BW(Ex,FP,E1),E9=FO.selectAll(".minor").data(FA,String),FL=E9.enter().insert("line","g").attr("class","tick minor").style("opacity",0.000001),FJ=d3.transition(E9.exit()).style("opacity",0.000001).remove(),E7=d3.transition(E9).style("opacity",1);var FN=FO.selectAll("g").data(FP,String),FF=FN.enter().insert("g","path").style("opacity",0.000001),FH=d3.transition(FN.exit()).style("opacity",0.000001).remove(),FB=d3.transition(FN).style("opacity",1),E6;var FE=AT(Ex),FG=FO.selectAll(".domain").data([0]),E8=FG.enter().append("path").attr("class","domain"),FQ=d3.transition(FG);var FK=Ex.copy(),FM=this.__chart__||FK;this.__chart__=FK;FF.append("line").attr("class","tick");FF.append("text");FB.select("text").text(FI);switch(E0){case"bottom":E6=C7;FL.attr("y2",e);E7.attr("x2",0).attr("y2",e);FF.select("line").attr("y2",Ey);FF.select("text").attr("y",Math.max(Ey,0)+E4);FB.select("line").attr("x2",0).attr("y2",Ey);FB.select("text").attr("x",0).attr("y",Math.max(Ey,0)+E4).attr("dy",".71em").attr("text-anchor","middle");FQ.attr("d","M"+FE[0]+","+Ev+"V0H"+FE[1]+"V"+Ev);break;case"top":E6=C7;FL.attr("y2",-e);E7.attr("x2",0).attr("y2",-e);FF.select("line").attr("y2",-Ey);FF.select("text").attr("y",-(Math.max(Ey,0)+E4));FB.select("line").attr("x2",0).attr("y2",-Ey);FB.select("text").attr("x",0).attr("y",-(Math.max(Ey,0)+E4)).attr("dy","0em").attr("text-anchor","middle");FQ.attr("d","M"+FE[0]+","+-Ev+"V0H"+FE[1]+"V"+-Ev);break;case"left":E6=C5;FL.attr("x2",-e);E7.attr("x2",-e).attr("y2",0);FF.select("line").attr("x2",-Ey);FF.select("text").attr("x",-(Math.max(Ey,0)+E4));FB.select("line").attr("x2",-Ey).attr("y2",0);FB.select("text").attr("x",-(Math.max(Ey,0)+E4)).attr("y",0).attr("dy",".32em").attr("text-anchor","end");FQ.attr("d","M"+-Ev+","+FE[0]+"H0V"+FE[1]+"H"+-Ev);break;case"right":E6=C5;FL.attr("x2",e);E7.attr("x2",e).attr("y2",0);FF.select("line").attr("x2",Ey);FF.select("text").attr("x",Math.max(Ey,0)+E4);FB.select("line").attr("x2",Ey).attr("y2",0);FB.select("text").attr("x",Math.max(Ey,0)+E4).attr("y",0).attr("dy",".32em").attr("text-anchor","start");FQ.attr("d","M"+Ev+","+FE[0]+"H0V"+FE[1]+"H"+Ev);break}if(Ex.ticks){FF.call(E6,FM);FB.call(E6,FK);FH.call(E6,FK);FL.call(E6,FM);E7.call(E6,FK);FJ.call(E6,FK)}else{var FD=FK.rangeBand()/2,FC=function(FR){return FK(FR)+FD};FF.call(E6,FC);FB.call(E6,FC)}})}Ew.scale=function(E5){if(!arguments.length){return Ex}Ex=E5;return Ew};Ew.orient=function(E5){if(!arguments.length){return E0}E0=E5;return Ew};Ew.ticks=function(){if(!arguments.length){return E3}E3=arguments;return Ew};Ew.tickValues=function(E5){if(!arguments.length){return Ez}Ez=E5;return Ew};Ew.tickFormat=function(E5){if(!arguments.length){return E2}E2=E5;return Ew};Ew.tickSize=function(E5,E8,E6){if(!arguments.length){return Ey}var E7=arguments.length-1;Ey=+E5;e=E7>1?+E8:Ey;Ev=E7>0?+arguments[E7]:Ey;return Ew};Ew.tickPadding=function(E5){if(!arguments.length){return E4}E4=+E5;return Ew};Ew.tickSubdivide=function(E5){if(!arguments.length){return E1}E1=+E5;return Ew};return Ew};function C7(Ev,e){Ev.attr("transform",function(Ew){return"translate("+e(Ew)+",0)"})}function C5(e,Ev){e.attr("transform",function(Ew){return"translate(0,"+Ev(Ew)+")"})}function BW(Ew,E0,Ev){E1=[];if(Ev&&E0.length>1){var E3=CP(Ew.domain()),E1,Ey=-1,e=E0.length,Ez=(E0[1]-E0[0])/++Ev,Ex,E2;while(++Ey<e){for(Ex=Ev;--Ex>0;){if((E2=+E0[Ey]-Ex*Ez)>=E3[0]){E1.push(E2)}}}for(--Ey,Ex=0;++Ex<Ev&&(E2=+E0[Ey]+Ex*Ez)<E3[1];){E1.push(E2)}}return E1}d3.svg.brush=function(){var e=EN(Ey,"brushstart","brush","brushend"),E0=null,Ez=null,E1=AD[0],E4=[[0,0],[0,0]],Ev;function Ey(E5){E5.each(function(){var E8=d3.select(this),E7=E8.selectAll(".background").data([0]),E6=E8.selectAll(".extent").data([0]),FA=E8.selectAll(".resize").data(E1,String),E9;E8.style("pointer-events","all").on("mousedown.brush",E2).on("touchstart.brush",E2);E7.enter().append("rect").attr("class","background").style("visibility","hidden").style("cursor","crosshair");E6.enter().append("rect").attr("class","extent").style("cursor","move");FA.enter().append("g").attr("class",function(FB){return"resize "+FB}).style("cursor",function(FB){return Cf[FB]}).append("rect").attr("x",function(FB){return/[ew]$/.test(FB)?-3:null}).attr("y",function(FB){return/^[ns]/.test(FB)?-3:null}).attr("width",6).attr("height",6).style("visibility","hidden");FA.style("display",Ey.empty()?"none":null);FA.exit().remove();if(E0){E9=AT(E0);E7.attr("x",E9[0]).attr("width",E9[1]-E9[0]);Ex(E8)}if(Ez){E9=AT(Ez);E7.attr("y",E9[0]).attr("height",E9[1]-E9[0]);Ew(E8)}E3(E8)})}function E3(E5){E5.selectAll(".resize").attr("transform",function(E6){return"translate("+E4[+/e$/.test(E6)][0]+","+E4[+/^s/.test(E6)][1]+")"})}function Ex(E5){E5.select(".extent").attr("x",E4[0][0]);E5.selectAll(".extent,.n>rect,.s>rect").attr("width",E4[1][0]-E4[0][0])}function Ew(E5){E5.select(".extent").attr("y",E4[0][1]);E5.selectAll(".extent,.e>rect,.w>rect").attr("height",E4[1][1]-E4[0][1])}function E2(){var FO=this,E6=d3.select(d3.event.target),FC=e.of(FO,arguments),FJ=d3.select(FO),FL=E6.datum(),FH=!/^(n|s)$/.test(FL)&&E0,FF=!/^(e|w)$/.test(FL)&&Ez,FG=E6.classed("extent"),FM,FN=FD(),E7;var FA=d3.select(window).on("mousemove.brush",FB).on("mouseup.brush",E5).on("touchmove.brush",FB).on("touchend.brush",E5).on("keydown.brush",FE).on("keyup.brush",E9);if(FG){FN[0]=E4[0][0]-FN[0];FN[1]=E4[0][1]-FN[1]}else{if(FL){var FK=+/w$/.test(FL),FI=+/^n/.test(FL);E7=[E4[1-FK][0]-FN[0],E4[1-FI][1]-FN[1]];FN[0]=E4[FK][0];FN[1]=E4[FI][1]}else{if(d3.event.altKey){FM=FN.slice()}}}FJ.style("pointer-events","none").selectAll(".resize").style("display",null);d3.select("body").style("cursor",E6.style("cursor"));FC({type:"brushstart"});FB();Ee();function FD(){var FP=d3.event.changedTouches;return FP?d3.touches(FO,FP)[0]:d3.mouse(FO)}function FE(){if(d3.event.keyCode==32){if(!FG){FM=null;FN[0]-=E4[1][0];FN[1]-=E4[1][1];FG=2}Ee()}}function E9(){if(d3.event.keyCode==32&&FG==2){FN[0]+=E4[1][0];FN[1]+=E4[1][1];FG=0;Ee()}}function FB(){var FP=FD(),FQ=false;if(E7){FP[0]+=E7[0];FP[1]+=E7[1]}if(!FG){if(d3.event.altKey){if(!FM){FM=[(E4[0][0]+E4[1][0])/2,(E4[0][1]+E4[1][1])/2]}FN[0]=E4[+(FP[0]<FM[0])][0];FN[1]=E4[+(FP[1]<FM[1])][1]}else{FM=null}}if(FH&&E8(FP,E0,0)){Ex(FJ);FQ=true}if(FF&&E8(FP,Ez,1)){Ew(FJ);FQ=true}if(FQ){E3(FJ);FC({type:"brush",mode:FG?"move":"resize"})}}function E8(FX,FR,FT){var FU=AT(FR),FQ=FU[0],FP=FU[1],FV=FN[FT],FY=E4[1][FT]-E4[0][FT],FS,FW;if(FG){FQ-=FV;FP-=FY+FV}FS=Math.max(FQ,Math.min(FP,FX[FT]));if(FG){FW=(FS+=FV)+FY}else{if(FM){FV=Math.max(FQ,Math.min(FP,2*FM[FT]-FS))}if(FV<FS){FW=FS;FS=FV}else{FW=FV}}if(E4[0][FT]!==FS||E4[1][FT]!==FW){Ev=null;E4[0][FT]=FS;E4[1][FT]=FW;return true}}function E5(){FB();FJ.style("pointer-events","all").selectAll(".resize").style("display",Ey.empty()?"none":null);d3.select("body").style("cursor",null);FA.on("mousemove.brush",null).on("mouseup.brush",null).on("touchmove.brush",null).on("touchend.brush",null).on("keydown.brush",null).on("keyup.brush",null);FC({type:"brushend"});Ee()}}Ey.x=function(E5){if(!arguments.length){return E0}E0=E5;E1=AD[!E0<<1|!Ez];return Ey};Ey.y=function(E5){if(!arguments.length){return Ez}Ez=E5;E1=AD[!E0<<1|!Ez];return Ey};Ey.extent=function(FA){var E7,E5,E9,E8,E6;if(!arguments.length){FA=Ev||E4;if(E0){E7=FA[0][0],E5=FA[1][0];if(!Ev){E7=E4[0][0],E5=E4[1][0];if(E0.invert){E7=E0.invert(E7),E5=E0.invert(E5)}if(E5<E7){E6=E7,E7=E5,E5=E6}}}if(Ez){E9=FA[0][1],E8=FA[1][1];if(!Ev){E9=E4[0][1],E8=E4[1][1];if(Ez.invert){E9=Ez.invert(E9),E8=Ez.invert(E8)}if(E8<E9){E6=E9,E9=E8,E8=E6}}}return E0&&Ez?[[E7,E9],[E5,E8]]:E0?[E7,E5]:Ez&&[E9,E8]}Ev=[[0,0],[0,0]];if(E0){E7=FA[0],E5=FA[1];if(Ez){E7=E7[0],E5=E5[0]}Ev[0][0]=E7,Ev[1][0]=E5;if(E0.invert){E7=E0(E7),E5=E0(E5)}if(E5<E7){E6=E7,E7=E5,E5=E6}E4[0][0]=E7|0,E4[1][0]=E5|0}if(Ez){E9=FA[0],E8=FA[1];if(E0){E9=E9[1],E8=E8[1]}Ev[0][1]=E9,Ev[1][1]=E8;if(Ez.invert){E9=Ez(E9),E8=Ez(E8)}if(E8<E9){E6=E9,E9=E8,E8=E6}E4[0][1]=E9|0,E4[1][1]=E8|0}return Ey};Ey.clear=function(){Ev=null;E4[0][0]=E4[0][1]=E4[1][0]=E4[1][1]=0;return Ey};Ey.empty=function(){return(E0&&E4[0][0]===E4[1][0])||(Ez&&E4[0][1]===E4[1][1])};return d3.rebind(Ey,e,"on")};var Cf={n:"ns-resize",e:"ew-resize",s:"ns-resize",w:"ew-resize",nw:"nwse-resize",ne:"nesw-resize",se:"nwse-resize",sw:"nesw-resize"};var AD=[["n","e","s","w","nw","ne","se","sw"],["e","w"],["n","s"],[]];d3.behavior={};d3.behavior.drag=function(){var Ex=EN(Ew,"drag","dragstart","dragend"),e=null;function Ew(){this.on("mousedown.drag",Ev).on("touchstart.drag",Ev)}function Ev(){var E0=this,E4=Ex.of(E0,arguments),E3=d3.event.target,Ez,E1=E6(),E2=0;var E5=d3.select(window).on("mousemove.drag",E7).on("touchmove.drag",E7).on("mouseup.drag",Ey,true).on("touchend.drag",Ey,true);if(e){Ez=e.apply(E0,arguments);Ez=[Ez.x-E1[0],Ez.y-E1[1]]}else{Ez=[0,0]}E4({type:"dragstart"});function E6(){var FA=E0.parentNode,E9=d3.event.changedTouches;return E9?d3.touches(FA,E9)[0]:d3.mouse(FA)}function E7(){if(!E0.parentNode){return Ey()}var FB=E6(),FA=FB[0]-E1[0],E9=FB[1]-E1[1];E2|=FA|E9;E1=FB;Ee();E4({type:"drag",x:FB[0]+Ez[0],y:FB[1]+Ez[1],dx:FA,dy:E9})}function Ey(){E4({type:"dragend"});if(E2){Ee();if(d3.event.target===E3){E5.on("click.drag",E8,true)}}E5.on("mousemove.drag",null).on("touchmove.drag",null).on("mouseup.drag",null).on("touchend.drag",null)}function E8(){Ee();E5.on("click.drag",null)}}Ew.origin=function(Ey){if(!arguments.length){return e}e=Ey;return Ew};return d3.rebind(Ew,Ex,"on")};d3.behavior.zoom=function(){var E1=[0,0],FC,FG=1,E8,Ew=DV,E7=EN(e,"zoom"),FB,E9,Ey,Ex,E0;function e(){this.on("mousedown.zoom",E5).on("mousewheel.zoom",E4).on("mousemove.zoom",FD).on("DOMMouseScroll.zoom",E4).on("dblclick.zoom",E2).on("touchstart.zoom",FA).on("touchmove.zoom",E3).on("touchend.zoom",FA)}e.translate=function(FH){if(!arguments.length){return E1}E1=FH.map(Number);return e};e.scale=function(FH){if(!arguments.length){return FG}FG=+FH;return e};e.scaleExtent=function(FH){if(!arguments.length){return Ew}Ew=FH==null?DV:FH.map(Number);return e};e.x=function(FH){if(!arguments.length){return E9}E9=FH;FB=FH.copy();return e};e.y=function(FH){if(!arguments.length){return Ex}Ex=FH;Ey=FH.copy();return e};function Ev(FH){return[(FH[0]-E1[0])/FG,(FH[1]-E1[1])/FG]}function E6(FH){return[FH[0]*FG+E1[0],FH[1]*FG+E1[1]]}function Ez(FH){FG=Math.max(Ew[0],Math.min(Ew[1],FH))}function FE(FI,FH){FH=E6(FH);E1[0]+=FI[0]-FH[0];E1[1]+=FI[1]-FH[1]}function FF(FH){if(E9){E9.domain(FB.range().map(function(FI){return(FI-E1[0])/FG}).map(FB.invert))}if(Ex){Ex.domain(Ey.range().map(function(FI){return(FI-E1[1])/FG}).map(Ey.invert))}d3.event.preventDefault();FH({type:"zoom",scale:FG,translate:E1})}function E5(){var FK=this,FN=E7.of(FK,arguments),FM=d3.event.target,FL=0,FO=d3.select(window).on("mousemove.zoom",FJ).on("mouseup.zoom",FI),FH=Ev(d3.mouse(FK));window.focus();Ee();function FJ(){FL=1;FE(d3.mouse(FK),FH);FF(FN)}function FI(){if(FL){Ee()}FO.on("mousemove.zoom",null).on("mouseup.zoom",null);if(FL&&d3.event.target===FM){FO.on("click.zoom",FP)}}function FP(){Ee();FO.on("click.zoom",null)}}function E4(){if(!FC){FC=Ev(d3.mouse(this))}Ez(Math.pow(2,BJ()*0.002)*FG);FE(d3.mouse(this),FC);FF(E7.of(this,arguments))}function FD(){FC=null}function E2(){var FI=d3.mouse(this),FH=Ev(FI);Ez(d3.event.shiftKey?FG/2:FG*2);FE(FI,FH);FF(E7.of(this,arguments))}function FA(){var FK=d3.touches(this),FI=Date.now();E8=FG;FC={};FK.forEach(function(FL){FC[FL.identifier]=Ev(FL)});Ee();if((FK.length===1)&&(FI-E0<500)){var FJ=FK[0],FH=Ev(FK[0]);Ez(FG*2);FE(FJ,FH);FF(E7.of(this,arguments))}E0=FI}function E3(){var FJ=d3.touches(this),FL=FJ[0],FI=FC[FL.identifier];if(FK=FJ[1]){var FK,FH=FC[FK.identifier];FL=[(FL[0]+FK[0])/2,(FL[1]+FK[1])/2];FI=[(FI[0]+FH[0])/2,(FI[1]+FH[1])/2];Ez(d3.event.scale*E8)}FE(FL,FI);FF(E7.of(this,arguments))}return d3.rebind(e,E7,"on")};var CD,DV=[0,Infinity];function BJ(){if(!CD){CD=d3.select("body").append("div").style("visibility","hidden").style("top",0).style("height",0).style("width",0).style("overflow-y","scroll").append("div").style("height","2000px").node().parentNode}var Ew=d3.event,Ex;try{CD.scrollTop=1000;CD.dispatchEvent(Ew);Ex=1000-CD.scrollTop}catch(Ev){Ex=Ew.wheelDelta||(-Ew.detail*5)}return Ex}d3.layout={};d3.layout.bundle=function(){return function(e){var Ew=[],Ev=-1,Ex=e.length;while(++Ev<Ex){Ew.push(CZ(e[Ev]))}return Ew}};function CZ(Ex){var Ez=Ex.source,e=Ex.target,Ey=DQ(Ez,e),Ew=[Ez];while(Ez!==Ey){Ez=Ez.parent;Ew.push(Ez)}var Ev=Ew.length;while(e!==Ey){Ew.splice(Ev,0,e);e=e.parent}return Ew}function C9(Ew){var Ev=[],e=Ew.parent;while(e!=null){Ev.push(Ew);Ew=e;e=e.parent}Ev.push(Ew);return Ev}function DQ(Ex,Ev){if(Ex===Ev){return Ex}var Ew=C9(Ex),e=C9(Ev),Ey=Ew.pop(),Ez=e.pop(),E0=null;while(Ey===Ez){E0=Ey;Ey=Ew.pop();Ez=e.pop()}return E0}d3.layout.chord=function(){var Ez={},E0,Ex,E4,Ew,E3=0,e,Ev,Ey;function E2(){var E9={},FC=[],FK=d3.range(Ew),FG=[],FA,FI,E8,FD,FB;E0=[];Ex=[];FA=0,FD=-1;while(++FD<Ew){FI=0,FB=-1;while(++FB<Ew){FI+=E4[FD][FB]}FC.push(FI);FG.push(d3.range(Ew));FA+=FI}if(e){FK.sort(function(FM,FL){return e(FC[FM],FC[FL])})}if(Ev){FG.forEach(function(FM,FL){FM.sort(function(FO,FN){return Ev(E4[FL][FO],E4[FL][FN])})})}FA=(2*Math.PI-E3*Ew)/FA;FI=0,FD=-1;while(++FD<Ew){E8=FI,FB=-1;while(++FB<Ew){var FH=FK[FD],FF=FG[FH][FB],FJ=E4[FH][FF],E7=FI,E6=FI+=FJ*FA;E9[FH+"-"+FF]={index:FH,subindex:FF,startAngle:E7,endAngle:E6,value:FJ}}Ex.push({index:FH,startAngle:E8,endAngle:FI,value:(FI-E8)/FA});FI+=E3}FD=-1;while(++FD<Ew){FB=FD-1;while(++FB<Ew){var E5=E9[FD+"-"+FB],FE=E9[FB+"-"+FD];if(E5.value||FE.value){E0.push(E5.value<FE.value?{source:FE,target:E5}:{source:E5,target:FE})}}}if(Ey){E1()}}function E1(){E0.sort(function(E6,E5){return Ey((E6.source.value+E6.target.value)/2,(E5.source.value+E5.target.value)/2)})}Ez.matrix=function(E5){if(!arguments.length){return E4}Ew=(E4=E5)&&E4.length;E0=Ex=null;return Ez};Ez.padding=function(E5){if(!arguments.length){return E3}E3=E5;E0=Ex=null;return Ez};Ez.sortGroups=function(E5){if(!arguments.length){return e}e=E5;E0=Ex=null;return Ez};Ez.sortSubgroups=function(E5){if(!arguments.length){return Ev}Ev=E5;E0=null;return Ez};Ez.sortChords=function(E5){if(!arguments.length){return Ey}Ey=E5;if(E0){E1()}return Ez};Ez.chords=function(){if(!E0){E2()}return E0};Ez.groups=function(){if(!Ex){E2()}return Ex};return Ez};d3.layout.force=function(){var Ev={},E8=d3.dispatch("start","tick","end"),E4=[1,1],FA,Ey,E1=0.9,FC=DR,Ex=BG,E7=-30,Ez=0.1,E2=0.8,FB,E6=[],Ew=[],E0,e,E3;function E9(FD){return function(FK,FF,FJ,FE,FI){if(FK.point!==FD){var FM=FK.cx-FD.x,FL=FK.cy-FD.y,FH=1/Math.sqrt(FM*FM+FL*FL);if((FE-FF)*FH<E2){var FG=FK.charge*FH*FH;FD.px-=FM*FG;FD.py-=FL*FG;return true}if(FK.point&&isFinite(FH)){var FG=FK.pointCharge*FH*FH;FD.px-=FM*FG;FD.py-=FL*FG}}return !FK.charge}}Ev.tick=function(){if((Ey*=0.99)<0.005){E8.end({type:"end",alpha:Ey=0});return true}var FF=E6.length,FG=Ew.length,FD,FJ,FE,FN,FM,FH,FI,FL,FK;for(FJ=0;FJ<FG;++FJ){FE=Ew[FJ];FN=FE.source;FM=FE.target;FL=FM.x-FN.x;FK=FM.y-FN.y;if(FH=(FL*FL+FK*FK)){FH=Ey*e[FJ]*((FH=Math.sqrt(FH))-E0[FJ])/FH;FL*=FH;FK*=FH;FM.x-=FL*(FI=FN.weight/(FM.weight+FN.weight));FM.y-=FK*FI;FN.x+=FL*(FI=1-FI);FN.y+=FK*FI}}if(FI=Ey*Ez){FL=E4[0]/2;FK=E4[1]/2;FJ=-1;if(FI){while(++FJ<FF){FE=E6[FJ];FE.x+=(FL-FE.x)*FI;FE.y+=(FK-FE.y)*FI}}}if(E7){Dv(FD=d3.geom.quadtree(E6),Ey,E3);FJ=-1;while(++FJ<FF){if(!(FE=E6[FJ]).fixed){FD.visit(E9(FE))}}}FJ=-1;while(++FJ<FF){FE=E6[FJ];if(FE.fixed){FE.x=FE.px;FE.y=FE.py}else{FE.x-=(FE.px-(FE.px=FE.x))*E1;FE.y-=(FE.py-(FE.py=FE.y))*E1}}E8.tick({type:"tick",alpha:Ey})};Ev.nodes=function(FD){if(!arguments.length){return E6}E6=FD;return Ev};Ev.links=function(FD){if(!arguments.length){return Ew}Ew=FD;return Ev};Ev.size=function(FD){if(!arguments.length){return E4}E4=FD;return Ev};Ev.linkDistance=function(FD){if(!arguments.length){return FC}FC=d3.functor(FD);return Ev};Ev.distance=Ev.linkDistance;Ev.linkStrength=function(FD){if(!arguments.length){return Ex}Ex=d3.functor(FD);return Ev};Ev.friction=function(FD){if(!arguments.length){return E1}E1=FD;return Ev};Ev.charge=function(FD){if(!arguments.length){return E7}E7=typeof FD==="function"?FD:+FD;return Ev};Ev.gravity=function(FD){if(!arguments.length){return Ez}Ez=FD;return Ev};Ev.theta=function(FD){if(!arguments.length){return E2}E2=FD;return Ev};Ev.alpha=function(FD){if(!arguments.length){return Ey}if(Ey){if(FD>0){Ey=FD}else{Ey=0}}else{if(FD>0){E8.start({type:"start",alpha:Ey=FD});d3.timer(Ev.tick)}}return Ev};Ev.start=function(){var FH,FG,FE=E6.length,FF=Ew.length,FK=E4[0],FJ=E4[1],FM,FD;for(FH=0;FH<FE;++FH){(FD=E6[FH]).index=FH;FD.weight=0}E0=[];e=[];for(FH=0;FH<FF;++FH){FD=Ew[FH];if(typeof FD.source=="number"){FD.source=E6[FD.source]}if(typeof FD.target=="number"){FD.target=E6[FD.target]}E0[FH]=FC.call(this,FD,FH);e[FH]=Ex.call(this,FD,FH);++FD.source.weight;++FD.target.weight}for(FH=0;FH<FE;++FH){FD=E6[FH];if(isNaN(FD.x)){FD.x=FI("x",FK)}if(isNaN(FD.y)){FD.y=FI("y",FJ)}if(isNaN(FD.px)){FD.px=FD.x}if(isNaN(FD.py)){FD.py=FD.y}}E3=[];if(typeof E7==="function"){for(FH=0;FH<FE;++FH){E3[FH]=+E7.call(this,E6[FH],FH)}}else{for(FH=0;FH<FE;++FH){E3[FH]=E7}}function FI(FS,FR){var FQ=FL(FH),FP=-1,FO=FQ.length,FN;while(++FP<FO){if(!isNaN(FN=FQ[FP][FS])){return FN}}return Math.random()*FR}function FL(){if(!FM){FM=[];for(FG=0;FG<FE;++FG){FM[FG]=[]}for(FG=0;FG<FF;++FG){var FN=Ew[FG];FM[FN.source.index].push(FN.target);FM[FN.target.index].push(FN.source)}}return FM[FH]}return Ev.resume()};Ev.resume=function(){return Ev.alpha(0.1)};Ev.stop=function(){return Ev.alpha(0)};Ev.drag=function(){if(!FA){FA=d3.behavior.drag().origin(Object).on("dragstart",E5).on("drag",DE).on("dragend",Ck)}this.on("mouseover.force",J).on("mouseout.force",Du).call(FA)};function E5(FD){J(DK=FD);C6=Ev}return d3.rebind(Ev,E8,"on")};var C6,DK;function J(e){e.fixed|=2}function Du(e){if(e!==DK){e.fixed&=1}}function Ck(){DK.fixed&=1;C6=DK=null}function DE(){DK.px=d3.event.x;DK.py=d3.event.y;C6.resume()}function Dv(E3,Ey,E2){var Ez=0,Ew=0;E3.charge=0;if(!E3.leaf){var e=E3.nodes,Ev=e.length,E0=-1,E1;while(++E0<Ev){E1=e[E0];if(E1==null){continue}Dv(E1,Ey,E2);E3.charge+=E1.charge;Ez+=E1.charge*E1.cx;Ew+=E1.charge*E1.cy}}if(E3.point){if(!E3.leaf){E3.point.x+=Math.random()-0.5;E3.point.y+=Math.random()-0.5}var Ex=Ey*E2[E3.point.index];E3.charge+=E3.pointCharge=Ex;Ez+=Ex*E3.point.x;Ew+=Ex*E3.point.y}E3.cx=Ez/E3.charge;E3.cy=Ew/E3.charge}function DR(e){return 20}function BG(e){return 1}d3.layout.partition=function(){var Ew=d3.layout.hierarchy(),Ex=[1,1];function e(E1,E5,E7,E6){var Ez=E1.children;E1.x=E5;E1.y=E1.depth*E6;E1.dx=E7;E1.dy=E6;if(Ez&&(E0=Ez.length)){var E2=-1,E0,E4,E3;E7=E1.value?E7/E1.value:0;while(++E2<E0){e(E4=Ez[E2],E5,E3=E4.value*E7,E6);E5+=E3}}}function Ey(E1){var E0=E1.children,E2=0;if(E0&&(E3=E0.length)){var Ez=-1,E3;while(++Ez<E3){E2=Math.max(E2,Ey(E0[Ez]))}}return 1+E2}function Ev(E1,E0){var Ez=Ew.call(this,E1,E0);e(Ez[0],0,Ex[0],Ex[1]/Ey(Ez[0]));return Ez}Ev.size=function(Ez){if(!arguments.length){return Ex}Ex=Ez;return Ev};return Dq(Ev,Ew)};d3.layout.pie=function(){var Ey=Number,Ex=n,Ew=0,Ev=2*Math.PI;function e(E5,E3){var E1=E5.map(function(E7,E6){return +Ey.call(e,E7,E6)});var Ez=+(typeof Ew==="function"?Ew.apply(this,arguments):Ew);var E0=((typeof Ev==="function"?Ev.apply(this,arguments):Ev)-Ew)/d3.sum(E1);var E2=d3.range(E5.length);if(Ex!=null){E2.sort(Ex===n?function(E7,E6){return E1[E6]-E1[E7]}:function(E7,E6){return Ex(E5[E7],E5[E6])})}var E4=[];E2.forEach(function(E6){E4[E6]={data:E5[E6],value:d=E1[E6],startAngle:Ez,endAngle:Ez+=d*E0}});return E4}e.value=function(Ez){if(!arguments.length){return Ey}Ey=Ez;return e};e.sort=function(Ez){if(!arguments.length){return Ex}Ex=Ez;return e};e.startAngle=function(Ez){if(!arguments.length){return Ew}Ew=Ez;return e};e.endAngle=function(Ez){if(!arguments.length){return Ev}Ev=Ez;return e};return e};var n={};d3.layout.stack=function(){var Ex=Object,Ew=Av,Ez=DM,Ey=DN,Ev=z,E0=y;function e(E8,FA){var E9=E8.map(function(FD,FC){return Ex.call(e,FD,FC)});var FB=E9.map(function(FD,FC){return FD.map(function(FE,FF){return[Ev.call(e,FE,FF),E0.call(e,FE,FF)]})});var E5=Ew.call(e,FB,FA);E9=d3.permute(E9,E5);FB=d3.permute(FB,E5);var E4=Ez.call(e,FB,FA);var E2=E9.length,E3=E9[0].length,E7,E6,E1;for(E6=0;E6<E3;++E6){Ey.call(e,E9[0][E6],E1=E4[E6],FB[0][E6][1]);for(E7=1;E7<E2;++E7){Ey.call(e,E9[E7][E6],E1+=FB[E7-1][E6][1],FB[E7][E6][1])}}return E8}e.values=function(E1){if(!arguments.length){return Ex}Ex=E1;return e};e.order=function(E1){if(!arguments.length){return Ew}Ew=typeof E1==="function"?E1:AX.get(E1)||Av;return e};e.offset=function(E1){if(!arguments.length){return Ez}Ez=typeof E1==="function"?E1:w.get(E1)||DM;return e};e.x=function(E1){if(!arguments.length){return Ev}Ev=E1;return e};e.y=function(E1){if(!arguments.length){return E0}E0=E1;return e};e.out=function(E1){if(!arguments.length){return Ey}Ey=E1;return e};return e};function z(e){return e.x}function y(e){return e.y}function DN(Ev,e,Ew){Ev.y0=e;Ev.y=Ew}var AX=d3.map({"inside-out":function(Ey){var Ew=Ey.length,Ez,Ex,E3=Ey.map(A1),E0=Ey.map(Br),E1=d3.range(Ew).sort(function(E6,E5){return E3[E6]-E3[E5]}),E2=0,e=0,E4=[],Ev=[];for(Ez=0;Ez<Ew;++Ez){Ex=E1[Ez];if(E2<e){E2+=E0[Ex];E4.push(Ex)}else{e+=E0[Ex];Ev.push(Ex)}}return Ev.reverse().concat(E4)},reverse:function(e){return d3.range(e.length).reverse()},"default":Av});var w=d3.map({silhouette:function(Ey){var Ev=Ey.length,Ew=Ey[0].length,E0=[],E1=0,Ez,Ex,e,E2=[];for(Ex=0;Ex<Ew;++Ex){for(Ez=0,e=0;Ez<Ev;Ez++){e+=Ey[Ez][Ex][1]}if(e>E1){E1=e}E0.push(e)}for(Ex=0;Ex<Ew;++Ex){E2[Ex]=(E1-E0[Ex])/2}return E2},wiggle:function(E0){var Ev=E0.length,E4=E0[0],Ew=E4.length,E2=0,E1,Ez,Ey,E7,E6,E3,E8,e,Ex,E5=[];E5[0]=e=Ex=0;for(Ez=1;Ez<Ew;++Ez){for(E1=0,E7=0;E1<Ev;++E1){E7+=E0[E1][Ez][1]}for(E1=0,E6=0,E8=E4[Ez][0]-E4[Ez-1][0];E1<Ev;++E1){for(Ey=0,E3=(E0[E1][Ez][1]-E0[E1][Ez-1][1])/(2*E8);Ey<E1;++Ey){E3+=(E0[Ey][Ez][1]-E0[Ey][Ez-1][1])/E8}E6+=E3*E0[E1][Ez][1]}E5[Ez]=e-=E7?E6/E7*E8:0;if(e<Ex){Ex=e}}for(Ez=0;Ez<Ew;++Ez){E5[Ez]-=Ex}return E5},expand:function(Ez){var E1=Ez.length,e=Ez[0].length,Ev=1/E1,Ex,Ew,E0,Ey=[];for(Ew=0;Ew<e;++Ew){for(Ex=0,E0=0;Ex<E1;Ex++){E0+=Ez[Ex][Ew][1]}if(E0){for(Ex=0;Ex<E1;Ex++){Ez[Ex][Ew][1]/=E0}}else{for(Ex=0;Ex<E1;Ex++){Ez[Ex][Ew][1]=Ev}}}for(Ew=0;Ew<e;++Ew){Ey[Ew]=0}return Ey},zero:DM});function Av(e){return d3.range(e.length)}function DM(Ex){var Ev=-1,e=Ex[0].length,Ew=[];while(++Ev<e){Ew[Ev]=0}return Ew}function A1(Ez){var Ex=1,Ew=0,Ev=Ez[0][1],e,Ey=Ez.length;for(;Ex<Ey;++Ex){if((e=Ez[Ex][1])>Ev){Ew=Ex;Ev=e}}return Ew}function Br(e){return e.reduce(DL,0)}function DL(e,Ev){return e+Ev[1]}d3.layout.histogram=function(){var Ey=true,Ev=Number,e=Af,Ew=EX;function Ex(E2,E3){var E8=[],E6=E2.map(Ev,this),E4=e.call(this,E6,E3),E7=Ew.call(this,E4,E6,E3),E9,E3=-1,Ez=E6.length,E0=E7.length-1,E1=Ey?1:1/Ez,E5;while(++E3<E0){E9=E8[E3]=[];E9.dx=E7[E3+1]-(E9.x=E7[E3]);E9.y=0}E3=-1;while(++E3<Ez){E5=E6[E3];if((E5>=E4[0])&&(E5<=E4[1])){E9=E8[d3.bisect(E7,E5,1,E0)-1];E9.y+=E1;E9.push(E2[E3])}}return E8}Ex.value=function(Ez){if(!arguments.length){return Ev}Ev=Ez;return Ex};Ex.range=function(Ez){if(!arguments.length){return e}e=d3.functor(Ez);return Ex};Ex.bins=function(Ez){if(!arguments.length){return Ew}Ew=typeof Ez==="number"?function(E0){return F(E0,Ez)}:d3.functor(Ez);return Ex};Ex.frequency=function(Ez){if(!arguments.length){return Ey}Ey=!!Ez;return Ex};return Ex};function EX(Ev,e){return F(Ev,Math.ceil(Math.log(e.length)/Math.LN2+1))}function F(Ex,Ez){var Ew=-1,Ev=+Ex[0],e=(Ex[1]-Ev)/Ez,Ey=[];while(++Ew<=Ez){Ey[Ew]=e*Ew+Ev}return Ey}function Af(e){return[d3.min(e),d3.max(e)]}d3.layout.hierarchy=function(){var Ew=B5,Ev=AZ,Ey=Eg;function Ex(E5,E4,E0){var E7=Ev.call(e,E5,E4),E2=H?E5:{data:E5};E2.depth=E4;E0.push(E2);if(E7&&(E1=E7.length)){var E6=-1,E1,E8=E2.children=[],E9=0,E3=E4+1;while(++E6<E1){d=Ex(E7[E6],E3,E0);d.parent=E2;E8.push(d);E9+=d.value}if(Ew){E8.sort(Ew)}if(Ey){E2.value=E9}}else{if(Ey){E2.value=+Ey.call(e,E5,E4)||0}}return E2}function Ez(E4,E5){var E3=E4.children,E0=0;if(E3&&(E6=E3.length)){var E2=-1,E6,E1=E5+1;while(++E2<E6){E0+=Ez(E3[E2],E1)}}else{if(Ey){E0=+Ey.call(e,H?E4:E4.data,E5)||0}}if(Ey){E4.value=E0}return E0}function e(E1){var E0=[];Ex(E1,0,E0);return E0}e.sort=function(E0){if(!arguments.length){return Ew}Ew=E0;return e};e.children=function(E0){if(!arguments.length){return Ev}Ev=E0;return e};e.value=function(E0){if(!arguments.length){return Ey}Ey=E0;return e};e.revalue=function(E0){Ez(E0,0);return E0};return e};function Dq(Ev,e){d3.rebind(Ev,e,"sort","children","value");Ev.links=Dr;Ev.nodes=function(Ew){H=true;return(Ev.nodes=Ev)(Ew)};return Ev}function AZ(e){return e.children}function Eg(e){return e.value}function B5(Ev,e){return e.value-Ev.value}function Dr(e){return d3.merge(e.map(function(Ev){return(Ev.children||[]).map(function(Ew){return{source:Ev,target:Ew}})}))}var H=false;d3.layout.pack=function(){var e=d3.layout.hierarchy().sort(CU),Ew=[1,1];function Ev(E3,E1){var E0=e.call(this,E3,E1),Ey=E0[0];Ey.x=0;Ey.y=0;CF(Ey);var Ex=Ew[0],E2=Ew[1],Ez=1/Math.max(2*Ey.r/Ex,2*Ey.r/E2);C8(Ey,Ex/2,E2/2,Ez);return E0}Ev.size=function(Ex){if(!arguments.length){return Ew}Ew=Ex;return Ev};return Dq(Ev,e)};function CU(Ev,e){return Ev.value-e.value}function Aw(Ev,e){var Ew=Ev._pack_next;Ev._pack_next=e;e._pack_prev=Ev;e._pack_next=Ew;Ew._pack_prev=e}function Ab(Ev,e){Ev._pack_next=e;e._pack_prev=Ev}function CN(Ew,e){var Ex=e.x-Ew.x,Ev=e.y-Ew.y,Ey=Ew.r+e.r;return Ey*Ey-Ex*Ex-Ev*Ev>0.001}function k(E4){var E9=Infinity,FD=-Infinity,e=Infinity,Ey=-Infinity,E3=E4.length,FC,FB,FA,E7,E6;function Ew(FE){E9=Math.min(FE.x-FE.r,E9);FD=Math.max(FE.x+FE.r,FD);e=Math.min(FE.y-FE.r,e);Ey=Math.max(FE.y+FE.r,Ey)}E4.forEach(AO);FC=E4[0];FC.x=-FC.r;FC.y=0;Ew(FC);if(E3>1){FB=E4[1];FB.x=FB.r;FB.y=0;Ew(FB);if(E3>2){FA=E4[2];Aa(FC,FB,FA);Ew(FA);Aw(FC,FA);FC._pack_prev=FA;Aw(FA,FB);FB=FC._pack_next;for(var E8=3;E8<E3;E8++){Aa(FC,FB,FA=E4[E8]);var Ev=0,Ez=1,Ex=1;for(E7=FB._pack_next;E7!==FB;E7=E7._pack_next,Ez++){if(CN(E7,FA)){Ev=1;break}}if(Ev==1){for(E6=FC._pack_prev;E6!==E7._pack_prev;E6=E6._pack_prev,Ex++){if(CN(E6,FA)){break}}}if(Ev){if(Ez<Ex||(Ez==Ex&&FB.r<FC.r)){Ab(FC,FB=E7)}else{Ab(FC=E6,FB)}E8--}else{Aw(FC,FA);FB=FA;Ew(FA)}}}}var E1=(E9+FD)/2,E0=(e+Ey)/2,E2=0;for(var E8=0;E8<E3;E8++){var E5=E4[E8];E5.x-=E1;E5.y-=E0;E2=Math.max(E2,E5.r+Math.sqrt(E5.x*E5.x+E5.y*E5.y))}E4.forEach(Ca);return E2}function AO(e){e._pack_next=e._pack_prev=e}function Ca(e){delete e._pack_next;delete e._pack_prev}function CF(Ev){var e=Ev.children;if(e&&e.length){e.forEach(CF);Ev.r=k(e)}else{Ev.r=Math.sqrt(Ev.value)}}function C8(Ey,e,E0,Ev){var Ex=Ey.children;Ey.x=(e+=Ev*Ey.x);Ey.y=(E0+=Ev*Ey.y);Ey.r*=Ev;if(Ex){var Ew=-1,Ez=Ex.length;while(++Ew<Ez){C8(Ex[Ew],e,E0,Ev)}}}function Aa(Ez,Ex,Ev){var E2=Ez.r+Ev.r,E5=Ex.x-Ez.x,E3=Ex.y-Ez.y;if(E2&&(E5||E3)){var E4=Ex.r+Ev.r,E1=Math.sqrt(E5*E5+E3*E3),E0=Math.max(-1,Math.min(1,(E2*E2+E1*E1-E4*E4)/(2*E2*E1))),e=Math.acos(E0),Ey=E0*(E2/=E1),Ew=Math.sin(e)*E2;Ev.x=Ez.x+Ey*E5+Ew*E3;Ev.y=Ez.y+Ey*E3-Ew*E5}else{Ev.x=Ez.x+E2;Ev.y=Ez.y}}d3.layout.cluster=function(){var Ev=d3.layout.hierarchy().sort(null).value(null),Ex=Bu,Ew=[1,1];function e(E5,E2){var Ey=Ev.call(this,E5,E2),E6=Ey[0],E7,E8=0,E4,E3;Eb(E6,function(FB){var FA=FB.children;if(FA&&FA.length){FB.x=Al(FA);FB.y=Ak(FA)}else{FB.x=E7?E8+=Ex(FB,E7):0;FB.y=0;E7=FB}});var E1=CV(E6),E9=Bz(E6),E0=E1.x-Ex(E1,E9)/2,Ez=E9.x+Ex(E9,E1)/2;Eb(E6,function(FA){FA.x=(FA.x-E0)/(Ez-E0)*Ew[0];FA.y=(1-(E6.y?FA.y/E6.y:1))*Ew[1]});return Ey}e.separation=function(Ey){if(!arguments.length){return Ex}Ex=Ey;return e};e.size=function(Ey){if(!arguments.length){return Ew}Ew=Ey;return e};return Dq(e,Ev)};function Ak(e){return 1+d3.max(e,function(Ev){return Ev.y})}function Al(e){return e.reduce(function(Ev,Ew){return Ev+Ew.x},0)/e.length}function CV(Ev){var e=Ev.children;return e&&e.length?CV(e[0]):Ev}function Bz(Ev){var e=Ev.children,Ew;return e&&(Ew=e.length)?Bz(e[Ew-1]):Ev}d3.layout.tree=function(){var Ev=d3.layout.hierarchy().sort(null).value(null),Ex=Bu,Ew=[1,1];function e(E5,E3){var Ez=Ev.call(this,E5,E3),E7=Ez[0];function E4(FF,FB){var FD=FF.children,FI=FF._tree;if(FD&&(FE=FD.length)){var FE,FK=FD[0],FJ,FH=FK,FC,FG=-1;while(++FG<FE){FC=FD[FG];E4(FC,FJ);FH=Ey(FC,FJ,FH);FJ=FC}Bw(FF);var FL=0.5*(FK._tree.prelim+FC._tree.prelim);if(FB){FI.prelim=FB._tree.prelim+Ex(FF,FB);FI.mod=FI.prelim-FL}else{FI.prelim=FL}}else{if(FB){FI.prelim=FB._tree.prelim+Ex(FF,FB)}}}function E6(FE,FB){FE.x=FE._tree.prelim+FB;var FD=FE.children;if(FD&&(FF=FD.length)){var FC=-1,FF;FB+=FE._tree.mod;while(++FC<FF){E6(FD[FC],FB)}}}function Ey(FF,FB,FI){if(FB){var FE=FF,FD=FF,FH=FB,FG=FF.parent.children[0],FK=FE._tree.mod,FJ=FD._tree.mod,FM=FH._tree.mod,FL=FG._tree.mod,FC;while(FH=AG(FH),FE=Em(FE),FH&&FE){FG=Em(FG);FD=AG(FD);FD._tree.ancestor=FF;FC=FH._tree.prelim+FM-FE._tree.prelim-FK+Ex(FH,FE);if(FC>0){Eo(DX(FH,FF,FI),FF,FC);FK+=FC;FJ+=FC}FM+=FH._tree.mod;FK+=FE._tree.mod;FL+=FG._tree.mod;FJ+=FD._tree.mod}if(FH&&!AG(FD)){FD._tree.thread=FH;FD._tree.mod+=FM-FJ}if(FE&&!Em(FG)){FG._tree.thread=FE;FG._tree.mod+=FK-FL;FI=FF}}return FI}Eb(E7,function(FC,FB){FC._tree={ancestor:FC,prelim:0,mod:0,change:0,shift:0,number:FB?FB._tree.number+1:0}});E4(E7);E6(E7,-E7._tree.prelim);var E2=CC(E7,Ap),FA=CC(E7,Bb),E9=CC(E7,W),E1=E2.x-Ex(E2,FA)/2,E0=FA.x+Ex(FA,E2)/2,E8=E9.depth||1;Eb(E7,function(FB){FB.x=(FB.x-E1)/(E0-E1)*Ew[0];FB.y=FB.depth/E8*Ew[1];delete FB._tree});return Ez}e.separation=function(Ey){if(!arguments.length){return Ex}Ex=Ey;return e};e.size=function(Ey){if(!arguments.length){return Ew}Ew=Ey;return e};return Dq(e,Ev)};function Bu(Ev,e){return Ev.parent==e.parent?1:2}function Em(Ev){var e=Ev.children;return e&&e.length?e[0]:Ev._tree.thread}function AG(Ev){var e=Ev.children,Ew;return e&&(Ew=e.length)?e[Ew-1]:Ev._tree.thread}function CC(Ew,Ex){var Ev=Ew.children;if(Ev&&(Ey=Ev.length)){var Ez,Ey,e=-1;while(++e<Ey){if(Ex(Ez=CC(Ev[e],Ex),Ew)>0){Ew=Ez}}}return Ew}function Bb(Ev,e){return Ev.x-e.x}function Ap(Ev,e){return e.x-Ev.x}function W(Ev,e){return Ev.depth-e.depth}function Eb(Ev,Ew){function e(E1,E0){var Ez=E1.children;if(Ez&&(E2=Ez.length)){var E3,Ey=null,Ex=-1,E2;while(++Ex<E2){E3=Ez[Ex];e(E3,Ey);Ey=E3}}Ew(E1,E0)}e(Ev,null)}function Bw(Ex){var e=0,Ez=0,Ew=Ex.children,Ev=Ew.length,Ey;while(--Ev>=0){Ey=Ew[Ev]._tree;Ey.prelim+=e;Ey.mod+=e;e+=Ey.shift+(Ez+=Ey.change)}}function Eo(Ev,Ew,e){Ev=Ev._tree;Ew=Ew._tree;var Ex=e/(Ew.number-Ev.number);Ev.change+=Ex;Ew.change-=Ex;Ew.shift+=e;Ew.prelim+=e;Ew.mod+=e}function DX(e,Ew,Ev){return e._tree.ancestor.parent==Ew.parent?e._tree.ancestor:Ev}d3.layout.treemap=function(){var E1=d3.layout.hierarchy(),E5=Math.round,E7=[1,1],E2=null,e=Cu,E3=false,Ez,E0=0.5*(1+Math.sqrt(5));function Ev(FA,E8){var E9=-1,FD=FA.length,FC,FB;while(++E9<FD){FB=(FC=FA[E9]).value*(E8<0?0:E8);FC.area=isNaN(FB)||FB<=0?0:FB}}function Ex(FC){var E9=FC.children;if(E9&&E9.length){var FF=e(FC),FH=[],FE=E9.slice(),E8,FD=Infinity,FB,FG=Math.min(FF.dx,FF.dy),FA;Ev(FE,FF.dx*FF.dy/FC.value);FH.area=0;while((FA=FE.length)>0){FH.push(E8=FE[FA-1]);FH.area+=E8.area;if((FB=Ew(FH,FG))<=FD){FE.pop();FD=FB}else{FH.area-=FH.pop().area;Ey(FH,FG,FF,false);FG=Math.min(FF.dx,FF.dy);FH.length=FH.area=0;FD=Infinity}}if(FH.length){Ey(FH,FG,FF,true);FH.length=FH.area=0}E9.forEach(Ex)}}function E6(FB){var E8=FB.children;if(E8&&E8.length){var FA=e(FB),E9=E8.slice(),FD,FC=[];Ev(E9,FA.dx*FA.dy/FB.value);FC.area=0;while(FD=E9.pop()){FC.push(FD);FC.area+=FD.area;if(FD.z!=null){Ey(FC,FD.z?FA.dx:FA.dy,FA,!E9.length);FC.length=FC.area=0}}E8.forEach(E6)}}function Ew(FD,E9){var FB=FD.area,FC,FF=0,E8=Infinity,FA=-1,FE=FD.length;while(++FA<FE){if(!(FC=FD[FA].area)){continue}if(FC<E8){E8=FC}if(FC>FF){FF=FC}}FB*=FB;E9*=E9;return FB?Math.max((E9*FF*E0)/FB,FB/(E9*E8*E0)):Infinity}function Ey(FH,FG,FC,FF){var FA=-1,E9=FH.length,FD=FC.x,FB=FC.y,FE=FG?E5(FH.area/FG):0,E8;if(FG==FC.dx){if(FF||FE>FC.dy){FE=FC.dy}while(++FA<E9){E8=FH[FA];E8.x=FD;E8.y=FB;E8.dy=FE;FD+=E8.dx=Math.min(FC.x+FC.dx-FD,FE?E5(E8.area/FE):0)}E8.z=true;E8.dx+=FC.x+FC.dx-FD;FC.y+=FE;FC.dy-=FE}else{if(FF||FE>FC.dx){FE=FC.dx}while(++FA<E9){E8=FH[FA];E8.x=FD;E8.y=FB;E8.dx=FE;FB+=E8.dy=Math.min(FC.y+FC.dy-FB,FE?E5(E8.area/FE):0)}E8.z=false;E8.dy+=FC.y+FC.dy-FB;FC.x+=FE;FC.dx-=FE}}function E4(FA){var E9=Ez||E1(FA),E8=E9[0];E8.x=0;E8.y=0;E8.dx=E7[0];E8.dy=E7[1];if(Ez){E1.revalue(E8)}Ev([E8],E8.dx*E8.dy/E8.value);(Ez?E6:Ex)(E8);if(E3){Ez=E9}return E9}E4.size=function(E8){if(!arguments.length){return E7}E7=E8;return E4};E4.padding=function(E8){if(!arguments.length){return E2}function FB(FC){var FD=E8.call(E4,FC,FC.depth);return FD==null?Cu(FC):AU(FC,typeof FD==="number"?[FD,FD,FD,FD]:FD)}function FA(FC){return AU(FC,E8)}var E9;e=(E2=E8)==null?Cu:(E9=typeof E8)==="function"?FB:E9==="number"?(E8=[E8,E8,E8,E8],FA):FA;return E4};E4.round=function(E8){if(!arguments.length){return E5!=Number}E5=E8?Math.round:Number;return E4};E4.sticky=function(E8){if(!arguments.length){return E3}E3=E8;Ez=null;return E4};E4.ratio=function(E8){if(!arguments.length){return E0}E0=E8;return E4};return Dq(E4,E1)};function Cu(e){return{x:e.x,y:e.y,dx:e.dx,dy:e.dy}}function AU(Ex,Ey){var e=Ex.x+Ey[3],Ez=Ex.y+Ey[0],Ew=Ex.dx-Ey[1]-Ey[3],Ev=Ex.dy-Ey[0]-Ey[2];if(Ew<0){e+=Ew/2;Ew=0}if(Ev<0){Ez+=Ev/2;Ev=0}return{x:e,y:Ez,dx:Ew,dy:Ev}}d3.csv=function(e,Ev){d3.text(e,"text/csv",function(Ew){Ev(Ew&&d3.csv.parse(Ew))})};d3.csv.parse=function(e){var Ev;return d3.csv.parseRows(e,function(E0,Ey){if(Ey){var Ez={},Ex=-1,Ew=Ev.length;while(++Ex<Ew){Ez[Ev[Ex]]=E0[Ex]}return Ez}else{Ev=E0;return null}})};d3.csv.parseRows=function(E1,Ey){var Ev={},Ex={},E4=[],E2=/\r\n|[,\r\n]/g,e=0,E3,Ez;E2.lastIndex=0;function Ew(){if(E2.lastIndex>=E1.length){return Ex}if(Ez){Ez=false;return Ev}var E6=E2.lastIndex;if(E1.charCodeAt(E6)===34){var E7=E6;while(E7++<E1.length){if(E1.charCodeAt(E7)===34){if(E1.charCodeAt(E7+1)!==34){break}E7++}}E2.lastIndex=E7+2;var E8=E1.charCodeAt(E7+1);if(E8===13){Ez=true;if(E1.charCodeAt(E7+2)===10){E2.lastIndex++}}else{if(E8===10){Ez=true}}return E1.substring(E6+1,E7).replace(/""/g,'"')}var E5=E2.exec(E1);if(E5){Ez=E5[0].charCodeAt(0)!==44;return E1.substring(E6,E5.index)}E2.lastIndex=E1.length;return E1.substring(E6)}while((E3=Ew())!==Ex){var E0=[];while((E3!==Ev)&&(E3!==Ex)){E0.push(E3);E3=Ew()}if(Ey&&!(E0=Ey(E0,e++))){continue}E4.push(E0)}return E4};d3.csv.format=function(e){return e.map(CK).join("\n")};function CK(e){return e.map(AE).join(",")}function AE(e){return/[",\n]/.test(e)?'"'+e.replace(/\"/g,'""')+'"':e}d3.geo={};var Cb=Math.PI/180;d3.geo.azimuthal=function(){var Ez="orthographic",E2,Ex=200,Ew=[480,250],e,E1,Ey,E0;function Ev(FE){var E4=FE[0]*Cb-e,FD=FE[1]*Cb,E8=Math.cos(E4),E3=Math.sin(E4),E6=Math.cos(FD),FC=Math.sin(FD),E5=Ez!=="orthographic"?E0*FC+Ey*E6*E8:null,E9,E7=Ez==="stereographic"?1/(1+E5):Ez==="gnomonic"?1/E5:Ez==="equidistant"?(E9=Math.acos(E5),E9?E9/Math.sin(E9):0):Ez==="equalarea"?Math.sqrt(2/(1+E5)):1,FB=E7*E6*E3,FA=E7*(E0*E6*E8-Ey*FC);return[Ex*FB+Ew[0],Ex*FA+Ew[1]]}Ev.invert=function(E6){var E3=(E6[0]-Ew[0])/Ex,E9=(E6[1]-Ew[1])/Ex,E4=Math.sqrt(E3*E3+E9*E9),E8=Ez==="stereographic"?2*Math.atan(E4):Ez==="gnomonic"?Math.atan(E4):Ez==="equidistant"?E4:Ez==="equalarea"?2*Math.asin(0.5*E4):Math.asin(E4),E5=Math.sin(E8),E7=Math.cos(E8);return[(e+Math.atan2(E3*E5,E4*Ey*E7+E9*E0*E5))/Cb,Math.asin(E7*E0-(E4?(E9*E5*Ey)/E4:0))/Cb]};Ev.mode=function(E3){if(!arguments.length){return Ez}Ez=E3+"";return Ev};Ev.origin=function(E3){if(!arguments.length){return E2}E2=E3;e=E2[0]*Cb;E1=E2[1]*Cb;Ey=Math.cos(E1);E0=Math.sin(E1);return Ev};Ev.scale=function(E3){if(!arguments.length){return Ex}Ex=+E3;return Ev};Ev.translate=function(E3){if(!arguments.length){return Ew}Ew=[+E3[0],+E3[1]];return Ev};return Ev.origin([0,0])};d3.geo.albers=function(){var E2=[-98,38],E0=[29.5,45.5],Ez=1000,Ey=[480,250],E1,Ex,Ev,E3;function Ew(E6){var E4=Ex*(Cb*E6[0]-E1),E5=Math.sqrt(Ev-2*Ex*Math.sin(Cb*E6[1]))/Ex;return[Ez*E5*Math.sin(E4)+Ey[0],Ez*(E5*Math.cos(E4)-E3)+Ey[1]]}Ew.invert=function(E7){var E4=(E7[0]-Ey[0])/Ez,E9=(E7[1]-Ey[1])/Ez,E8=E3+E9,E5=Math.atan2(E4,E8),E6=Math.sqrt(E4*E4+E8*E8);return[(E1+E5/Ex)/Cb,Math.asin((Ev-E6*E6*Ex*Ex)/(2*Ex))/Cb]};function e(){var E5=Cb*E0[0],E4=Cb*E0[1],E8=Cb*E2[1],E6=Math.sin(E5),E7=Math.cos(E5);E1=Cb*E2[0];Ex=0.5*(E6+Math.sin(E4));Ev=E7*E7+2*Ex*E6;E3=Math.sqrt(Ev-2*Ex*Math.sin(E8))/Ex;return Ew}Ew.origin=function(E4){if(!arguments.length){return E2}E2=[+E4[0],+E4[1]];return e()};Ew.parallels=function(E4){if(!arguments.length){return E0}E0=[+E4[0],+E4[1]];return e()};Ew.scale=function(E4){if(!arguments.length){return Ez}Ez=+E4;return Ew};Ew.translate=function(E4){if(!arguments.length){return Ey}Ey=[+E4[0],+E4[1]];return Ew};return e()};d3.geo.albersUsa=function(){var e=d3.geo.albers();var Ey=d3.geo.albers().origin([-160,60]).parallels([55,65]);var Ex=d3.geo.albers().origin([-160,20]).parallels([8,18]);var Ew=d3.geo.albers().origin([-60,10]).parallels([8,18]);function Ev(E1){var E0=E1[0],Ez=E1[1];return(Ez>50?Ey:E0<-140?Ex:Ez<21?Ew:e)(E1)}Ev.scale=function(Ez){if(!arguments.length){return e.scale()}e.scale(Ez);Ey.scale(Ez*0.6);Ex.scale(Ez);Ew.scale(Ez*1.5);return Ev.translate(e.translate())};Ev.translate=function(E0){if(!arguments.length){return e.translate()}var Ez=e.scale()/1000,E2=E0[0],E1=E0[1];e.translate(E0);Ey.translate([E2-400*Ez,E1+170*Ez]);Ex.translate([E2-190*Ez,E1+200*Ez]);Ew.translate([E2+580*Ez,E1+430*Ez]);return Ev};return Ev.scale(e.scale())};d3.geo.bonne=function(){var Ez=200,Ey=[480,250],e,Ex,Ew,Ev;function E0(E4){var E1=E4[0]*Cb-e,E5=E4[1]*Cb-Ex;if(Ew){var E3=Ev+Ew-E5,E2=E1*Math.cos(E5)/E3;E1=E3*Math.sin(E2);E5=E3*Math.cos(E2)-Ev}else{E1*=Math.cos(E5);E5*=-1}return[Ez*E1+Ey[0],Ez*E5+Ey[1]]}E0.invert=function(E3){var E1=(E3[0]-Ey[0])/Ez,E5=(E3[1]-Ey[1])/Ez;if(Ew){var E4=Ev+E5,E2=Math.sqrt(E1*E1+E4*E4);E5=Ev+Ew-E2;E1=e+E2*Math.atan2(E1,E4)/Math.cos(E5)}else{E5*=-1;E1/=Math.cos(E5)}return[E1/Cb,E5/Cb]};E0.parallel=function(E1){if(!arguments.length){return Ew/Cb}Ev=1/Math.tan(Ew=E1*Cb);return E0};E0.origin=function(E1){if(!arguments.length){return[e/Cb,Ex/Cb]}e=E1[0]*Cb;Ex=E1[1]*Cb;return E0};E0.scale=function(E1){if(!arguments.length){return Ez}Ez=+E1;return E0};E0.translate=function(E1){if(!arguments.length){return Ey}Ey=[+E1[0],+E1[1]];return E0};return E0.origin([0,0]).parallel(45)};d3.geo.equirectangular=function(){var Ew=500,Ev=[480,250];function e(Ey){var Ex=Ey[0]/360,Ez=-Ey[1]/360;return[Ew*Ex+Ev[0],Ew*Ez+Ev[1]]}e.invert=function(Ey){var Ex=(Ey[0]-Ev[0])/Ew,Ez=(Ey[1]-Ev[1])/Ew;return[360*Ex,-360*Ez]};e.scale=function(Ex){if(!arguments.length){return Ew}Ew=+Ex;return e};e.translate=function(Ex){if(!arguments.length){return Ev}Ev=[+Ex[0],+Ex[1]];return e};return e};d3.geo.mercator=function(){var Ew=500,Ev=[480,250];function e(Ey){var Ex=Ey[0]/360,Ez=-(Math.log(Math.tan(Math.PI/4+Ey[1]*Cb/2))/Cb)/360;return[Ew*Ex+Ev[0],Ew*Math.max(-0.5,Math.min(0.5,Ez))+Ev[1]]}e.invert=function(Ey){var Ex=(Ey[0]-Ev[0])/Ew,Ez=(Ey[1]-Ev[1])/Ew;return[360*Ex,2*Math.atan(Math.exp(-360*Ez*Cb))/Cb-90]};e.scale=function(Ex){if(!arguments.length){return Ew}Ew=+Ex;return e};e.translate=function(Ex){if(!arguments.length){return Ev}Ev=[+Ex[0],+Ex[1]];return e};return e};function DI(Ev,e){return function(Ew){return Ew&&Ev.hasOwnProperty(Ew.type)?Ev[Ew.type](Ew):e}}d3.geo.path=function(){var E0=4.5,E4=Z(E0),Ez=d3.geo.albersUsa();function E3(E6,E5){if(typeof E0==="function"){E4=Z(E0.apply(this,arguments))}return Ev(E6)||null}function E1(E5){return Ez(E5).join(",")}var Ev=DI({FeatureCollection:function(E8){var E7=[],E6=E8.features,E5=-1,E9=E6.length;while(++E5<E9){E7.push(Ev(E6[E5].geometry))}return E7.join("")},Feature:function(E5){return Ev(E5.geometry)},Point:function(E5){return"M"+E1(E5.coordinates)+E4},MultiPoint:function(E8){var E6=[],E7=E8.coordinates,E5=-1,E9=E7.length;while(++E5<E9){E6.push("M",E1(E7[E5]),E4)}return E6.join("")},LineString:function(E8){var E6=["M"],E7=E8.coordinates,E5=-1,E9=E7.length;while(++E5<E9){E6.push(E1(E7[E5]),"L")}E6.pop();return E6.join("")},MultiLineString:function(FB){var E9=[],FA=FB.coordinates,E8=-1,FC=FA.length,E6,E7,E5;while(++E8<FC){E6=FA[E8];E7=-1;E5=E6.length;E9.push("M");while(++E7<E5){E9.push(E1(E6[E7]),"L")}E9.pop()}return E9.join("")},Polygon:function(FB){var E9=[],FA=FB.coordinates,E8=-1,FC=FA.length,E6,E7,E5;while(++E8<FC){E6=FA[E8];E7=-1;if((E5=E6.length-1)>0){E9.push("M");while(++E7<E5){E9.push(E1(E6[E7]),"L")}E9[E9.length-1]="Z"}}return E9.join("")},MultiPolygon:function(E6){var FF=[],FE=E6.coordinates,FD=-1,E7=FE.length,FA,FC,E8,FB,E9,E5;while(++FD<E7){FA=FE[FD];FC=-1;E8=FA.length;while(++FC<E8){FB=FA[FC];E9=-1;if((E5=FB.length-1)>0){FF.push("M");while(++E9<E5){FF.push(E1(FB[E9]),"L")}FF[FF.length-1]="Z"}}}return FF.join("")},GeometryCollection:function(E8){var E7=[],E6=E8.geometries,E5=-1,E9=E6.length;while(++E5<E9){E7.push(Ev(E6[E5]))}return E7.join("")}});var Ew=E3.area=DI({FeatureCollection:function(E8){var E7=0,E6=E8.features,E5=-1,E9=E6.length;while(++E5<E9){E7+=Ew(E6[E5])}return E7},Feature:function(E5){return Ew(E5.geometry)},Polygon:function(E5){return Ey(E5.coordinates)},MultiPolygon:function(E8){var E6=0,E7=E8.coordinates,E5=-1,E9=E7.length;while(++E5<E9){E6+=Ey(E7[E5])}return E6},GeometryCollection:function(E8){var E7=0,E6=E8.geometries,E5=-1,E9=E6.length;while(++E5<E9){E7+=Ew(E6[E5])}return E7}},0);function Ey(E7){var E6=Ex(E7[0]),E5=0,E8=E7.length;while(++E5<E8){E6-=Ex(E7[E5])}return E6}function e(FD){var FB=d3.geom.polygon(FD[0].map(Ez)),E5=FB.area(),E6=FB.centroid(E5<0?(E5*=-1,1):-1),FC=E6[0],FA=E6[1],E9=E5,E8=0,E7=FD.length;while(++E8<E7){FB=d3.geom.polygon(FD[E8].map(Ez));E5=FB.area();E6=FB.centroid(E5<0?(E5*=-1,1):-1);FC-=E6[0];FA-=E6[1];E9-=E5}return[FC,FA,6*E9]}var E2=E3.centroid=DI({Feature:function(E5){return E2(E5.geometry)},Polygon:function(E6){var E5=e(E6.coordinates);return[E5[0]/E5[2],E5[1]/E5[2]]},MultiPolygon:function(E6){var E5=0,FD=E6.coordinates,E7,FC=0,FB=0,FA=0,E9=-1,E8=FD.length;while(++E9<E8){E7=e(FD[E9]);FC+=E7[0];FB+=E7[1];FA+=E7[2]}return[FC/FA,FB/FA]}});function Ex(E5){return Math.abs(d3.geom.polygon(E5.map(Ez)).area())}E3.projection=function(E5){Ez=E5;return E3};E3.pointRadius=function(E5){if(typeof E5==="function"){E0=E5}else{E0=+E5;E4=Z(E0)}return E3};return E3};function Z(e){return"m0,"+e+"a"+e+","+e+" 0 1,1 0,"+(-2*e)+"a"+e+","+e+" 0 1,1 0,"+(+2*e)+"z"}d3.geo.bounds=function(Ew){var Ey=Infinity,e=Infinity,Ev=-Infinity,Ex=-Infinity;Bk(Ew,function(Ez,E0){if(Ez<Ey){Ey=Ez}if(Ez>Ev){Ev=Ez}if(E0<e){e=E0}if(E0>Ex){Ex=E0}});return[[Ey,e],[Ev,Ex]]};function Bk(Ev,e){if(D0.hasOwnProperty(Ev.type)){D0[Ev.type](Ev,e)}}var D0={Feature:Ef,FeatureCollection:De,GeometryCollection:Cy,LineString:Dj,MultiLineString:Dw,MultiPoint:Dj,MultiPolygon:Ed,Point:ER,Polygon:BQ};function Ef(Ev,e){Bk(Ev.geometry,e)}function De(Ex,Ew){for(var e=Ex.features,Ev=0,Ey=e.length;Ev<Ey;Ev++){Bk(e[Ev].geometry,Ew)}}function Cy(Ex,Ew){for(var e=Ex.geometries,Ev=0,Ey=e.length;Ev<Ey;Ev++){Bk(e[Ev],Ew)}}function Dj(Ex,Ew){for(var e=Ex.coordinates,Ev=0,Ey=e.length;Ev<Ey;Ev++){Ew.apply(null,e[Ev])}}function Dw(E0,Ez){for(var Ew=E0.coordinates,Ey=0,E1=Ew.length;Ey<E1;Ey++){for(var Ev=Ew[Ey],Ex=0,e=Ev.length;Ex<e;Ex++){Ez.apply(null,Ev[Ex])}}}function Ed(E0,Ez){for(var Ew=E0.coordinates,Ey=0,E1=Ew.length;Ey<E1;Ey++){for(var Ev=Ew[Ey][0],Ex=0,e=Ev.length;Ex<e;Ex++){Ez.apply(null,Ev[Ex])}}}function ER(Ev,e){e.apply(null,Ev.coordinates)}function BQ(Ex,Ew){for(var e=Ex.coordinates[0],Ev=0,Ey=e.length;Ev<Ey;Ev++){Ew.apply(null,e[Ev])}}d3.geo.circle=function(){var E2=[0,0],Ez=90-0.01,E0=Ez*Cb,Ew=d3.geo.greatArc().target(Object);function Ev(){}function Ex(E3){return Ew.distance(E3)<E0}Ev.clip=function(E3){Ew.source(typeof E2==="function"?E2.apply(this,arguments):E2);return E1(E3)};var E1=DI({FeatureCollection:function(E4){var E3=E4.features.map(E1).filter(Object);return E3&&(E4=Object.create(E4),E4.features=E3,E4)},Feature:function(E4){var E3=E1(E4.geometry);return E3&&(E4=Object.create(E4),E4.geometry=E3,E4)},Point:function(E3){return Ex(E3.coordinates)&&E3},MultiPoint:function(E4){var E3=E4.coordinates.filter(Ex);return E3.length&&{type:E4.type,coordinates:E3}},LineString:function(E4){var E3=Ey(E4.coordinates);return E3.length&&(E4=Object.create(E4),E4.coordinates=E3,E4)},MultiLineString:function(E4){var E3=E4.coordinates.map(Ey).filter(function(E5){return E5.length});return E3.length&&(E4=Object.create(E4),E4.coordinates=E3,E4)},Polygon:function(E4){var E3=E4.coordinates.map(Ey);return E3[0].length&&(E4=Object.create(E4),E4.coordinates=E3,E4)},MultiPolygon:function(E4){var E3=E4.coordinates.map(function(E5){return E5.map(Ey)}).filter(function(E5){return E5[0].length});return E3.length&&(E4=Object.create(E4),E4.coordinates=E3,E4)},GeometryCollection:function(E4){var E3=E4.geometries.map(E1).filter(Object);return E3.length&&(E4=Object.create(E4),E4.geometries=E3,E4)}});function Ey(E8){var E7=-1,E5=E8.length,E6=[],FB,FA,E9,E4,E3;while(++E7<E5){E3=Ew.distance(E9=E8[E7]);if(E3<E0){if(FA){E6.push(Eu(FA,E9)((E4-E0)/(E4-E3)))}E6.push(E9);FB=FA=null}else{FA=E9;if(!FB&&E6.length){E6.push(Eu(E6[E6.length-1],FA)((E0-E4)/(E3-E4)));FB=FA}}E4=E3}if(FA&&E6.length){E3=Ew.distance(E9=E6[0]);E6.push(Eu(FA,E9)((E4-E0)/(E4-E3)))}return e(E6)}function e(E9){var E7=0,FA=E9.length,E6,E3,E4=FA?[E9[0]]:E9,E8,E5=Ew.source();while(++E7<FA){E8=Ew.source(E9[E7-1])(E9[E7]).coordinates;for(E6=0,E3=E8.length;++E6<E3;){E4.push(E8[E6])}}Ew.source(E5);return E4}Ev.origin=function(E3){if(!arguments.length){return E2}E2=E3;return Ev};Ev.angle=function(E3){if(!arguments.length){return Ez}E0=(Ez=+E3)*Cb;return Ev};Ev.precision=function(E3){if(!arguments.length){return Ew.precision()}Ew.precision(E3);return Ev};return Ev};d3.geo.greatArc=function(){var Ew=Bh,Ex=Bm,Ev=6*Cb;function e(){var Ez=typeof Ew==="function"?Ew.apply(this,arguments):Ew,Ey=typeof Ex==="function"?Ex.apply(this,arguments):Ex,E1=Eu(Ez,Ey),E2=Ev/E1.d,E0=0,E3=[Ez];while((E0+=E2)<1){E3.push(E1(E0))}E3.push(Ey);return{type:"LineString",coordinates:E3}}e.distance=function(){var Ez=typeof Ew==="function"?Ew.apply(this,arguments):Ew,Ey=typeof Ex==="function"?Ex.apply(this,arguments):Ex;return Eu(Ez,Ey).d};e.source=function(Ey){if(!arguments.length){return Ew}Ew=Ey;return e};e.target=function(Ey){if(!arguments.length){return Ex}Ex=Ey;return e};e.precision=function(Ey){if(!arguments.length){return Ev/Cb}Ev=Ey*Cb;return e};return e};function Bh(e){return e.source}function Bm(e){return e.target}function Eu(E8,E5){var Ex=E8[0]*Cb,E4=Math.cos(Ex),Ew=Math.sin(Ex),FA=E8[1]*Cb,Ez=Math.cos(FA),E9=Math.sin(FA),Ev=E5[0]*Cb,E3=Math.cos(Ev),e=Math.sin(Ev),E7=E5[1]*Cb,Ey=Math.cos(E7),E6=Math.sin(E7),E2=E0.d=Math.acos(Math.max(-1,Math.min(1,E9*E6+Ez*Ey*Math.cos(Ev-Ex)))),E1=Math.sin(E2);function E0(FD){var FC=Math.sin(E2-(FD*=E2))/E1,FG=Math.sin(FD)/E1,FB=FC*Ez*E4+FG*Ey*E3,FF=FC*Ez*Ew+FG*Ey*e,FE=FC*E9+FG*E6;return[Math.atan2(FF,FB)/Cb,Math.atan2(FE,Math.sqrt(FB*FB+FF*FF))/Cb]}return E0}d3.geo.greatCircle=d3.geo.circle;d3.geom={};d3.geom.contour=function(e,Ev){var E3=Ev||K(e),Ez=[],E1=E3[0],E0=E3[1],E4=0,E2=0,Ex=NaN,Ew=NaN,Ey=0;do{Ey=0;if(e(E1-1,E0-1)){Ey+=1}if(e(E1,E0-1)){Ey+=2}if(e(E1-1,E0)){Ey+=4}if(e(E1,E0)){Ey+=8}if(Ey===6){E4=Ew===-1?-1:1;E2=0}else{if(Ey===9){E4=0;E2=Ex===1?-1:1}else{E4=Bf[Ey];E2=Bd[Ey]}}if(E4!=Ex&&E2!=Ew){Ez.push([E1,E0]);Ex=E4;Ew=E2}E1+=E4;E0+=E2}while(E3[0]!=E1||E3[1]!=E0);return Ez};var Bf=[1,0,1,1,-1,0,-1,1,0,0,0,0,-1,0,-1,NaN],Bd=[0,-1,0,0,0,-1,0,0,1,-1,1,1,0,-1,0,NaN];function K(Ev){var e=0,Ew=0;while(true){if(Ev(e,Ew)){return[e,Ew]}if(e===0){e=Ew+1;Ew=0}else{e=e-1;Ew=Ew+1}}}d3.geom.hull=function(E3){if(E3.length<3){return[]}var E2=E3.length,Ey=E2-1,E9=[],E5=[],E0,Ez,E1=0,Ex,E7,Ev,E4,FA,E8,E6,Ew;for(E0=1;E0<E2;++E0){if(E3[E0][1]<E3[E1][1]){E1=E0}else{if(E3[E0][1]==E3[E1][1]){E1=(E3[E0][0]<E3[E1][0]?E0:E1)}}}for(E0=0;E0<E2;++E0){if(E0===E1){continue}E7=E3[E0][1]-E3[E1][1];Ex=E3[E0][0]-E3[E1][0];E9.push({angle:Math.atan2(E7,Ex),index:E0})}E9.sort(function(FC,FB){return FC.angle-FB.angle});E6=E9[0].angle;E8=E9[0].index;FA=0;for(E0=1;E0<Ey;++E0){Ez=E9[E0].index;if(E6==E9[E0].angle){Ex=E3[E8][0]-E3[E1][0];E7=E3[E8][1]-E3[E1][1];Ev=E3[Ez][0]-E3[E1][0];E4=E3[Ez][1]-E3[E1][1];if((Ex*Ex+E7*E7)>=(Ev*Ev+E4*E4)){E9[E0].index=-1}else{E9[FA].index=-1;E6=E9[E0].angle;FA=E0;E8=Ez}}else{E6=E9[E0].angle;FA=E0;E8=Ez}}E5.push(E1);for(E0=0,Ez=0;E0<2;++Ez){if(E9[Ez].index!==-1){E5.push(E9[Ez].index);E0++}}Ew=E5.length;for(;Ez<Ey;++Ez){if(E9[Ez].index===-1){continue}while(!B0(E5[Ew-2],E5[Ew-1],E9[Ez].index,E3)){--Ew}E5[Ew++]=E9[Ez].index}var e=[];for(E0=0;E0<Ew;++E0){e.push(E3[E5[E0]])}return e};function B0(Ex,Ew,Ev,E4){var E5,E3,E2,E1,E0,Ez,Ey;E5=E4[Ex];E3=E5[0];E2=E5[1];E5=E4[Ew];E1=E5[0];E0=E5[1];E5=E4[Ev];Ez=E5[0];Ey=E5[1];return((Ey-E2)*(E1-E3)-(E0-E2)*(Ez-E3))>0}d3.geom.polygon=function(e){e.area=function(){var Ex=0,Ey=e.length,Ew=e[Ey-1][0]*e[0][1],Ev=e[Ey-1][1]*e[0][0];while(++Ex<Ey){Ew+=e[Ex-1][0]*e[Ex][1];Ev+=e[Ex-1][1]*e[Ex][0]}return(Ev-Ew)*0.5};e.centroid=function(Ey){var Ez=-1,E2=e.length,Ew=0,E1=0,Ex,Ev=e[E2-1],E0;if(!arguments.length){Ey=-1/(6*e.area())}while(++Ez<E2){Ex=Ev;Ev=e[Ez];E0=Ex[0]*Ev[1]-Ev[0]*Ex[1];Ew+=(Ex[0]+Ev[0])*E0;E1+=(Ex[1]+Ev[1])*E0}return[Ew*Ey,E1*Ey]};e.clip=function(E1){var E3,Ey=-1,Ev=e.length,Ex,Ew,E4=e[Ev-1],E2,E0,Ez;while(++Ey<Ev){E3=E1.slice();E1.length=0;E2=e[Ey];E0=E3[(Ew=E3.length)-1];Ex=-1;while(++Ex<Ew){Ez=E3[Ex];if(T(Ez,E4,E2)){if(!T(E0,E4,E2)){E1.push(Dm(E0,Ez,E4,E2))}E1.push(Ez)}else{if(T(E0,E4,E2)){E1.push(Dm(E0,Ez,E4,E2))}}E0=Ez}E4=E2}return E1};return e};function T(Ew,Ev,e){return(e[0]-Ev[0])*(Ew[1]-Ev[1])<(e[1]-Ev[1])*(Ew[0]-Ev[0])}function Dm(E7,E6,FA,E9){var E5=E7[0],E4=E6[0],E3=FA[0],E1=E9[0],Ex=E7[1],Ew=E6[1],Ev=FA[1],e=E9[1],FB=E5-E3,Ey=E4-E5,FC=E1-E3,Ez=Ex-Ev,E8=Ew-Ex,E0=e-Ev,E2=(FC*Ez-E0*FB)/(E0*Ey-FC*E8);return[E5+E2*Ey,Ex+E2*E8]}d3.geom.voronoi=function(Ev){var e=Ev.map(function(){return[]});D6(Ev,function(Ey){var E4,E3,Ex,Ew,E1,Ez;if(Ey.a===1&&Ey.b>=0){E4=Ey.ep.r;E3=Ey.ep.l}else{E4=Ey.ep.l;E3=Ey.ep.r}if(Ey.a===1){E1=E4?E4.y:-1000000;Ex=Ey.c-Ey.b*E1;Ez=E3?E3.y:1000000;Ew=Ey.c-Ey.b*Ez}else{Ex=E4?E4.x:-1000000;E1=Ey.c-Ey.a*Ex;Ew=E3?E3.x:1000000;Ez=Ey.c-Ey.a*Ew}var E2=[Ex,E1],E0=[Ew,Ez];e[Ey.region.l.index].push(E2,E0);e[Ey.region.r.index].push(E2,E0)});return e.map(function(Ey,Ex){var Ew=Ev[Ex][0],Ez=Ev[Ex][1];Ey.forEach(function(E0){E0.angle=Math.atan2(E0[0]-Ew,E0[1]-Ez)});return Ey.sort(function(E1,E0){return E1.angle-E0.angle}).filter(function(E1,E0){return !E0||(E1.angle-Ey[E0-1].angle>1e-10)})})};var Bs={l:"r",r:"l"};function D6(Ez,Ex){var FD={list:Ez.map(function(e,FF){return{index:FF,x:e[0],y:e[1]}}).sort(function(FF,e){return FF.y<e.y?-1:FF.y>e.y?1:FF.x<e.x?-1:FF.x>e.x?1:0}),bottomSite:null};var Ew={list:[],leftEnd:null,rightEnd:null,init:function(){Ew.leftEnd=Ew.createHalfEdge(null,"l");Ew.rightEnd=Ew.createHalfEdge(null,"l");Ew.leftEnd.r=Ew.rightEnd;Ew.rightEnd.l=Ew.leftEnd;Ew.list.unshift(Ew.leftEnd,Ew.rightEnd)},createHalfEdge:function(FF,e){return{edge:FF,side:e,vertex:null,l:null,r:null}},insert:function(FF,e){e.l=FF;e.r=FF.r;FF.r.l=e;FF.r=e},leftBound:function(FF){var e=Ew.leftEnd;do{e=e.r}while(e!=Ew.rightEnd&&FC.rightOf(e,FF));e=e.l;return e},del:function(e){e.l.r=e.r;e.r.l=e.l;e.edge=null},right:function(e){return e.r},left:function(e){return e.l},leftRegion:function(e){return e.edge==null?FD.bottomSite:e.edge.region[e.side]},rightRegion:function(e){return e.edge==null?FD.bottomSite:e.edge.region[Bs[e.side]]}};var FC={bisect:function(FI,FG){var FH={region:{l:FI,r:FG},ep:{l:null,r:null}};var FF=FG.x-FI.x,e=FG.y-FI.y,FK=FF>0?FF:-FF,FJ=e>0?e:-e;FH.c=FI.x*FF+FI.y*e+(FF*FF+e*e)*0.5;if(FK>FJ){FH.a=1;FH.b=e/FF;FH.c/=FF}else{FH.b=1;FH.a=FF/e;FH.c/=e}return FH},intersect:function(FI,FH){var FN=FI.edge,FM=FH.edge;if(!FN||!FM||(FN.region.r==FM.region.r)){return null}var FL=(FN.a*FM.b)-(FN.b*FM.a);if(Math.abs(FL)<1e-10){return null}var FG=(FN.c*FM.b-FM.c*FN.b)/FL,FQ=(FM.c*FN.a-FN.c*FM.a)/FL,FP=FN.region.r,FK=FM.region.r,FF,FJ;if((FP.y<FK.y)||(FP.y==FK.y&&FP.x<FK.x)){FF=FI;FJ=FN}else{FF=FH;FJ=FM}var FO=(FG>=FJ.region.r.x);if((FO&&(FF.side==="l"))||(!FO&&(FF.side==="r"))){return null}return{x:FG,y:FQ}},rightOf:function(FK,FF){var FO=FK.edge,FI=FO.region.r,FR=(FF.x>FI.x);if(FR&&(FK.side==="l")){return 1}if(!FR&&(FK.side==="r")){return 0}if(FO.a===1){var FQ=FF.y-FI.y,FG=FF.x-FI.x,FL=0,FP=0;if((!FR&&(FO.b<0))||(FR&&(FO.b>=0))){FP=FL=(FQ>=FO.b*FG)}else{FP=((FF.x+FF.y*FO.b)>FO.c);if(FO.b<0){FP=!FP}if(!FP){FL=1}}if(!FL){var FS=FI.x-FO.region.l.x;FP=(FO.b*(FG*FG-FQ*FQ))<(FS*FQ*(1+2*FG/FS+FO.b*FO.b));if(FO.b<0){FP=!FP}}}else{var FH=FO.c-FO.a*FF.x,FN=FF.y-FH,FM=FF.x-FI.x,FJ=FH-FI.y;FP=(FN*FN)>(FM*FM+FJ*FJ)}return FK.side==="l"?FP:!FP},endPoint:function(FG,FF,e){FG.ep[FF]=e;if(!FG.ep[Bs[FF]]){return}Ex(FG)},distance:function(FH,FG){var FF=FH.x-FG.x,e=FH.y-FG.y;return Math.sqrt(FF*FF+e*e)}};var Ev={list:[],insert:function(FJ,FF,FK){FJ.vertex=FF;FJ.ystar=FF.y+FK;for(var FG=0,FI=Ev.list,e=FI.length;FG<e;FG++){var FH=FI[FG];if(FJ.ystar>FH.ystar||(FJ.ystar==FH.ystar&&FF.x>FH.vertex.x)){continue}else{break}}FI.splice(FG,0,FJ)},del:function(FH){for(var FG=0,FF=Ev.list,e=FF.length;FG<e&&(FF[FG]!=FH);++FG){}FF.splice(FG,1)},empty:function(){return Ev.list.length===0},nextEvent:function(FH){for(var FG=0,FF=Ev.list,e=FF.length;FG<e;++FG){if(FF[FG]==FH){return FF[FG+1]}}return null},min:function(){var e=Ev.list[0];return{x:e.vertex.x,y:e.ystar}},extractMin:function(){return Ev.list.shift()}};Ew.init();FD.bottomSite=FD.list.shift();var FE=FD.list.shift(),E1;var E6,E3,Ey,FA,E0;var E4,E5,FB,E7,E2;var E9,E8;while(true){if(!Ev.empty()){E1=Ev.min()}if(FE&&(Ev.empty()||FE.y<E1.y||(FE.y==E1.y&&FE.x<E1.x))){E6=Ew.leftBound(FE);E3=Ew.right(E6);E4=Ew.rightRegion(E6);E9=FC.bisect(E4,FE);E0=Ew.createHalfEdge(E9,"l");Ew.insert(E6,E0);E7=FC.intersect(E6,E0);if(E7){Ev.del(E6);Ev.insert(E6,E7,FC.distance(E7,FE))}E6=E0;E0=Ew.createHalfEdge(E9,"r");Ew.insert(E6,E0);E7=FC.intersect(E0,E3);if(E7){Ev.insert(E0,E7,FC.distance(E7,FE))}FE=FD.list.shift()}else{if(!Ev.empty()){E6=Ev.extractMin();Ey=Ew.left(E6);E3=Ew.right(E6);FA=Ew.right(E3);E4=Ew.leftRegion(E6);E5=Ew.rightRegion(E3);E2=E6.vertex;FC.endPoint(E6.edge,E6.side,E2);FC.endPoint(E3.edge,E3.side,E2);Ew.del(E6);Ev.del(E3);Ew.del(E3);E8="l";if(E4.y>E5.y){FB=E4;E4=E5;E5=FB;E8="r"}E9=FC.bisect(E4,E5);E0=Ew.createHalfEdge(E9,E8);Ew.insert(Ey,E0);FC.endPoint(E9,Bs[E8],E2);E7=FC.intersect(Ey,E0);if(E7){Ev.del(Ey);Ev.insert(Ey,E7,FC.distance(E7,E4))}E7=FC.intersect(E0,FA);if(E7){Ev.insert(E0,E7,FC.distance(E7,E4))}}else{break}}}for(E6=Ew.right(Ew.leftEnd);E6!=Ew.rightEnd;E6=Ew.right(E6)){Ex(E6.edge)}}d3.geom.delaunay=function(Ev){var e=Ev.map(function(){return[]}),Ew=[];D6(Ev,function(Ex){e[Ex.region.l.index].push(Ev[Ex.region.r.index])});e.forEach(function(E2,E1){var Ez=Ev[E1],Ey=Ez[0],E3=Ez[1];E2.forEach(function(E4){E4.angle=Math.atan2(E4[0]-Ey,E4[1]-E3)});E2.sort(function(E5,E4){return E5.angle-E4.angle});for(var E0=0,Ex=E2.length-1;E0<Ex;E0++){Ew.push([Ez,E2[E0],E2[E0+1]])}});return Ew};d3.geom.quadtree=function(E3,Ew,E2,e,E1){var Ev,Ey=-1,Ex=E3.length;if(Ex&&isNaN(E3[0].x)){E3=E3.map(l)}if(arguments.length<5){if(arguments.length===3){E1=e=E2;E2=Ew}else{Ew=E2=Infinity;e=E1=-Infinity;while(++Ey<Ex){Ev=E3[Ey];if(Ev.x<Ew){Ew=Ev.x}if(Ev.y<E2){E2=Ev.y}if(Ev.x>e){e=Ev.x}if(Ev.y>E1){E1=Ev.y}}var E6=e-Ew,E5=E1-E2;if(E6>E5){E1=E2+E6}else{e=Ew+E5}}}function E4(FD,FC,E9,FB,E8,FA){if(isNaN(FC.x)||isNaN(FC.y)){return}if(FD.leaf){var E7=FD.point;if(E7){if((Math.abs(E7.x-FC.x)+Math.abs(E7.y-FC.y))<0.01){Ez(FD,FC,E9,FB,E8,FA)}else{FD.point=null;Ez(FD,E7,E9,FB,E8,FA);Ez(FD,FC,E9,FB,E8,FA)}}else{FD.point=FC}}else{Ez(FD,FC,E9,FB,E8,FA)}}function Ez(FB,E9,FA,FG,E8,FE){var FF=(FA+E8)*0.5,FD=(FG+FE)*0.5,FH=E9.x>=FF,E7=E9.y>=FD,FC=(E7<<1)+FH;FB.leaf=false;FB=FB.nodes[FC]||(FB.nodes[FC]=DP());if(FH){FA=FF}else{E8=FF}if(E7){FG=FD}else{FE=FD}E4(FB,E9,FA,FG,E8,FE)}var E0=DP();E0.add=function(E7){E4(E0,E7,Ew,E2,e,E1)};E0.visit=function(E7){BS(E7,E0,Ew,E2,e,E1)};E3.forEach(E0.add);return E0};function DP(){return{leaf:true,nodes:[],point:null}}function BS(Ey,Ex,Ev,E2,e,E0){if(!Ey(Ex,Ev,E2,e,E0)){var E1=(Ev+e)*0.5,Ez=(E2+E0)*0.5,Ew=Ex.nodes;if(Ew[0]){BS(Ey,Ew[0],Ev,E2,E1,Ez)}if(Ew[1]){BS(Ey,Ew[1],E1,E2,e,Ez)}if(Ew[2]){BS(Ey,Ew[2],Ev,Ez,E1,E0)}if(Ew[3]){BS(Ey,Ew[3],E1,Ez,e,E0)}}}function l(e){return{x:e[0],y:e[1]}}d3.time={};var DO=Date;function EG(){this._=new Date(arguments.length>1?Date.UTC.apply(this,arguments):arguments[0])}EG.prototype={getDate:function(){return this._.getUTCDate()},getDay:function(){return this._.getUTCDay()},getFullYear:function(){return this._.getUTCFullYear()},getHours:function(){return this._.getUTCHours()},getMilliseconds:function(){return this._.getUTCMilliseconds()},getMinutes:function(){return this._.getUTCMinutes()},getMonth:function(){return this._.getUTCMonth()},getSeconds:function(){return this._.getUTCSeconds()},getTime:function(){return this._.getTime()},getTimezoneOffset:function(){return 0},valueOf:function(){return this._.valueOf()},setDate:function(){DZ.setUTCDate.apply(this._,arguments)},setDay:function(){DZ.setUTCDay.apply(this._,arguments)},setFullYear:function(){DZ.setUTCFullYear.apply(this._,arguments)},setHours:function(){DZ.setUTCHours.apply(this._,arguments)},setMilliseconds:function(){DZ.setUTCMilliseconds.apply(this._,arguments)},setMinutes:function(){DZ.setUTCMinutes.apply(this._,arguments)},setMonth:function(){DZ.setUTCMonth.apply(this._,arguments)},setSeconds:function(){DZ.setUTCSeconds.apply(this._,arguments)},setTime:function(){DZ.setTime.apply(this._,arguments)}};var DZ=Date.prototype;d3.time.format=function(e){var Ew=e.length;function Ev(Ez){var Ey=[],E0=-1,Ex=0,E2,E1;while(++E0<Ew){if(e.charCodeAt(E0)==37){Ey.push(e.substring(Ex,E0),(E1=Dt[E2=e.charAt(++E0)])?E1(Ez):E2);Ex=E0+1}}Ey.push(e.substring(Ex,E0));return Ey.join("")}Ev.parse=function(Ey){var E0={y:1900,m:0,d:1,H:0,M:0,S:0,L:0},Ez=CG(E0,e,Ey,0);if(Ez!=Ey.length){return null}if("p" in E0){E0.H=E0.H%12+E0.p*12}var Ex=new DO();Ex.setFullYear(E0.y,E0.m,E0.d);Ex.setHours(E0.H,E0.M,E0.S,E0.L);return Ex};Ev.toString=function(){return e};return Ev};function CG(Ex,E2,E0,Ey){var E1,e,Ez=0,Ev=E2.length,Ew=E0.length;while(Ez<Ev){if(Ey>=Ew){return -1}E1=E2.charCodeAt(Ez++);if(E1==37){e=Ej[E2.charAt(Ez++)];if(!e||((Ey=e(Ex,E0,Ey))<0)){return -1}}else{if(E1!=E0.charCodeAt(Ey++)){return -1}}}return Ey}var As=d3.format("02d"),Ar=d3.format("03d"),Aq=d3.format("04d"),Ao=d3.format("2d");var Dt={a:function(e){return d3_time_weekdays[e.getDay()].substring(0,3)},A:function(e){return d3_time_weekdays[e.getDay()]},b:function(e){return BD[e.getMonth()].substring(0,3)},B:function(e){return BD[e.getMonth()]},c:d3.time.format("%a %b %e %H:%M:%S %Y"),d:function(e){return As(e.getDate())},e:function(e){return Ao(e.getDate())},H:function(e){return As(e.getHours())},I:function(e){return As(e.getHours()%12||12)},j:function(e){return Ar(1+d3.time.dayOfYear(e))},L:function(e){return Ar(e.getMilliseconds())},m:function(e){return As(e.getMonth()+1)},M:function(e){return As(e.getMinutes())},p:function(e){return e.getHours()>=12?"PM":"AM"},S:function(e){return As(e.getSeconds())},U:function(e){return As(d3.time.sundayOfYear(e))},w:function(e){return e.getDay()},W:function(e){return As(d3.time.mondayOfYear(e))},x:d3.time.format("%m/%d/%y"),X:d3.time.format("%H:%M:%S"),y:function(e){return As(e.getFullYear()%100)},Y:function(e){return Aq(e.getFullYear()%10000)},Z:DW,"%":function(e){return"%"}};var Ej={a:EF,A:BO,b:AV,B:Cl,c:CS,d:A3,e:A3,H:AN,I:AN,L:EB,m:D2,M:BY,p:Ea,S:B8,x:Et,X:Dz,y:g,Y:Am};function EF(Ev,e,Ew){return C4.test(e.substring(Ew,Ew+=3))?Ew:-1}function BO(Ev,e,Ew){Ay.lastIndex=0;var Ex=Ay.exec(e.substring(Ew,Ew+10));return Ex?Ew+=Ex[0].length:-1}var C4=/^(?:sun|mon|tue|wed|thu|fri|sat)/i,Ay=/^(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)/i;d3_time_weekdays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];function AV(Ev,e,Ew){var Ex=Cp.get(e.substring(Ew,Ew+=3).toLowerCase());return Ex==null?-1:(Ev.m=Ex,Ew)}var Cp=d3.map({jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11});function Cl(Ev,e,Ew){EI.lastIndex=0;var Ex=EI.exec(e.substring(Ew,Ew+12));return Ex?(Ev.m=DG.get(Ex[0].toLowerCase()),Ew+=Ex[0].length):-1}var EI=/^(?:January|February|March|April|May|June|July|August|September|October|November|December)/ig;var DG=d3.map({january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11});var BD=["January","February","March","April","May","June","July","August","September","October","November","December"];function CS(Ev,e,Ew){return CG(Ev,Dt.c.toString(),e,Ew)}function Et(Ev,e,Ew){return CG(Ev,Dt.x.toString(),e,Ew)}function Dz(Ev,e,Ew){return CG(Ev,Dt.X.toString(),e,Ew)}function Am(Ev,e,Ew){Da.lastIndex=0;var Ex=Da.exec(e.substring(Ew,Ew+4));return Ex?(Ev.y=+Ex[0],Ew+=Ex[0].length):-1}function g(Ev,e,Ew){Da.lastIndex=0;var Ex=Da.exec(e.substring(Ew,Ew+2));return Ex?(Ev.y=Aj()+ +Ex[0],Ew+=Ex[0].length):-1}function Aj(){return ~~(new Date().getFullYear()/1000)*1000}function D2(Ev,e,Ew){Da.lastIndex=0;var Ex=Da.exec(e.substring(Ew,Ew+2));return Ex?(Ev.m=Ex[0]-1,Ew+=Ex[0].length):-1}function A3(Ev,e,Ew){Da.lastIndex=0;var Ex=Da.exec(e.substring(Ew,Ew+2));return Ex?(Ev.d=+Ex[0],Ew+=Ex[0].length):-1}function AN(Ev,e,Ew){Da.lastIndex=0;var Ex=Da.exec(e.substring(Ew,Ew+2));return Ex?(Ev.H=+Ex[0],Ew+=Ex[0].length):-1}function BY(Ev,e,Ew){Da.lastIndex=0;var Ex=Da.exec(e.substring(Ew,Ew+2));return Ex?(Ev.M=+Ex[0],Ew+=Ex[0].length):-1}function B8(Ev,e,Ew){Da.lastIndex=0;var Ex=Da.exec(e.substring(Ew,Ew+2));return Ex?(Ev.S=+Ex[0],Ew+=Ex[0].length):-1}function EB(Ev,e,Ew){Da.lastIndex=0;var Ex=Da.exec(e.substring(Ew,Ew+3));return Ex?(Ev.L=+Ex[0],Ew+=Ex[0].length):-1}var Da=/\s*\d+/;function Ea(Ev,e,Ew){var Ex=C.get(e.substring(Ew,Ew+=2).toLowerCase());return Ex==null?-1:(Ev.p=Ex,Ew)}var C=d3.map({am:0,pm:1});function DW(Ey){var Ex=Ey.getTimezoneOffset(),Ew=Ex>0?"-":"+",Ev=~~(Math.abs(Ex)/60),e=Math.abs(Ex)%60;return Ew+As(Ev)+As(e)}d3.time.format.utc=function(Ev){var e=d3.time.format(Ev);function Ew(Ex){try{DO=EG;var Ey=new DO();Ey._=Ex;return e(Ey)}finally{DO=Date}}Ew.parse=function(Ey){try{DO=EG;var Ex=e.parse(Ey);return Ex&&Ex._}finally{DO=Date}};Ew.toString=e.toString;return Ew};var B4=d3.time.format.utc("%Y-%m-%dT%H:%M:%S.%LZ");d3.time.format.iso=Date.prototype.toISOString?Bt:B4;function Bt(e){return e.toISOString()}Bt.parse=function(e){return new Date(e)};Bt.toString=B4.toString;function Ba(Ez,e,Ev){function E2(E3){var E5=Ez(E3),E4=Ex(E5,1);return E3-E5<E4-E3?E5:E4}function E1(E3){e(E3=Ez(new DO(E3-1)),1);return E3}function Ex(E4,E3){e(E4=new DO(+E4),E3);return E4}function Ey(E5,E4,E3){var E6=E1(E5),E7=[];if(E3>1){while(E6<E4){if(!(Ev(E6)%E3)){E7.push(new Date(+E6))}e(E6,1)}}else{while(E6<E4){E7.push(new Date(+E6)),e(E6,1)}}return E7}function Ew(E6,E5,E4){try{DO=EG;var E3=new EG();E3._=E6;return Ey(E3,E5,E4)}finally{DO=Date}}Ez.floor=Ez;Ez.round=E2;Ez.ceil=E1;Ez.offset=Ex;Ez.range=Ey;var E0=Ez.utc=B6(Ez);E0.floor=E0;E0.round=B6(E2);E0.ceil=B6(E1);E0.offset=B6(Ex);E0.range=Ew;return Ez}function B6(e){return function(Ew,Ev){try{DO=EG;var Ex=new EG();Ex._=Ew;return e(Ex,Ev)._}finally{DO=Date}}}d3.time.second=Ba(function(e){return new DO(Math.floor(e/1000)*1000)},function(e,Ev){e.setTime(e.getTime()+Math.floor(Ev)*1000)},function(e){return e.getSeconds()});d3.time.seconds=d3.time.second.range;d3.time.seconds.utc=d3.time.second.utc.range;d3.time.minute=Ba(function(e){return new DO(Math.floor(e/60000)*60000)},function(e,Ev){e.setTime(e.getTime()+Math.floor(Ev)*60000)},function(e){return e.getMinutes()});d3.time.minutes=d3.time.minute.range;d3.time.minutes.utc=d3.time.minute.utc.range;d3.time.hour=Ba(function(e){var Ev=e.getTimezoneOffset()/60;return new DO((Math.floor(e/3600000-Ev)+Ev)*3600000)},function(e,Ev){e.setTime(e.getTime()+Math.floor(Ev)*3600000)},function(e){return e.getHours()});d3.time.hours=d3.time.hour.range;d3.time.hours.utc=d3.time.hour.utc.range;d3.time.day=Ba(function(e){return new DO(e.getFullYear(),e.getMonth(),e.getDate())},function(e,Ev){e.setDate(e.getDate()+Ev)},function(e){return e.getDate()-1});d3.time.days=d3.time.day.range;d3.time.days.utc=d3.time.day.utc.range;d3.time.dayOfYear=function(e){var Ev=d3.time.year(e);return Math.floor((e-Ev)/86400000-(e.getTimezoneOffset()-Ev.getTimezoneOffset())/1440)};d3_time_weekdays.forEach(function(Ev,Ew){Ev=Ev.toLowerCase();Ew=7-Ew;var e=d3.time[Ev]=Ba(function(Ex){(Ex=d3.time.day(Ex)).setDate(Ex.getDate()-(Ex.getDay()+Ew)%7);return Ex},function(Ex,Ey){Ex.setDate(Ex.getDate()+Math.floor(Ey)*7)},function(Ey){var Ex=d3.time.year(Ey).getDay();return Math.floor((d3.time.dayOfYear(Ey)+(Ex+Ew)%7)/7)-(Ex!==Ew)});d3.time[Ev+"s"]=e.range;d3.time[Ev+"s"].utc=e.utc.range;d3.time[Ev+"OfYear"]=function(Ey){var Ex=d3.time.year(Ey).getDay();return Math.floor((d3.time.dayOfYear(Ey)+(Ex+Ew)%7)/7)}});d3.time.week=d3.time.sunday;d3.time.weeks=d3.time.sunday.range;d3.time.weeks.utc=d3.time.sunday.utc.range;d3.time.weekOfYear=d3.time.sundayOfYear;d3.time.month=Ba(function(e){return new DO(e.getFullYear(),e.getMonth(),1)},function(e,Ev){e.setMonth(e.getMonth()+Ev)},function(e){return e.getMonth()});d3.time.months=d3.time.month.range;d3.time.months.utc=d3.time.month.utc.range;d3.time.year=Ba(function(e){return new DO(e.getFullYear(),0,1)},function(e,Ev){e.setFullYear(e.getFullYear()+Ev)},function(e){return e.getFullYear()});d3.time.years=d3.time.year.range;d3.time.years.utc=d3.time.year.utc.range;function Ai(e,Ev,Ew){function Ex(Ey){return e(Ey)}Ex.invert=function(Ey){return DY(e.invert(Ey))};Ex.domain=function(Ey){if(!arguments.length){return e.domain().map(DY)}e.domain(Ey);return Ex};Ex.nice=function(Ey){var Ez=DT(Ex.domain());return Ex.domain([Ey.floor(Ez[0]),Ey.ceil(Ez[1])])};Ex.ticks=function(Ey,Ez){var E2=DT(Ex.domain());if(typeof Ey!=="function"){var E1=E2[1]-E2[0],E3=E1/Ey,E0=d3.bisect(Cx,E3);if(E0==Cx.length){return Ev.year(E2,Ey)}if(!E0){return e.ticks(Ey).map(DY)}if(Math.log(E3/Cx[E0-1])<Math.log(Cx[E0]/E3)){--E0}Ey=Ev[E0];Ez=Ey[1];Ey=Ey[0].range}return Ey(E2[0],new Date(+E2[1]+1),Ez)};Ex.tickFormat=function(){return Ew};Ex.copy=function(){return Ai(e.copy(),Ev,Ew)};return d3.rebind(Ex,e,"range","rangeRound","interpolate","clamp")}function DT(Ev){var Ew=Ev[0],e=Ev[Ev.length-1];return Ew<e?[Ew,e]:[e,Ew]}function DY(e){return new Date(e)}function BX(e){return function(Ev){var Ew=e.length-1,Ex=e[Ew];while(!Ex[1](Ev)){Ex=e[--Ew]}return Ex[0](Ev)}}function CB(Ev){var e=new Date(Ev,0,1);e.setFullYear(Ev);return e}function EH(Ew){var Ex=Ew.getFullYear(),Ev=CB(Ex),e=CB(Ex+1);return Ex+(Ew-Ev)/(e-Ev)}var Cx=[1000,5000,15000,30000,60000,300000,900000,1800000,3600000,10800000,21600000,43200000,86400000,172800000,604800000,2592000000,7776000000,31536000000];var BN=[[d3.time.second,1],[d3.time.second,5],[d3.time.second,15],[d3.time.second,30],[d3.time.minute,1],[d3.time.minute,5],[d3.time.minute,15],[d3.time.minute,30],[d3.time.hour,1],[d3.time.hour,3],[d3.time.hour,6],[d3.time.hour,12],[d3.time.day,1],[d3.time.day,2],[d3.time.week,1],[d3.time.month,1],[d3.time.month,3],[d3.time.year,1]];var DH=[[d3.time.format("%Y"),function(e){return true}],[d3.time.format("%B"),function(e){return e.getMonth()}],[d3.time.format("%b %d"),function(e){return e.getDate()!=1}],[d3.time.format("%a %d"),function(e){return e.getDay()&&e.getDate()!=1}],[d3.time.format("%I %p"),function(e){return e.getHours()}],[d3.time.format("%I:%M"),function(e){return e.getMinutes()}],[d3.time.format(":%S"),function(e){return e.getSeconds()}],[d3.time.format(".%L"),function(e){return e.getMilliseconds()}]];var BL=d3.scale.linear(),m=BX(DH);BN.year=function(Ev,e){return BL.domain(Ev.map(EH)).ticks(e).map(CB)};d3.time.scale=function(){return Ai(d3.scale.linear(),BN,m)};var El=BN.map(function(e){return[e[0].utc,e[1]]});var A9=[[d3.time.format.utc("%Y"),function(e){return true}],[d3.time.format.utc("%B"),function(e){return e.getUTCMonth()}],[d3.time.format.utc("%b %d"),function(e){return e.getUTCDate()!=1}],[d3.time.format.utc("%a %d"),function(e){return e.getUTCDay()&&e.getUTCDate()!=1}],[d3.time.format.utc("%I %p"),function(e){return e.getUTCHours()}],[d3.time.format.utc("%I:%M"),function(e){return e.getUTCMinutes()}],[d3.time.format.utc(":%S"),function(e){return e.getUTCSeconds()}],[d3.time.format.utc(".%L"),function(e){return e.getUTCMilliseconds()}]];var Co=BX(A9);function Be(Ev){var e=new Date(Date.UTC(Ev,0,1));e.setUTCFullYear(Ev);return e}function Di(Ew){var Ex=Ew.getUTCFullYear(),Ev=Be(Ex),e=Be(Ex+1);return Ex+(Ew-Ev)/(e-Ev)}El.year=function(Ev,e){return BL.domain(Ev.map(Di)).ticks(e).map(Be)};d3.time.scale.utc=function(){return Ai(d3.scale.linear(),El,Co)}})();var Box2D={};(function(C,B){function A(){}if(!(Object.prototype.defineProperty instanceof Function)&&Object.prototype.__defineGetter__ instanceof Function&&Object.prototype.__defineSetter__ instanceof Function){Object.defineProperty=function(F,E,D){D.get instanceof Function&&F.__defineGetter__(E,D.get);D.set instanceof Function&&F.__defineSetter__(E,D.set)}}C.inherit=function(E,D){A.prototype=D.prototype;E.prototype=new A;E.prototype.constructor=E};C.generateCallback=function(E,D){return function(){D.apply(E,arguments)}};C.NVector=function(F){if(F===B){F=0}for(var E=Array(F||0),D=0;D<F;++D){E[D]=0}return E};C.is=function(E,D){if(E===null){return false}if(D instanceof Function&&E instanceof D){return true}if(E.constructor.__implements!=B&&E.constructor.__implements[D]){return true}return false};C.parseUInt=function(D){return Math.abs(parseInt(D))}})(Box2D);var Vector=Array,Vector_a2j_Number=Box2D.NVector;if(typeof Box2D==="undefined"){Box2D={}}if(typeof Box2D.Collision==="undefined"){Box2D.Collision={}}if(typeof Box2D.Collision.Shapes==="undefined"){Box2D.Collision.Shapes={}}if(typeof Box2D.Common==="undefined"){Box2D.Common={}}if(typeof Box2D.Common.Math==="undefined"){Box2D.Common.Math={}}if(typeof Box2D.Dynamics==="undefined"){Box2D.Dynamics={}}if(typeof Box2D.Dynamics.Contacts==="undefined"){Box2D.Dynamics.Contacts={}}if(typeof Box2D.Dynamics.Controllers==="undefined"){Box2D.Dynamics.Controllers={}}if(typeof Box2D.Dynamics.Joints==="undefined"){Box2D.Dynamics.Joints={}}(function(){function BN(){BN.b2AABB.apply(this,arguments)}function BM(){BM.b2Bound.apply(this,arguments)}function BG(){BG.b2BoundValues.apply(this,arguments);this.constructor===BG&&this.b2BoundValues.apply(this,arguments)}function AS(){AS.b2Collision.apply(this,arguments)}function AV(){AV.b2ContactID.apply(this,arguments);this.constructor===AV&&this.b2ContactID.apply(this,arguments)}function BU(){BU.b2ContactPoint.apply(this,arguments)}function A5(){A5.b2Distance.apply(this,arguments)}function Ad(){Ad.b2DistanceInput.apply(this,arguments)}function BT(){BT.b2DistanceOutput.apply(this,arguments)}function A9(){A9.b2DistanceProxy.apply(this,arguments)}function A4(){A4.b2DynamicTree.apply(this,arguments);this.constructor===A4&&this.b2DynamicTree.apply(this,arguments)}function BE(){BE.b2DynamicTreeBroadPhase.apply(this,arguments)}function BF(){BF.b2DynamicTreeNode.apply(this,arguments)}function BK(){BK.b2DynamicTreePair.apply(this,arguments)}function A3(){A3.b2Manifold.apply(this,arguments);this.constructor===A3&&this.b2Manifold.apply(this,arguments)}function A1(){A1.b2ManifoldPoint.apply(this,arguments);this.constructor===A1&&this.b2ManifoldPoint.apply(this,arguments)}function Aj(){Aj.b2Point.apply(this,arguments)}function AR(){AR.b2RayCastInput.apply(this,arguments);this.constructor===AR&&this.b2RayCastInput.apply(this,arguments)}function AX(){AX.b2RayCastOutput.apply(this,arguments)}function BQ(){BQ.b2Segment.apply(this,arguments)}function BL(){BL.b2SeparationFunction.apply(this,arguments)}function BC(){BC.b2Simplex.apply(this,arguments);this.constructor===BC&&this.b2Simplex.apply(this,arguments)}function BP(){BP.b2SimplexCache.apply(this,arguments)}function A8(){A8.b2SimplexVertex.apply(this,arguments)}function BD(){BD.b2TimeOfImpact.apply(this,arguments)}function A7(){A7.b2TOIInput.apply(this,arguments)}function BZ(){BZ.b2WorldManifold.apply(this,arguments);this.constructor===BZ&&this.b2WorldManifold.apply(this,arguments)}function Az(){Az.ClipVertex.apply(this,arguments)}function As(){As.Features.apply(this,arguments)}function An(){An.b2CircleShape.apply(this,arguments);this.constructor===An&&this.b2CircleShape.apply(this,arguments)}function Ai(){Ai.b2EdgeChainDef.apply(this,arguments);this.constructor===Ai&&this.b2EdgeChainDef.apply(this,arguments)}function Ak(){Ak.b2EdgeShape.apply(this,arguments);this.constructor===Ak&&this.b2EdgeShape.apply(this,arguments)}function Ae(){Ae.b2MassData.apply(this,arguments)}function Ac(){Ac.b2PolygonShape.apply(this,arguments);this.constructor===Ac&&this.b2PolygonShape.apply(this,arguments)}function Af(){Af.b2Shape.apply(this,arguments);this.constructor===Af&&this.b2Shape.apply(this,arguments)}function Aw(){Aw.b2Color.apply(this,arguments);this.constructor===Aw&&this.b2Color.apply(this,arguments)}function At(){At.b2Settings.apply(this,arguments)}function Ao(){Ao.b2Mat22.apply(this,arguments);this.constructor===Ao&&this.b2Mat22.apply(this,arguments)}function Av(){Av.b2Mat33.apply(this,arguments);this.constructor===Av&&this.b2Mat33.apply(this,arguments)}function Aq(){Aq.b2Math.apply(this,arguments)}function Ap(){Ap.b2Sweep.apply(this,arguments)}function Ah(){Ah.b2Transform.apply(this,arguments);this.constructor===Ah&&this.b2Transform.apply(this,arguments)}function Ab(){Ab.b2Vec2.apply(this,arguments);this.constructor===Ab&&this.b2Vec2.apply(this,arguments)}function AZ(){AZ.b2Vec3.apply(this,arguments);this.constructor===AZ&&this.b2Vec3.apply(this,arguments)}function AW(){AW.b2Body.apply(this,arguments);this.constructor===AW&&this.b2Body.apply(this,arguments)}function AY(){AY.b2BodyDef.apply(this,arguments);this.constructor===AY&&this.b2BodyDef.apply(this,arguments)}function AU(){AU.b2ContactFilter.apply(this,arguments)}function BS(){BS.b2ContactImpulse.apply(this,arguments)}function BH(){BH.b2ContactListener.apply(this,arguments)}function A6(){A6.b2ContactManager.apply(this,arguments);this.constructor===A6&&this.b2ContactManager.apply(this,arguments)}function BA(){BA.b2DebugDraw.apply(this,arguments);this.constructor===BA&&this.b2DebugDraw.apply(this,arguments)}function A2(){A2.b2DestructionListener.apply(this,arguments)}function Bf(){Bf.b2FilterData.apply(this,arguments)}function BB(){BB.b2Fixture.apply(this,arguments);this.constructor===BB&&this.b2Fixture.apply(this,arguments)}function Ag(){Ag.b2FixtureDef.apply(this,arguments);this.constructor===Ag&&this.b2FixtureDef.apply(this,arguments)}function AK(){AK.b2Island.apply(this,arguments);this.constructor===AK&&this.b2Island.apply(this,arguments)}function AE(){AE.b2TimeStep.apply(this,arguments)}function AC(){AC.b2World.apply(this,arguments);this.constructor===AC&&this.b2World.apply(this,arguments)}function Bn(){Bn.b2CircleContact.apply(this,arguments)}function Bk(){Bk.b2Contact.apply(this,arguments);this.constructor===Bk&&this.b2Contact.apply(this,arguments)}function Bb(){Bb.b2ContactConstraint.apply(this,arguments);this.constructor===Bb&&this.b2ContactConstraint.apply(this,arguments)}function Be(){Be.b2ContactConstraintPoint.apply(this,arguments)}function BR(){BR.b2ContactEdge.apply(this,arguments)}function BI(){BI.b2ContactFactory.apply(this,arguments);this.constructor===BI&&this.b2ContactFactory.apply(this,arguments)}function Au(){Au.b2ContactRegister.apply(this,arguments)}function AO(){AO.b2ContactResult.apply(this,arguments)}function Al(){Al.b2ContactSolver.apply(this,arguments);this.constructor===Al&&this.b2ContactSolver.apply(this,arguments)}function AG(){AG.b2EdgeAndCircleContact.apply(this,arguments)}function AL(){AL.b2NullContact.apply(this,arguments);this.constructor===AL&&this.b2NullContact.apply(this,arguments)}function Bp(){Bp.b2PolyAndCircleContact.apply(this,arguments)}function Bh(){Bh.b2PolyAndEdgeContact.apply(this,arguments)}function BW(){BW.b2PolygonContact.apply(this,arguments)}function AD(){AD.b2PositionSolverManifold.apply(this,arguments);this.constructor===AD&&this.b2PositionSolverManifold.apply(this,arguments)}function Ay(){Ay.b2BuoyancyController.apply(this,arguments)}function AQ(){AQ.b2ConstantAccelController.apply(this,arguments)}function AI(){AI.b2ConstantForceController.apply(this,arguments)}function AB(){AB.b2Controller.apply(this,arguments)}function Bj(){Bj.b2ControllerEdge.apply(this,arguments)}function BY(){BY.b2GravityController.apply(this,arguments)}function A0(){A0.b2TensorDampingController.apply(this,arguments)}function Bm(){Bm.b2DistanceJoint.apply(this,arguments);this.constructor===Bm&&this.b2DistanceJoint.apply(this,arguments)}function Bd(){Bd.b2DistanceJointDef.apply(this,arguments);this.constructor===Bd&&this.b2DistanceJointDef.apply(this,arguments)}function BO(){BO.b2FrictionJoint.apply(this,arguments);this.constructor===BO&&this.b2FrictionJoint.apply(this,arguments)}function Ar(){Ar.b2FrictionJointDef.apply(this,arguments);this.constructor===Ar&&this.b2FrictionJointDef.apply(this,arguments)}function AN(){AN.b2GearJoint.apply(this,arguments);this.constructor===AN&&this.b2GearJoint.apply(this,arguments)}function AF(){AF.b2GearJointDef.apply(this,arguments);this.constructor===AF&&this.b2GearJointDef.apply(this,arguments)}function AT(){AT.b2Jacobian.apply(this,arguments)}function Bo(){Bo.b2Joint.apply(this,arguments);this.constructor===Bo&&this.b2Joint.apply(this,arguments)}function Bg(){Bg.b2JointDef.apply(this,arguments);this.constructor===Bg&&this.b2JointDef.apply(this,arguments)}function AJ(){AJ.b2JointEdge.apply(this,arguments)}function BV(){BV.b2LineJoint.apply(this,arguments);this.constructor===BV&&this.b2LineJoint.apply(this,arguments)}function Ax(){Ax.b2LineJointDef.apply(this,arguments);this.constructor===Ax&&this.b2LineJointDef.apply(this,arguments)}function AP(){AP.b2MouseJoint.apply(this,arguments);this.constructor===AP&&this.b2MouseJoint.apply(this,arguments)}function AH(){AH.b2MouseJointDef.apply(this,arguments);this.constructor===AH&&this.b2MouseJointDef.apply(this,arguments)}function AA(){AA.b2PrismaticJoint.apply(this,arguments);this.constructor===AA&&this.b2PrismaticJoint.apply(this,arguments)}function Bi(){Bi.b2PrismaticJointDef.apply(this,arguments);this.constructor===Bi&&this.b2PrismaticJointDef.apply(this,arguments)}function BX(){BX.b2PulleyJoint.apply(this,arguments);this.constructor===BX&&this.b2PulleyJoint.apply(this,arguments)}function Bl(){Bl.b2PulleyJointDef.apply(this,arguments);this.constructor===Bl&&this.b2PulleyJointDef.apply(this,arguments)}function Bc(){Bc.b2RevoluteJoint.apply(this,arguments);this.constructor===Bc&&this.b2RevoluteJoint.apply(this,arguments)}function BJ(){BJ.b2RevoluteJointDef.apply(this,arguments);this.constructor===BJ&&this.b2RevoluteJointDef.apply(this,arguments)}function Am(){Am.b2WeldJoint.apply(this,arguments);this.constructor===Am&&this.b2WeldJoint.apply(this,arguments)}function AM(){AM.b2WeldJointDef.apply(this,arguments);this.constructor===AM&&this.b2WeldJointDef.apply(this,arguments)}Box2D.Collision.IBroadPhase="Box2D.Collision.IBroadPhase";Box2D.Collision.b2AABB=BN;Box2D.Collision.b2Bound=BM;Box2D.Collision.b2BoundValues=BG;Box2D.Collision.b2Collision=AS;Box2D.Collision.b2ContactID=AV;Box2D.Collision.b2ContactPoint=BU;Box2D.Collision.b2Distance=A5;Box2D.Collision.b2DistanceInput=Ad;Box2D.Collision.b2DistanceOutput=BT;Box2D.Collision.b2DistanceProxy=A9;Box2D.Collision.b2DynamicTree=A4;Box2D.Collision.b2DynamicTreeBroadPhase=BE;Box2D.Collision.b2DynamicTreeNode=BF;Box2D.Collision.b2DynamicTreePair=BK;Box2D.Collision.b2Manifold=A3;Box2D.Collision.b2ManifoldPoint=A1;Box2D.Collision.b2Point=Aj;Box2D.Collision.b2RayCastInput=AR;Box2D.Collision.b2RayCastOutput=AX;Box2D.Collision.b2Segment=BQ;Box2D.Collision.b2SeparationFunction=BL;Box2D.Collision.b2Simplex=BC;Box2D.Collision.b2SimplexCache=BP;Box2D.Collision.b2SimplexVertex=A8;Box2D.Collision.b2TimeOfImpact=BD;Box2D.Collision.b2TOIInput=A7;Box2D.Collision.b2WorldManifold=BZ;Box2D.Collision.ClipVertex=Az;Box2D.Collision.Features=As;Box2D.Collision.Shapes.b2CircleShape=An;Box2D.Collision.Shapes.b2EdgeChainDef=Ai;Box2D.Collision.Shapes.b2EdgeShape=Ak;Box2D.Collision.Shapes.b2MassData=Ae;Box2D.Collision.Shapes.b2PolygonShape=Ac;Box2D.Collision.Shapes.b2Shape=Af;Box2D.Common.b2internal="Box2D.Common.b2internal";Box2D.Common.b2Color=Aw;Box2D.Common.b2Settings=At;Box2D.Common.Math.b2Mat22=Ao;Box2D.Common.Math.b2Mat33=Av;Box2D.Common.Math.b2Math=Aq;Box2D.Common.Math.b2Sweep=Ap;Box2D.Common.Math.b2Transform=Ah;Box2D.Common.Math.b2Vec2=Ab;Box2D.Common.Math.b2Vec3=AZ;Box2D.Dynamics.b2Body=AW;Box2D.Dynamics.b2BodyDef=AY;Box2D.Dynamics.b2ContactFilter=AU;Box2D.Dynamics.b2ContactImpulse=BS;Box2D.Dynamics.b2ContactListener=BH;Box2D.Dynamics.b2ContactManager=A6;Box2D.Dynamics.b2DebugDraw=BA;Box2D.Dynamics.b2DestructionListener=A2;Box2D.Dynamics.b2FilterData=Bf;Box2D.Dynamics.b2Fixture=BB;Box2D.Dynamics.b2FixtureDef=Ag;Box2D.Dynamics.b2Island=AK;Box2D.Dynamics.b2TimeStep=AE;Box2D.Dynamics.b2World=AC;Box2D.Dynamics.Contacts.b2CircleContact=Bn;Box2D.Dynamics.Contacts.b2Contact=Bk;Box2D.Dynamics.Contacts.b2ContactConstraint=Bb;Box2D.Dynamics.Contacts.b2ContactConstraintPoint=Be;Box2D.Dynamics.Contacts.b2ContactEdge=BR;Box2D.Dynamics.Contacts.b2ContactFactory=BI;Box2D.Dynamics.Contacts.b2ContactRegister=Au;Box2D.Dynamics.Contacts.b2ContactResult=AO;Box2D.Dynamics.Contacts.b2ContactSolver=Al;Box2D.Dynamics.Contacts.b2EdgeAndCircleContact=AG;Box2D.Dynamics.Contacts.b2NullContact=AL;Box2D.Dynamics.Contacts.b2PolyAndCircleContact=Bp;Box2D.Dynamics.Contacts.b2PolyAndEdgeContact=Bh;Box2D.Dynamics.Contacts.b2PolygonContact=BW;Box2D.Dynamics.Contacts.b2PositionSolverManifold=AD;Box2D.Dynamics.Controllers.b2BuoyancyController=Ay;Box2D.Dynamics.Controllers.b2ConstantAccelController=AQ;Box2D.Dynamics.Controllers.b2ConstantForceController=AI;Box2D.Dynamics.Controllers.b2Controller=AB;Box2D.Dynamics.Controllers.b2ControllerEdge=Bj;Box2D.Dynamics.Controllers.b2GravityController=BY;Box2D.Dynamics.Controllers.b2TensorDampingController=A0;Box2D.Dynamics.Joints.b2DistanceJoint=Bm;Box2D.Dynamics.Joints.b2DistanceJointDef=Bd;Box2D.Dynamics.Joints.b2FrictionJoint=BO;Box2D.Dynamics.Joints.b2FrictionJointDef=Ar;Box2D.Dynamics.Joints.b2GearJoint=AN;Box2D.Dynamics.Joints.b2GearJointDef=AF;Box2D.Dynamics.Joints.b2Jacobian=AT;Box2D.Dynamics.Joints.b2Joint=Bo;Box2D.Dynamics.Joints.b2JointDef=Bg;Box2D.Dynamics.Joints.b2JointEdge=AJ;Box2D.Dynamics.Joints.b2LineJoint=BV;Box2D.Dynamics.Joints.b2LineJointDef=Ax;Box2D.Dynamics.Joints.b2MouseJoint=AP;Box2D.Dynamics.Joints.b2MouseJointDef=AH;Box2D.Dynamics.Joints.b2PrismaticJoint=AA;Box2D.Dynamics.Joints.b2PrismaticJointDef=Bi;Box2D.Dynamics.Joints.b2PulleyJoint=BX;Box2D.Dynamics.Joints.b2PulleyJointDef=Bl;Box2D.Dynamics.Joints.b2RevoluteJoint=Bc;Box2D.Dynamics.Joints.b2RevoluteJointDef=BJ;Box2D.Dynamics.Joints.b2WeldJoint=Am;Box2D.Dynamics.Joints.b2WeldJointDef=AM})();Box2D.postDefs=[];(function(){var AF=Box2D.Collision.Shapes.b2CircleShape,AE=Box2D.Collision.Shapes.b2PolygonShape,AB=Box2D.Collision.Shapes.b2Shape,AM=Box2D.Common.b2Settings,AN=Box2D.Common.Math.b2Math,AJ=Box2D.Common.Math.b2Sweep,X=Box2D.Common.Math.b2Transform,AQ=Box2D.Common.Math.b2Vec2,AI=Box2D.Collision.b2AABB,f=Box2D.Collision.b2Bound,T=Box2D.Collision.b2BoundValues,x=Box2D.Collision.b2Collision,AA=Box2D.Collision.b2ContactID,AC=Box2D.Collision.b2ContactPoint,P=Box2D.Collision.b2Distance,J=Box2D.Collision.b2DistanceInput,AU=Box2D.Collision.b2DistanceOutput,AL=Box2D.Collision.b2DistanceProxy,AO=Box2D.Collision.b2DynamicTree,AH=Box2D.Collision.b2DynamicTreeBroadPhase,AD=Box2D.Collision.b2DynamicTreeNode,m=Box2D.Collision.b2DynamicTreePair,AG=Box2D.Collision.b2Manifold,e=Box2D.Collision.b2ManifoldPoint,t=Box2D.Collision.b2Point,b=Box2D.Collision.b2RayCastInput,AK=Box2D.Collision.b2RayCastOutput,C=Box2D.Collision.b2Segment,AY=Box2D.Collision.b2SeparationFunction,AW=Box2D.Collision.b2Simplex,AT=Box2D.Collision.b2SimplexCache,AV=Box2D.Collision.b2SimplexVertex,AR=Box2D.Collision.b2TimeOfImpact,AP=Box2D.Collision.b2TOIInput,AS=Box2D.Collision.b2WorldManifold,Aa=Box2D.Collision.ClipVertex,AZ=Box2D.Collision.Features,AX=Box2D.Collision.IBroadPhase;AI.b2AABB=function(){this.lowerBound=new AQ;this.upperBound=new AQ};AI.prototype.IsValid=function(){var A=this.upperBound.y-this.lowerBound.y;return A=(A=this.upperBound.x-this.lowerBound.x>=0&&A>=0)&&this.lowerBound.IsValid()&&this.upperBound.IsValid()};AI.prototype.GetCenter=function(){return new AQ((this.lowerBound.x+this.upperBound.x)/2,(this.lowerBound.y+this.upperBound.y)/2)};AI.prototype.GetExtents=function(){return new AQ((this.upperBound.x-this.lowerBound.x)/2,(this.upperBound.y-this.lowerBound.y)/2)};AI.prototype.Contains=function(A){var B=true;return B=(B=(B=(B=B&&this.lowerBound.x<=A.lowerBound.x)&&this.lowerBound.y<=A.lowerBound.y)&&A.upperBound.x<=this.upperBound.x)&&A.upperBound.y<=this.upperBound.y};AI.prototype.RayCast=function(I,H){var G=-Number.MAX_VALUE,D=Number.MAX_VALUE,A=H.p1.x,O=H.p1.y,M=H.p2.x-H.p1.x,N=H.p2.y-H.p1.y,L=Math.abs(N),B=I.normal,K=0,E=0,F=K=0;F=0;if(Math.abs(M)<Number.MIN_VALUE){if(A<this.lowerBound.x||this.upperBound.x<A){return false}}else{K=1/M;E=(this.lowerBound.x-A)*K;K=(this.upperBound.x-A)*K;F=-1;if(E>K){F=E;E=K;K=F;F=1}if(E>G){B.x=F;B.y=0;G=E}D=Math.min(D,K);if(G>D){return false}}if(L<Number.MIN_VALUE){if(O<this.lowerBound.y||this.upperBound.y<O){return false}}else{K=1/N;E=(this.lowerBound.y-O)*K;K=(this.upperBound.y-O)*K;F=-1;if(E>K){F=E;E=K;K=F;F=1}if(E>G){B.y=F;B.x=0;G=E}D=Math.min(D,K);if(G>D){return false}}I.fraction=G;return true};AI.prototype.TestOverlap=function(A){var D=A.lowerBound.y-this.upperBound.y,B=this.lowerBound.y-A.upperBound.y;if(A.lowerBound.x-this.upperBound.x>0||D>0){return false}if(this.lowerBound.x-A.upperBound.x>0||B>0){return false}return true};AI.Combine=function(A,D){var B=new AI;B.Combine(A,D);return B};AI.prototype.Combine=function(A,B){this.lowerBound.x=Math.min(A.lowerBound.x,B.lowerBound.x);this.lowerBound.y=Math.min(A.lowerBound.y,B.lowerBound.y);this.upperBound.x=Math.max(A.upperBound.x,B.upperBound.x);this.upperBound.y=Math.max(A.upperBound.y,B.upperBound.y)};f.b2Bound=function(){};f.prototype.IsLower=function(){return(this.value&1)==0};f.prototype.IsUpper=function(){return(this.value&1)==1};f.prototype.Swap=function(B){var E=this.value,D=this.proxy,A=this.stabbingCount;this.value=B.value;this.proxy=B.proxy;this.stabbingCount=B.stabbingCount;B.value=E;B.proxy=D;B.stabbingCount=A};T.b2BoundValues=function(){};T.prototype.b2BoundValues=function(){this.lowerValues=new Vector_a2j_Number;this.lowerValues[0]=0;this.lowerValues[1]=0;this.upperValues=new Vector_a2j_Number;this.upperValues[0]=0;this.upperValues[1]=0};x.b2Collision=function(){};x.ClipSegmentToLine=function(F,E,D,B){if(B===undefined){B=0}var A,K=0;A=E[0];var H=A.v;A=E[1];var I=A.v,G=D.x*H.x+D.y*H.y-B;A=D.x*I.x+D.y*I.y-B;G<=0&&F[K++].Set(E[0]);A<=0&&F[K++].Set(E[1]);if(G*A<0){D=G/(G-A);A=F[K];A=A.v;A.x=H.x+D*(I.x-H.x);A.y=H.y+D*(I.y-H.y);A=F[K];A.id=(G>0?E[0]:E[1]).id;++K}return K};x.EdgeSeparation=function(K,I,H,E,A){if(H===undefined){H=0}parseInt(K.m_vertexCount);var Q=K.m_vertices;K=K.m_normals;var N=parseInt(E.m_vertexCount),O=E.m_vertices,M,B;M=I.R;B=K[H];K=M.col1.x*B.x+M.col2.x*B.y;E=M.col1.y*B.x+M.col2.y*B.y;M=A.R;var L=M.col1.x*K+M.col1.y*E;M=M.col2.x*K+M.col2.y*E;for(var F=0,G=Number.MAX_VALUE,D=0;D<N;++D){B=O[D];B=B.x*L+B.y*M;if(B<G){G=B;F=D}}B=Q[H];M=I.R;H=I.position.x+(M.col1.x*B.x+M.col2.x*B.y);I=I.position.y+(M.col1.y*B.x+M.col2.y*B.y);B=O[F];M=A.R;Q=A.position.x+(M.col1.x*B.x+M.col2.x*B.y);A=A.position.y+(M.col1.y*B.x+M.col2.y*B.y);Q-=H;A-=I;return Q*K+A*E};x.FindMaxSeparation=function(L,K,I,E,A){var R=parseInt(K.m_vertexCount),O=K.m_normals,Q,N;N=A.R;Q=E.m_centroid;var B=A.position.x+(N.col1.x*Q.x+N.col2.x*Q.y),M=A.position.y+(N.col1.y*Q.x+N.col2.y*Q.y);N=I.R;Q=K.m_centroid;B-=I.position.x+(N.col1.x*Q.x+N.col2.x*Q.y);M-=I.position.y+(N.col1.y*Q.x+N.col2.y*Q.y);N=B*I.R.col1.x+M*I.R.col1.y;M=B*I.R.col2.x+M*I.R.col2.y;B=0;for(var F=-Number.MAX_VALUE,H=0;H<R;++H){Q=O[H];Q=Q.x*N+Q.y*M;if(Q>F){F=Q;B=H}}O=x.EdgeSeparation(K,I,B,E,A);Q=parseInt(B-1>=0?B-1:R-1);N=x.EdgeSeparation(K,I,Q,E,A);M=parseInt(B+1<R?B+1:0);F=x.EdgeSeparation(K,I,M,E,A);var D=H=0,G=0;if(N>O&&N>F){G=-1;H=Q;D=N}else{if(F>O){G=1;H=M;D=F}else{L[0]=B;return O}}for(;;){B=G==-1?H-1>=0?H-1:R-1:H+1<R?H+1:0;O=x.EdgeSeparation(K,I,B,E,A);if(O>D){H=B;D=O}else{break}}L[0]=H;return D};x.FindIncidentEdge=function(H,G,F,D,A,N){if(D===undefined){D=0}parseInt(G.m_vertexCount);var L=G.m_normals,M=parseInt(A.m_vertexCount);G=A.m_vertices;A=A.m_normals;var K;K=F.R;F=L[D];L=K.col1.x*F.x+K.col2.x*F.y;var B=K.col1.y*F.x+K.col2.y*F.y;K=N.R;F=K.col1.x*L+K.col1.y*B;B=K.col2.x*L+K.col2.y*B;L=F;K=0;for(var I=Number.MAX_VALUE,E=0;E<M;++E){F=A[E];F=L*F.x+B*F.y;if(F<I){I=F;K=E}}A=parseInt(K);L=parseInt(A+1<M?A+1:0);M=H[0];F=G[A];K=N.R;M.v.x=N.position.x+(K.col1.x*F.x+K.col2.x*F.y);M.v.y=N.position.y+(K.col1.y*F.x+K.col2.y*F.y);M.id.features.referenceEdge=D;M.id.features.incidentEdge=A;M.id.features.incidentVertex=0;M=H[1];F=G[L];K=N.R;M.v.x=N.position.x+(K.col1.x*F.x+K.col2.x*F.y);M.v.y=N.position.y+(K.col1.y*F.x+K.col2.y*F.y);M.id.features.referenceEdge=D;M.id.features.incidentEdge=L;M.id.features.incidentVertex=1};x.MakeClipPointVector=function(){var A=new Vector(2);A[0]=new Aa;A[1]=new Aa;return A};x.CollidePolygons=function(M,K,I,E,A){var S;M.m_pointCount=0;var Q=K.m_radius+E.m_radius;S=0;x.s_edgeAO[0]=S;var R=x.FindMaxSeparation(x.s_edgeAO,K,I,E,A);S=x.s_edgeAO[0];if(!(R>Q)){var O=0;x.s_edgeBO[0]=O;var B=x.FindMaxSeparation(x.s_edgeBO,E,A,K,I);O=x.s_edgeBO[0];if(!(B>Q)){var N=0,F=0;if(B>0.98*R+0.001){R=E;E=K;K=A;I=I;N=O;M.m_type=AG.e_faceB;F=1}else{R=K;E=E;K=I;I=A;N=S;M.m_type=AG.e_faceA;F=0}S=x.s_incidentEdge;x.FindIncidentEdge(S,R,K,N,E,I);O=parseInt(R.m_vertexCount);A=R.m_vertices;R=A[N];var H;H=N+1<O?A[parseInt(N+1)]:A[0];N=x.s_localTangent;N.Set(H.x-R.x,H.y-R.y);N.Normalize();A=x.s_localNormal;A.x=N.y;A.y=-N.x;E=x.s_planePoint;E.Set(0.5*(R.x+H.x),0.5*(R.y+H.y));B=x.s_tangent;O=K.R;B.x=O.col1.x*N.x+O.col2.x*N.y;B.y=O.col1.y*N.x+O.col2.y*N.y;var D=x.s_tangent2;D.x=-B.x;D.y=-B.y;N=x.s_normal;N.x=B.y;N.y=-B.x;var G=x.s_v11,L=x.s_v12;G.x=K.position.x+(O.col1.x*R.x+O.col2.x*R.y);G.y=K.position.y+(O.col1.y*R.x+O.col2.y*R.y);L.x=K.position.x+(O.col1.x*H.x+O.col2.x*H.y);L.y=K.position.y+(O.col1.y*H.x+O.col2.y*H.y);K=N.x*G.x+N.y*G.y;O=B.x*L.x+B.y*L.y+Q;H=x.s_clipPoints1;R=x.s_clipPoints2;L=0;L=x.ClipSegmentToLine(H,S,D,-B.x*G.x-B.y*G.y+Q);if(!(L<2)){L=x.ClipSegmentToLine(R,H,B,O);if(!(L<2)){M.m_localPlaneNormal.SetV(A);M.m_localPoint.SetV(E);for(E=A=0;E<AM.b2_maxManifoldPoints;++E){S=R[E];if(N.x*S.v.x+N.y*S.v.y-K<=Q){B=M.m_points[A];O=I.R;D=S.v.x-I.position.x;G=S.v.y-I.position.y;B.m_localPoint.x=D*O.col1.x+G*O.col1.y;B.m_localPoint.y=D*O.col2.x+G*O.col2.y;B.m_id.Set(S.id);B.m_id.features.flip=F;++A}}M.m_pointCount=A}}}}};x.CollideCircles=function(B,I,H,A,G){B.m_pointCount=0;var F,D;F=H.R;D=I.m_p;var E=H.position.x+(F.col1.x*D.x+F.col2.x*D.y);H=H.position.y+(F.col1.y*D.x+F.col2.y*D.y);F=G.R;D=A.m_p;E=G.position.x+(F.col1.x*D.x+F.col2.x*D.y)-E;G=G.position.y+(F.col1.y*D.x+F.col2.y*D.y)-H;F=I.m_radius+A.m_radius;if(!(E*E+G*G>F*F)){B.m_type=AG.e_circles;B.m_localPoint.SetV(I.m_p);B.m_localPlaneNormal.SetZero();B.m_pointCount=1;B.m_points[0].m_localPoint.SetV(A.m_p);B.m_points[0].m_id.key=0}};x.CollidePolygonAndCircle=function(K,I,H,E,A){var Q=K.m_pointCount=0,N=0,O,M;M=A.R;O=E.m_p;var B=A.position.y+(M.col1.y*O.x+M.col2.y*O.y);Q=A.position.x+(M.col1.x*O.x+M.col2.x*O.y)-H.position.x;N=B-H.position.y;M=H.R;H=Q*M.col1.x+N*M.col1.y;M=Q*M.col2.x+N*M.col2.y;var L=0;B=-Number.MAX_VALUE;A=I.m_radius+E.m_radius;var F=parseInt(I.m_vertexCount),G=I.m_vertices;I=I.m_normals;for(var D=0;D<F;++D){O=G[D];Q=H-O.x;N=M-O.y;O=I[D];Q=O.x*Q+O.y*N;if(Q>A){return}if(Q>B){B=Q;L=D}}Q=parseInt(L);N=parseInt(Q+1<F?Q+1:0);O=G[Q];G=G[N];if(B<Number.MIN_VALUE){K.m_pointCount=1;K.m_type=AG.e_faceA;K.m_localPlaneNormal.SetV(I[L]);K.m_localPoint.x=0.5*(O.x+G.x);K.m_localPoint.y=0.5*(O.y+G.y)}else{B=(H-G.x)*(O.x-G.x)+(M-G.y)*(O.y-G.y);if((H-O.x)*(G.x-O.x)+(M-O.y)*(G.y-O.y)<=0){if((H-O.x)*(H-O.x)+(M-O.y)*(M-O.y)>A*A){return}K.m_pointCount=1;K.m_type=AG.e_faceA;K.m_localPlaneNormal.x=H-O.x;K.m_localPlaneNormal.y=M-O.y;K.m_localPlaneNormal.Normalize();K.m_localPoint.SetV(O)}else{if(B<=0){if((H-G.x)*(H-G.x)+(M-G.y)*(M-G.y)>A*A){return}K.m_pointCount=1;K.m_type=AG.e_faceA;K.m_localPlaneNormal.x=H-G.x;K.m_localPlaneNormal.y=M-G.y;K.m_localPlaneNormal.Normalize();K.m_localPoint.SetV(G)}else{L=0.5*(O.x+G.x);O=0.5*(O.y+G.y);B=(H-L)*I[Q].x+(M-O)*I[Q].y;if(B>A){return}K.m_pointCount=1;K.m_type=AG.e_faceA;K.m_localPlaneNormal.x=I[Q].x;K.m_localPlaneNormal.y=I[Q].y;K.m_localPlaneNormal.Normalize();K.m_localPoint.Set(L,O)}}}K.m_points[0].m_localPoint.SetV(E.m_p);K.m_points[0].m_id.key=0};x.TestOverlap=function(B,H){var G=H.lowerBound,A=B.upperBound,F=G.x-A.x,E=G.y-A.y;G=B.lowerBound;A=H.upperBound;var D=G.y-A.y;if(F>0||E>0){return false}if(G.x-A.x>0||D>0){return false}return true};Box2D.postDefs.push(function(){Box2D.Collision.b2Collision.s_incidentEdge=x.MakeClipPointVector();Box2D.Collision.b2Collision.s_clipPoints1=x.MakeClipPointVector();Box2D.Collision.b2Collision.s_clipPoints2=x.MakeClipPointVector();Box2D.Collision.b2Collision.s_edgeAO=new Vector_a2j_Number(1);Box2D.Collision.b2Collision.s_edgeBO=new Vector_a2j_Number(1);Box2D.Collision.b2Collision.s_localTangent=new AQ;Box2D.Collision.b2Collision.s_localNormal=new AQ;Box2D.Collision.b2Collision.s_planePoint=new AQ;Box2D.Collision.b2Collision.s_normal=new AQ;Box2D.Collision.b2Collision.s_tangent=new AQ;Box2D.Collision.b2Collision.s_tangent2=new AQ;Box2D.Collision.b2Collision.s_v11=new AQ;Box2D.Collision.b2Collision.s_v12=new AQ;Box2D.Collision.b2Collision.b2CollidePolyTempVec=new AQ;Box2D.Collision.b2Collision.b2_nullFeature=255});AA.b2ContactID=function(){this.features=new AZ};AA.prototype.b2ContactID=function(){this.features._m_id=this};AA.prototype.Set=function(A){this.key=A._key};AA.prototype.Copy=function(){var A=new AA;A.key=this.key;return A};Object.defineProperty(AA.prototype,"key",{enumerable:false,configurable:true,get:function(){return this._key}});Object.defineProperty(AA.prototype,"key",{enumerable:false,configurable:true,set:function(A){if(A===undefined){A=0}this._key=A;this.features._referenceEdge=this._key&255;this.features._incidentEdge=(this._key&65280)>>8&255;this.features._incidentVertex=(this._key&16711680)>>16&255;this.features._flip=(this._key&4278190080)>>24&255}});AC.b2ContactPoint=function(){this.position=new AQ;this.velocity=new AQ;this.normal=new AQ;this.id=new AA};P.b2Distance=function(){};P.Distance=function(M,K,I){++P.b2_gjkCalls;var E=I.proxyA,A=I.proxyB,S=I.transformA,Q=I.transformB,R=P.s_simplex;R.ReadCache(K,E,S,A,Q);var O=R.m_vertices,B=P.s_saveA,N=P.s_saveB,F=0;R.GetClosestPoint().LengthSquared();for(var H=0,D,G=0;G<20;){F=R.m_count;for(H=0;H<F;H++){B[H]=O[H].indexA;N[H]=O[H].indexB}switch(R.m_count){case 1:break;case 2:R.Solve2();break;case 3:R.Solve3();break;default:AM.b2Assert(false)}if(R.m_count==3){break}D=R.GetClosestPoint();D.LengthSquared();H=R.GetSearchDirection();if(H.LengthSquared()<Number.MIN_VALUE*Number.MIN_VALUE){break}D=O[R.m_count];D.indexA=E.GetSupport(AN.MulTMV(S.R,H.GetNegative()));D.wA=AN.MulX(S,E.GetVertex(D.indexA));D.indexB=A.GetSupport(AN.MulTMV(Q.R,H));D.wB=AN.MulX(Q,A.GetVertex(D.indexB));D.w=AN.SubtractVV(D.wB,D.wA);++G;++P.b2_gjkIters;var L=false;for(H=0;H<F;H++){if(D.indexA==B[H]&&D.indexB==N[H]){L=true;break}}if(L){break}++R.m_count}P.b2_gjkMaxIters=AN.Max(P.b2_gjkMaxIters,G);R.GetWitnessPoints(M.pointA,M.pointB);M.distance=AN.SubtractVV(M.pointA,M.pointB).Length();M.iterations=G;R.WriteCache(K);if(I.useRadii){K=E.m_radius;A=A.m_radius;if(M.distance>K+A&&M.distance>Number.MIN_VALUE){M.distance-=K+A;I=AN.SubtractVV(M.pointB,M.pointA);I.Normalize();M.pointA.x+=K*I.x;M.pointA.y+=K*I.y;M.pointB.x-=A*I.x;M.pointB.y-=A*I.y}else{D=new AQ;D.x=0.5*(M.pointA.x+M.pointB.x);D.y=0.5*(M.pointA.y+M.pointB.y);M.pointA.x=M.pointB.x=D.x;M.pointA.y=M.pointB.y=D.y;M.distance=0}}};Box2D.postDefs.push(function(){Box2D.Collision.b2Distance.s_simplex=new AW;Box2D.Collision.b2Distance.s_saveA=new Vector_a2j_Number(3);Box2D.Collision.b2Distance.s_saveB=new Vector_a2j_Number(3)});J.b2DistanceInput=function(){};AU.b2DistanceOutput=function(){this.pointA=new AQ;this.pointB=new AQ};AL.b2DistanceProxy=function(){};AL.prototype.Set=function(A){switch(A.GetType()){case AB.e_circleShape:A=A instanceof AF?A:null;this.m_vertices=new Vector(1,true);this.m_vertices[0]=A.m_p;this.m_count=1;this.m_radius=A.m_radius;break;case AB.e_polygonShape:A=A instanceof AE?A:null;this.m_vertices=A.m_vertices;this.m_count=A.m_vertexCount;this.m_radius=A.m_radius;break;default:AM.b2Assert(false)}};AL.prototype.GetSupport=function(B){for(var F=0,E=this.m_vertices[0].x*B.x+this.m_vertices[0].y*B.y,A=1;A<this.m_count;++A){var D=this.m_vertices[A].x*B.x+this.m_vertices[A].y*B.y;if(D>E){F=A;E=D}}return F};AL.prototype.GetSupportVertex=function(B){for(var F=0,E=this.m_vertices[0].x*B.x+this.m_vertices[0].y*B.y,A=1;A<this.m_count;++A){var D=this.m_vertices[A].x*B.x+this.m_vertices[A].y*B.y;if(D>E){F=A;E=D}}return this.m_vertices[F]};AL.prototype.GetVertexCount=function(){return this.m_count};AL.prototype.GetVertex=function(A){if(A===undefined){A=0}AM.b2Assert(0<=A&&A<this.m_count);return this.m_vertices[A]};AO.b2DynamicTree=function(){};AO.prototype.b2DynamicTree=function(){this.m_freeList=this.m_root=null;this.m_insertionCount=this.m_path=0};AO.prototype.CreateProxy=function(B,F){var E=this.AllocateNode(),A=AM.b2_aabbExtension,D=AM.b2_aabbExtension;E.aabb.lowerBound.x=B.lowerBound.x-A;E.aabb.lowerBound.y=B.lowerBound.y-D;E.aabb.upperBound.x=B.upperBound.x+A;E.aabb.upperBound.y=B.upperBound.y+D;E.userData=F;this.InsertLeaf(E);return E};AO.prototype.DestroyProxy=function(A){this.RemoveLeaf(A);this.FreeNode(A)};AO.prototype.MoveProxy=function(B,E,D){AM.b2Assert(B.IsLeaf());if(B.aabb.Contains(E)){return false}this.RemoveLeaf(B);var A=AM.b2_aabbExtension+AM.b2_aabbMultiplier*(D.x>0?D.x:-D.x);D=AM.b2_aabbExtension+AM.b2_aabbMultiplier*(D.y>0?D.y:-D.y);B.aabb.lowerBound.x=E.lowerBound.x-A;B.aabb.lowerBound.y=E.lowerBound.y-D;B.aabb.upperBound.x=E.upperBound.x+A;B.aabb.upperBound.y=E.upperBound.y+D;this.InsertLeaf(B);return true};AO.prototype.Rebalance=function(B){if(B===undefined){B=0}if(this.m_root!=null){for(var E=0;E<B;E++){for(var D=this.m_root,A=0;D.IsLeaf()==false;){D=this.m_path>>A&1?D.child2:D.child1;A=A+1&31}++this.m_path;this.RemoveLeaf(D);this.InsertLeaf(D)}}};AO.prototype.GetFatAABB=function(A){return A.aabb};AO.prototype.GetUserData=function(A){return A.userData};AO.prototype.Query=function(B,F){if(this.m_root!=null){var E=new Vector,A=0;for(E[A++]=this.m_root;A>0;){var D=E[--A];if(D.aabb.TestOverlap(F)){if(D.IsLeaf()){if(!B(D)){break}}else{E[A++]=D.child1;E[A++]=D.child2}}}}};AO.prototype.RayCast=function(H,G){if(this.m_root!=null){var F=G.p1,D=G.p2,A=AN.SubtractVV(F,D);A.Normalize();A=AN.CrossFV(1,A);var N=AN.AbsV(A),L=G.maxFraction,M=new AI,K=0,B=0;K=F.x+L*(D.x-F.x);B=F.y+L*(D.y-F.y);M.lowerBound.x=Math.min(F.x,K);M.lowerBound.y=Math.min(F.y,B);M.upperBound.x=Math.max(F.x,K);M.upperBound.y=Math.max(F.y,B);var I=new Vector,E=0;for(I[E++]=this.m_root;E>0;){L=I[--E];if(L.aabb.TestOverlap(M)!=false){K=L.aabb.GetCenter();B=L.aabb.GetExtents();if(!(Math.abs(A.x*(F.x-K.x)+A.y*(F.y-K.y))-N.x*B.x-N.y*B.y>0)){if(L.IsLeaf()){K=new b;K.p1=G.p1;K.p2=G.p2;K.maxFraction=G.maxFraction;L=H(K,L);if(L==0){break}if(L>0){K=F.x+L*(D.x-F.x);B=F.y+L*(D.y-F.y);M.lowerBound.x=Math.min(F.x,K);M.lowerBound.y=Math.min(F.y,B);M.upperBound.x=Math.max(F.x,K);M.upperBound.y=Math.max(F.y,B)}}else{I[E++]=L.child1;I[E++]=L.child2}}}}}};AO.prototype.AllocateNode=function(){if(this.m_freeList){var A=this.m_freeList;this.m_freeList=A.parent;A.parent=null;A.child1=null;A.child2=null;return A}return new AD};AO.prototype.FreeNode=function(A){A.parent=this.m_freeList;this.m_freeList=A};AO.prototype.InsertLeaf=function(B){++this.m_insertionCount;if(this.m_root==null){this.m_root=B;this.m_root.parent=null}else{var E=B.aabb.GetCenter(),D=this.m_root;if(D.IsLeaf()==false){do{var A=D.child1;D=D.child2;D=Math.abs((A.aabb.lowerBound.x+A.aabb.upperBound.x)/2-E.x)+Math.abs((A.aabb.lowerBound.y+A.aabb.upperBound.y)/2-E.y)<Math.abs((D.aabb.lowerBound.x+D.aabb.upperBound.x)/2-E.x)+Math.abs((D.aabb.lowerBound.y+D.aabb.upperBound.y)/2-E.y)?A:D}while(D.IsLeaf()==false)}E=D.parent;A=this.AllocateNode();A.parent=E;A.userData=null;A.aabb.Combine(B.aabb,D.aabb);if(E){if(D.parent.child1==D){E.child1=A}else{E.child2=A}A.child1=D;A.child2=B;D.parent=A;B.parent=A;do{if(E.aabb.Contains(A.aabb)){break}E.aabb.Combine(E.child1.aabb,E.child2.aabb);A=E;E=E.parent}while(E)}else{A.child1=D;A.child2=B;D.parent=A;this.m_root=B.parent=A}}};AO.prototype.RemoveLeaf=function(A){if(A==this.m_root){this.m_root=null}else{var D=A.parent,B=D.parent;A=D.child1==A?D.child2:D.child1;if(B){if(B.child1==D){B.child1=A}else{B.child2=A}A.parent=B;for(this.FreeNode(D);B;){D=B.aabb;B.aabb=AI.Combine(B.child1.aabb,B.child2.aabb);if(D.Contains(B.aabb)){break}B=B.parent}}else{this.m_root=A;A.parent=null;this.FreeNode(D)}}};AH.b2DynamicTreeBroadPhase=function(){this.m_tree=new AO;this.m_moveBuffer=new Vector;this.m_pairBuffer=new Vector;this.m_pairCount=0};AH.prototype.CreateProxy=function(A,D){var B=this.m_tree.CreateProxy(A,D);++this.m_proxyCount;this.BufferMove(B);return B};AH.prototype.DestroyProxy=function(A){this.UnBufferMove(A);--this.m_proxyCount;this.m_tree.DestroyProxy(A)};AH.prototype.MoveProxy=function(A,D,B){this.m_tree.MoveProxy(A,D,B)&&this.BufferMove(A)};AH.prototype.TestOverlap=function(B,E){var D=this.m_tree.GetFatAABB(B),A=this.m_tree.GetFatAABB(E);return D.TestOverlap(A)};AH.prototype.GetUserData=function(A){return this.m_tree.GetUserData(A)};AH.prototype.GetFatAABB=function(A){return this.m_tree.GetFatAABB(A)};AH.prototype.GetProxyCount=function(){return this.m_proxyCount};AH.prototype.UpdatePairs=function(B){var H=this;var G=H.m_pairCount=0,A;for(G=0;G<H.m_moveBuffer.length;++G){A=H.m_moveBuffer[G];var F=H.m_tree.GetFatAABB(A);H.m_tree.Query(function(K){if(K==A){return true}if(H.m_pairCount==H.m_pairBuffer.length){H.m_pairBuffer[H.m_pairCount]=new m}var I=H.m_pairBuffer[H.m_pairCount];I.proxyA=K<A?K:A;I.proxyB=K>=A?K:A;++H.m_pairCount;return true},F)}for(G=H.m_moveBuffer.length=0;G<H.m_pairCount;){F=H.m_pairBuffer[G];var E=H.m_tree.GetUserData(F.proxyA),D=H.m_tree.GetUserData(F.proxyB);B(E,D);for(++G;G<H.m_pairCount;){E=H.m_pairBuffer[G];if(E.proxyA!=F.proxyA||E.proxyB!=F.proxyB){break}++G}}};AH.prototype.Query=function(A,B){this.m_tree.Query(A,B)};AH.prototype.RayCast=function(A,B){this.m_tree.RayCast(A,B)};AH.prototype.Validate=function(){};AH.prototype.Rebalance=function(A){if(A===undefined){A=0}this.m_tree.Rebalance(A)};AH.prototype.BufferMove=function(A){this.m_moveBuffer[this.m_moveBuffer.length]=A};AH.prototype.UnBufferMove=function(A){this.m_moveBuffer.splice(parseInt(this.m_moveBuffer.indexOf(A)),1)};AH.prototype.ComparePairs=function(){return 0};AH.__implements={};AH.__implements[AX]=true;AD.b2DynamicTreeNode=function(){this.aabb=new AI};AD.prototype.IsLeaf=function(){return this.child1==null};m.b2DynamicTreePair=function(){};AG.b2Manifold=function(){this.m_pointCount=0};AG.prototype.b2Manifold=function(){this.m_points=new Vector(AM.b2_maxManifoldPoints);for(var A=0;A<AM.b2_maxManifoldPoints;A++){this.m_points[A]=new e}this.m_localPlaneNormal=new AQ;this.m_localPoint=new AQ};AG.prototype.Reset=function(){for(var A=0;A<AM.b2_maxManifoldPoints;A++){(this.m_points[A] instanceof e?this.m_points[A]:null).Reset()}this.m_localPlaneNormal.SetZero();this.m_localPoint.SetZero();this.m_pointCount=this.m_type=0};AG.prototype.Set=function(A){this.m_pointCount=A.m_pointCount;for(var B=0;B<AM.b2_maxManifoldPoints;B++){(this.m_points[B] instanceof e?this.m_points[B]:null).Set(A.m_points[B])}this.m_localPlaneNormal.SetV(A.m_localPlaneNormal);this.m_localPoint.SetV(A.m_localPoint);this.m_type=A.m_type};AG.prototype.Copy=function(){var A=new AG;A.Set(this);return A};Box2D.postDefs.push(function(){Box2D.Collision.b2Manifold.e_circles=1;Box2D.Collision.b2Manifold.e_faceA=2;Box2D.Collision.b2Manifold.e_faceB=4});e.b2ManifoldPoint=function(){this.m_localPoint=new AQ;this.m_id=new AA};e.prototype.b2ManifoldPoint=function(){this.Reset()};e.prototype.Reset=function(){this.m_localPoint.SetZero();this.m_tangentImpulse=this.m_normalImpulse=0;this.m_id.key=0};e.prototype.Set=function(A){this.m_localPoint.SetV(A.m_localPoint);this.m_normalImpulse=A.m_normalImpulse;this.m_tangentImpulse=A.m_tangentImpulse;this.m_id.Set(A.m_id)};t.b2Point=function(){this.p=new AQ};t.prototype.Support=function(){return this.p};t.prototype.GetFirstVertex=function(){return this.p};b.b2RayCastInput=function(){this.p1=new AQ;this.p2=new AQ};b.prototype.b2RayCastInput=function(A,D,B){if(A===undefined){A=null}if(D===undefined){D=null}if(B===undefined){B=1}A&&this.p1.SetV(A);D&&this.p2.SetV(D);this.maxFraction=B};AK.b2RayCastOutput=function(){this.normal=new AQ};C.b2Segment=function(){this.p1=new AQ;this.p2=new AQ};C.prototype.TestSegment=function(H,G,F,D){if(D===undefined){D=0}var A=F.p1,N=F.p2.x-A.x,L=F.p2.y-A.y;F=this.p2.y-this.p1.y;var M=-(this.p2.x-this.p1.x),K=100*Number.MIN_VALUE,B=-(N*F+L*M);if(B>K){var I=A.x-this.p1.x,E=A.y-this.p1.y;A=I*F+E*M;if(0<=A&&A<=D*B){D=-N*E+L*I;if(-K*B<=D&&D<=B*(1+K)){A/=B;D=Math.sqrt(F*F+M*M);F/=D;M/=D;H[0]=A;G.Set(F,M);return true}}}return false};C.prototype.Extend=function(A){this.ExtendForward(A);this.ExtendBackward(A)};C.prototype.ExtendForward=function(A){var D=this.p2.x-this.p1.x,B=this.p2.y-this.p1.y;A=Math.min(D>0?(A.upperBound.x-this.p1.x)/D:D<0?(A.lowerBound.x-this.p1.x)/D:Number.POSITIVE_INFINITY,B>0?(A.upperBound.y-this.p1.y)/B:B<0?(A.lowerBound.y-this.p1.y)/B:Number.POSITIVE_INFINITY);this.p2.x=this.p1.x+D*A;this.p2.y=this.p1.y+B*A};C.prototype.ExtendBackward=function(A){var D=-this.p2.x+this.p1.x,B=-this.p2.y+this.p1.y;A=Math.min(D>0?(A.upperBound.x-this.p2.x)/D:D<0?(A.lowerBound.x-this.p2.x)/D:Number.POSITIVE_INFINITY,B>0?(A.upperBound.y-this.p2.y)/B:B<0?(A.lowerBound.y-this.p2.y)/B:Number.POSITIVE_INFINITY);this.p1.x=this.p2.x+D*A;this.p1.y=this.p2.y+B*A};AY.b2SeparationFunction=function(){this.m_localPoint=new AQ;this.m_axis=new AQ};AY.prototype.Initialize=function(H,G,F,D,A){this.m_proxyA=G;this.m_proxyB=D;var N=parseInt(H.count);AM.b2Assert(0<N&&N<3);var L,M,K,B,I=B=K=D=G=0,E=0;I=0;if(N==1){this.m_type=AY.e_points;L=this.m_proxyA.GetVertex(H.indexA[0]);M=this.m_proxyB.GetVertex(H.indexB[0]);N=L;H=F.R;G=F.position.x+(H.col1.x*N.x+H.col2.x*N.y);D=F.position.y+(H.col1.y*N.x+H.col2.y*N.y);N=M;H=A.R;K=A.position.x+(H.col1.x*N.x+H.col2.x*N.y);B=A.position.y+(H.col1.y*N.x+H.col2.y*N.y);this.m_axis.x=K-G;this.m_axis.y=B-D;this.m_axis.Normalize()}else{if(H.indexB[0]==H.indexB[1]){this.m_type=AY.e_faceA;G=this.m_proxyA.GetVertex(H.indexA[0]);D=this.m_proxyA.GetVertex(H.indexA[1]);M=this.m_proxyB.GetVertex(H.indexB[0]);this.m_localPoint.x=0.5*(G.x+D.x);this.m_localPoint.y=0.5*(G.y+D.y);this.m_axis=AN.CrossVF(AN.SubtractVV(D,G),1);this.m_axis.Normalize();N=this.m_axis;H=F.R;I=H.col1.x*N.x+H.col2.x*N.y;E=H.col1.y*N.x+H.col2.y*N.y;N=this.m_localPoint;H=F.R;G=F.position.x+(H.col1.x*N.x+H.col2.x*N.y);D=F.position.y+(H.col1.y*N.x+H.col2.y*N.y);N=M;H=A.R;K=A.position.x+(H.col1.x*N.x+H.col2.x*N.y);B=A.position.y+(H.col1.y*N.x+H.col2.y*N.y);I=(K-G)*I+(B-D)*E}else{if(H.indexA[0]==H.indexA[0]){this.m_type=AY.e_faceB;K=this.m_proxyB.GetVertex(H.indexB[0]);B=this.m_proxyB.GetVertex(H.indexB[1]);L=this.m_proxyA.GetVertex(H.indexA[0]);this.m_localPoint.x=0.5*(K.x+B.x);this.m_localPoint.y=0.5*(K.y+B.y);this.m_axis=AN.CrossVF(AN.SubtractVV(B,K),1);this.m_axis.Normalize();N=this.m_axis;H=A.R;I=H.col1.x*N.x+H.col2.x*N.y;E=H.col1.y*N.x+H.col2.y*N.y;N=this.m_localPoint;H=A.R;K=A.position.x+(H.col1.x*N.x+H.col2.x*N.y);B=A.position.y+(H.col1.y*N.x+H.col2.y*N.y);N=L;H=F.R;G=F.position.x+(H.col1.x*N.x+H.col2.x*N.y);D=F.position.y+(H.col1.y*N.x+H.col2.y*N.y);I=(G-K)*I+(D-B)*E}else{G=this.m_proxyA.GetVertex(H.indexA[0]);D=this.m_proxyA.GetVertex(H.indexA[1]);K=this.m_proxyB.GetVertex(H.indexB[0]);B=this.m_proxyB.GetVertex(H.indexB[1]);AN.MulX(F,L);L=AN.MulMV(F.R,AN.SubtractVV(D,G));AN.MulX(A,M);I=AN.MulMV(A.R,AN.SubtractVV(B,K));A=L.x*L.x+L.y*L.y;M=I.x*I.x+I.y*I.y;H=AN.SubtractVV(I,L);F=L.x*H.x+L.y*H.y;H=I.x*H.x+I.y*H.y;L=L.x*I.x+L.y*I.y;E=A*M-L*L;I=0;if(E!=0){I=AN.Clamp((L*H-F*M)/E,0,1)}if((L*I+H)/M<0){I=AN.Clamp((L-F)/A,0,1)}L=new AQ;L.x=G.x+I*(D.x-G.x);L.y=G.y+I*(D.y-G.y);M=new AQ;M.x=K.x+I*(B.x-K.x);M.y=K.y+I*(B.y-K.y);if(I==0||I==1){this.m_type=AY.e_faceB;this.m_axis=AN.CrossVF(AN.SubtractVV(B,K),1);this.m_axis.Normalize();this.m_localPoint=M}else{this.m_type=AY.e_faceA;this.m_axis=AN.CrossVF(AN.SubtractVV(D,G),1);this.m_localPoint=L}}}I<0&&this.m_axis.NegativeSelf()}};AY.prototype.Evaluate=function(B,F){var E,A,D=0;switch(this.m_type){case AY.e_points:E=AN.MulTMV(B.R,this.m_axis);A=AN.MulTMV(F.R,this.m_axis.GetNegative());E=this.m_proxyA.GetSupportVertex(E);A=this.m_proxyB.GetSupportVertex(A);E=AN.MulX(B,E);A=AN.MulX(F,A);return D=(A.x-E.x)*this.m_axis.x+(A.y-E.y)*this.m_axis.y;case AY.e_faceA:D=AN.MulMV(B.R,this.m_axis);E=AN.MulX(B,this.m_localPoint);A=AN.MulTMV(F.R,D.GetNegative());A=this.m_proxyB.GetSupportVertex(A);A=AN.MulX(F,A);return D=(A.x-E.x)*D.x+(A.y-E.y)*D.y;case AY.e_faceB:D=AN.MulMV(F.R,this.m_axis);A=AN.MulX(F,this.m_localPoint);E=AN.MulTMV(B.R,D.GetNegative());E=this.m_proxyA.GetSupportVertex(E);E=AN.MulX(B,E);return D=(E.x-A.x)*D.x+(E.y-A.y)*D.y;default:AM.b2Assert(false);return 0}};Box2D.postDefs.push(function(){Box2D.Collision.b2SeparationFunction.e_points=1;Box2D.Collision.b2SeparationFunction.e_faceA=2;Box2D.Collision.b2SeparationFunction.e_faceB=4});AW.b2Simplex=function(){this.m_v1=new AV;this.m_v2=new AV;this.m_v3=new AV;this.m_vertices=new Vector(3)};AW.prototype.b2Simplex=function(){this.m_vertices[0]=this.m_v1;this.m_vertices[1]=this.m_v2;this.m_vertices[2]=this.m_v3};AW.prototype.ReadCache=function(G,F,E,D,A){AM.b2Assert(0<=G.count&&G.count<=3);var L,I;this.m_count=G.count;for(var K=this.m_vertices,H=0;H<this.m_count;H++){var B=K[H];B.indexA=G.indexA[H];B.indexB=G.indexB[H];L=F.GetVertex(B.indexA);I=D.GetVertex(B.indexB);B.wA=AN.MulX(E,L);B.wB=AN.MulX(A,I);B.w=AN.SubtractVV(B.wB,B.wA);B.a=0}if(this.m_count>1){G=G.metric;L=this.GetMetric();if(L<0.5*G||2*G<L||L<Number.MIN_VALUE){this.m_count=0}}if(this.m_count==0){B=K[0];B.indexA=0;B.indexB=0;L=F.GetVertex(0);I=D.GetVertex(0);B.wA=AN.MulX(E,L);B.wB=AN.MulX(A,I);B.w=AN.SubtractVV(B.wB,B.wA);this.m_count=1}};AW.prototype.WriteCache=function(A){A.metric=this.GetMetric();A.count=Box2D.parseUInt(this.m_count);for(var D=this.m_vertices,B=0;B<this.m_count;B++){A.indexA[B]=Box2D.parseUInt(D[B].indexA);A.indexB[B]=Box2D.parseUInt(D[B].indexB)}};AW.prototype.GetSearchDirection=function(){switch(this.m_count){case 1:return this.m_v1.w.GetNegative();case 2:var A=AN.SubtractVV(this.m_v2.w,this.m_v1.w);return AN.CrossVV(A,this.m_v1.w.GetNegative())>0?AN.CrossFV(1,A):AN.CrossVF(A,1);default:AM.b2Assert(false);return new AQ}};AW.prototype.GetClosestPoint=function(){switch(this.m_count){case 0:AM.b2Assert(false);return new AQ;case 1:return this.m_v1.w;case 2:return new AQ(this.m_v1.a*this.m_v1.w.x+this.m_v2.a*this.m_v2.w.x,this.m_v1.a*this.m_v1.w.y+this.m_v2.a*this.m_v2.w.y);default:AM.b2Assert(false);return new AQ}};AW.prototype.GetWitnessPoints=function(A,B){switch(this.m_count){case 0:AM.b2Assert(false);break;case 1:A.SetV(this.m_v1.wA);B.SetV(this.m_v1.wB);break;case 2:A.x=this.m_v1.a*this.m_v1.wA.x+this.m_v2.a*this.m_v2.wA.x;A.y=this.m_v1.a*this.m_v1.wA.y+this.m_v2.a*this.m_v2.wA.y;B.x=this.m_v1.a*this.m_v1.wB.x+this.m_v2.a*this.m_v2.wB.x;B.y=this.m_v1.a*this.m_v1.wB.y+this.m_v2.a*this.m_v2.wB.y;break;case 3:B.x=A.x=this.m_v1.a*this.m_v1.wA.x+this.m_v2.a*this.m_v2.wA.x+this.m_v3.a*this.m_v3.wA.x;B.y=A.y=this.m_v1.a*this.m_v1.wA.y+this.m_v2.a*this.m_v2.wA.y+this.m_v3.a*this.m_v3.wA.y;break;default:AM.b2Assert(false)}};AW.prototype.GetMetric=function(){switch(this.m_count){case 0:AM.b2Assert(false);return 0;case 1:return 0;case 2:return AN.SubtractVV(this.m_v1.w,this.m_v2.w).Length();case 3:return AN.CrossVV(AN.SubtractVV(this.m_v2.w,this.m_v1.w),AN.SubtractVV(this.m_v3.w,this.m_v1.w));default:AM.b2Assert(false);return 0}};AW.prototype.Solve2=function(){var A=this.m_v1.w,D=this.m_v2.w,B=AN.SubtractVV(D,A);A=-(A.x*B.x+A.y*B.y);if(A<=0){this.m_count=this.m_v1.a=1}else{D=D.x*B.x+D.y*B.y;if(D<=0){this.m_count=this.m_v2.a=1;this.m_v1.Set(this.m_v2)}else{B=1/(D+A);this.m_v1.a=D*B;this.m_v2.a=A*B;this.m_count=2}}};AW.prototype.Solve3=function(){var G=this.m_v1.w,F=this.m_v2.w,E=this.m_v3.w,D=AN.SubtractVV(F,G),A=AN.Dot(G,D),M=AN.Dot(F,D);A=-A;var K=AN.SubtractVV(E,G),L=AN.Dot(G,K),I=AN.Dot(E,K);L=-L;var B=AN.SubtractVV(E,F),H=AN.Dot(F,B);B=AN.Dot(E,B);H=-H;K=AN.CrossVV(D,K);D=K*AN.CrossVV(F,E);E=K*AN.CrossVV(E,G);G=K*AN.CrossVV(G,F);if(A<=0&&L<=0){this.m_count=this.m_v1.a=1}else{if(M>0&&A>0&&G<=0){I=1/(M+A);this.m_v1.a=M*I;this.m_v2.a=A*I;this.m_count=2}else{if(I>0&&L>0&&E<=0){M=1/(I+L);this.m_v1.a=I*M;this.m_v3.a=L*M;this.m_count=2;this.m_v2.Set(this.m_v3)}else{if(M<=0&&H<=0){this.m_count=this.m_v2.a=1;this.m_v1.Set(this.m_v2)}else{if(I<=0&&B<=0){this.m_count=this.m_v3.a=1;this.m_v1.Set(this.m_v3)}else{if(B>0&&H>0&&D<=0){M=1/(B+H);this.m_v2.a=B*M;this.m_v3.a=H*M;this.m_count=2;this.m_v1.Set(this.m_v3)}else{M=1/(D+E+G);this.m_v1.a=D*M;this.m_v2.a=E*M;this.m_v3.a=G*M;this.m_count=3}}}}}}};AT.b2SimplexCache=function(){this.indexA=new Vector_a2j_Number(3);this.indexB=new Vector_a2j_Number(3)};AV.b2SimplexVertex=function(){};AV.prototype.Set=function(A){this.wA.SetV(A.wA);this.wB.SetV(A.wB);this.w.SetV(A.w);this.a=A.a;this.indexA=A.indexA;this.indexB=A.indexB};AR.b2TimeOfImpact=function(){};AR.TimeOfImpact=function(N){++AR.b2_toiCalls;var L=N.proxyA,K=N.proxyB,E=N.sweepA,A=N.sweepB;AM.b2Assert(E.t0==A.t0);AM.b2Assert(1-E.t0>Number.MIN_VALUE);var U=L.m_radius+K.m_radius;N=N.tolerance;var R=0,S=0,Q=0;AR.s_cache.count=0;for(AR.s_distanceInput.useRadii=false;;){E.GetTransform(AR.s_xfA,R);A.GetTransform(AR.s_xfB,R);AR.s_distanceInput.proxyA=L;AR.s_distanceInput.proxyB=K;AR.s_distanceInput.transformA=AR.s_xfA;AR.s_distanceInput.transformB=AR.s_xfB;P.Distance(AR.s_distanceOutput,AR.s_cache,AR.s_distanceInput);if(AR.s_distanceOutput.distance<=0){R=1;break}AR.s_fcn.Initialize(AR.s_cache,L,AR.s_xfA,K,AR.s_xfB);var B=AR.s_fcn.Evaluate(AR.s_xfA,AR.s_xfB);if(B<=0){R=1;break}if(S==0){Q=B>U?AN.Max(U-N,0.75*U):AN.Max(B-N,0.02*U)}if(B-Q<0.5*N){if(S==0){R=1;break}break}var O=R,G=R,I=1;B=B;E.GetTransform(AR.s_xfA,I);A.GetTransform(AR.s_xfB,I);var D=AR.s_fcn.Evaluate(AR.s_xfA,AR.s_xfB);if(D>=Q){R=1;break}for(var H=0;;){var M=0;M=H&1?G+(Q-B)*(I-G)/(D-B):0.5*(G+I);E.GetTransform(AR.s_xfA,M);A.GetTransform(AR.s_xfB,M);var F=AR.s_fcn.Evaluate(AR.s_xfA,AR.s_xfB);if(AN.Abs(F-Q)<0.025*N){O=M;break}if(F>Q){G=M;B=F}else{I=M;D=F}++H;++AR.b2_toiRootIters;if(H==50){break}}AR.b2_toiMaxRootIters=AN.Max(AR.b2_toiMaxRootIters,H);if(O<(1+100*Number.MIN_VALUE)*R){break}R=O;S++;++AR.b2_toiIters;if(S==1000){break}}AR.b2_toiMaxIters=AN.Max(AR.b2_toiMaxIters,S);return R};Box2D.postDefs.push(function(){Box2D.Collision.b2TimeOfImpact.b2_toiCalls=0;Box2D.Collision.b2TimeOfImpact.b2_toiIters=0;Box2D.Collision.b2TimeOfImpact.b2_toiMaxIters=0;Box2D.Collision.b2TimeOfImpact.b2_toiRootIters=0;Box2D.Collision.b2TimeOfImpact.b2_toiMaxRootIters=0;Box2D.Collision.b2TimeOfImpact.s_cache=new AT;Box2D.Collision.b2TimeOfImpact.s_distanceInput=new J;Box2D.Collision.b2TimeOfImpact.s_xfA=new X;Box2D.Collision.b2TimeOfImpact.s_xfB=new X;Box2D.Collision.b2TimeOfImpact.s_fcn=new AY;Box2D.Collision.b2TimeOfImpact.s_distanceOutput=new AU});AP.b2TOIInput=function(){this.proxyA=new AL;this.proxyB=new AL;this.sweepA=new AJ;this.sweepB=new AJ};AS.b2WorldManifold=function(){this.m_normal=new AQ};AS.prototype.b2WorldManifold=function(){this.m_points=new Vector(AM.b2_maxManifoldPoints);for(var A=0;A<AM.b2_maxManifoldPoints;A++){this.m_points[A]=new AQ}};AS.prototype.Initialize=function(I,H,G,D,A){if(G===undefined){G=0}if(A===undefined){A=0}if(I.m_pointCount!=0){var O=0,M,N,L=0,B=0,K=0,E=0,F=0;M=0;switch(I.m_type){case AG.e_circles:N=H.R;M=I.m_localPoint;O=H.position.x+N.col1.x*M.x+N.col2.x*M.y;H=H.position.y+N.col1.y*M.x+N.col2.y*M.y;N=D.R;M=I.m_points[0].m_localPoint;I=D.position.x+N.col1.x*M.x+N.col2.x*M.y;D=D.position.y+N.col1.y*M.x+N.col2.y*M.y;M=I-O;N=D-H;L=M*M+N*N;if(L>Number.MIN_VALUE*Number.MIN_VALUE){L=Math.sqrt(L);this.m_normal.x=M/L;this.m_normal.y=N/L}else{this.m_normal.x=1;this.m_normal.y=0}M=H+G*this.m_normal.y;D=D-A*this.m_normal.y;this.m_points[0].x=0.5*(O+G*this.m_normal.x+(I-A*this.m_normal.x));this.m_points[0].y=0.5*(M+D);break;case AG.e_faceA:N=H.R;M=I.m_localPlaneNormal;L=N.col1.x*M.x+N.col2.x*M.y;B=N.col1.y*M.x+N.col2.y*M.y;N=H.R;M=I.m_localPoint;K=H.position.x+N.col1.x*M.x+N.col2.x*M.y;E=H.position.y+N.col1.y*M.x+N.col2.y*M.y;this.m_normal.x=L;this.m_normal.y=B;for(O=0;O<I.m_pointCount;O++){N=D.R;M=I.m_points[O].m_localPoint;F=D.position.x+N.col1.x*M.x+N.col2.x*M.y;M=D.position.y+N.col1.y*M.x+N.col2.y*M.y;this.m_points[O].x=F+0.5*(G-(F-K)*L-(M-E)*B-A)*L;this.m_points[O].y=M+0.5*(G-(F-K)*L-(M-E)*B-A)*B}break;case AG.e_faceB:N=D.R;M=I.m_localPlaneNormal;L=N.col1.x*M.x+N.col2.x*M.y;B=N.col1.y*M.x+N.col2.y*M.y;N=D.R;M=I.m_localPoint;K=D.position.x+N.col1.x*M.x+N.col2.x*M.y;E=D.position.y+N.col1.y*M.x+N.col2.y*M.y;this.m_normal.x=-L;this.m_normal.y=-B;for(O=0;O<I.m_pointCount;O++){N=H.R;M=I.m_points[O].m_localPoint;F=H.position.x+N.col1.x*M.x+N.col2.x*M.y;M=H.position.y+N.col1.y*M.x+N.col2.y*M.y;this.m_points[O].x=F+0.5*(A-(F-K)*L-(M-E)*B-G)*L;this.m_points[O].y=M+0.5*(A-(F-K)*L-(M-E)*B-G)*B}}}};Aa.ClipVertex=function(){this.v=new AQ;this.id=new AA};Aa.prototype.Set=function(A){this.v.SetV(A.v);this.id.Set(A.id)};AZ.Features=function(){};Object.defineProperty(AZ.prototype,"referenceEdge",{enumerable:false,configurable:true,get:function(){return this._referenceEdge}});Object.defineProperty(AZ.prototype,"referenceEdge",{enumerable:false,configurable:true,set:function(A){if(A===undefined){A=0}this._referenceEdge=A;this._m_id._key=this._m_id._key&4294967040|this._referenceEdge&255}});Object.defineProperty(AZ.prototype,"incidentEdge",{enumerable:false,configurable:true,get:function(){return this._incidentEdge}});Object.defineProperty(AZ.prototype,"incidentEdge",{enumerable:false,configurable:true,set:function(A){if(A===undefined){A=0}this._incidentEdge=A;this._m_id._key=this._m_id._key&4294902015|this._incidentEdge<<8&65280}});Object.defineProperty(AZ.prototype,"incidentVertex",{enumerable:false,configurable:true,get:function(){return this._incidentVertex}});Object.defineProperty(AZ.prototype,"incidentVertex",{enumerable:false,configurable:true,set:function(A){if(A===undefined){A=0}this._incidentVertex=A;this._m_id._key=this._m_id._key&4278255615|this._incidentVertex<<16&16711680}});Object.defineProperty(AZ.prototype,"flip",{enumerable:false,configurable:true,get:function(){return this._flip}});Object.defineProperty(AZ.prototype,"flip",{enumerable:false,configurable:true,set:function(A){if(A===undefined){A=0}this._flip=A;this._m_id._key=this._m_id._key&16777215|this._flip<<24&4278190080}})})();(function(){var f=Box2D.Common.b2Settings,e=Box2D.Collision.Shapes.b2CircleShape,X=Box2D.Collision.Shapes.b2EdgeChainDef,T=Box2D.Collision.Shapes.b2EdgeShape,b=Box2D.Collision.Shapes.b2MassData,H=Box2D.Collision.Shapes.b2PolygonShape,O=Box2D.Collision.Shapes.b2Shape,E=Box2D.Common.Math.b2Mat22,D=Box2D.Common.Math.b2Math,P=Box2D.Common.Math.b2Transform,N=Box2D.Common.Math.b2Vec2,R=Box2D.Collision.b2Distance,S=Box2D.Collision.b2DistanceInput,Z=Box2D.Collision.b2DistanceOutput,J=Box2D.Collision.b2DistanceProxy,C=Box2D.Collision.b2SimplexCache;Box2D.inherit(e,Box2D.Collision.Shapes.b2Shape);e.prototype.__super=Box2D.Collision.Shapes.b2Shape.prototype;e.b2CircleShape=function(){Box2D.Collision.Shapes.b2Shape.b2Shape.apply(this,arguments);this.m_p=new N};e.prototype.Copy=function(){var A=new e;A.Set(this);return A};e.prototype.Set=function(A){this.__super.Set.call(this,A);if(Box2D.is(A,e)){this.m_p.SetV((A instanceof e?A:null).m_p)}};e.prototype.TestPoint=function(A,G){var B=A.R,F=A.position.x+(B.col1.x*this.m_p.x+B.col2.x*this.m_p.y);B=A.position.y+(B.col1.y*this.m_p.x+B.col2.y*this.m_p.y);F=G.x-F;B=G.y-B;return F*F+B*B<=this.m_radius*this.m_radius};e.prototype.RayCast=function(B,K,M){var A=M.R,L=K.p1.x-(M.position.x+(A.col1.x*this.m_p.x+A.col2.x*this.m_p.y));M=K.p1.y-(M.position.y+(A.col1.y*this.m_p.x+A.col2.y*this.m_p.y));A=K.p2.x-K.p1.x;var G=K.p2.y-K.p1.y,Q=L*A+M*G,F=A*A+G*G,I=Q*Q-F*(L*L+M*M-this.m_radius*this.m_radius);if(I<0||F<Number.MIN_VALUE){return false}Q=-(Q+Math.sqrt(I));if(0<=Q&&Q<=K.maxFraction*F){Q/=F;B.fraction=Q;B.normal.x=L+Q*A;B.normal.y=M+Q*G;B.normal.Normalize();return true}return false};e.prototype.ComputeAABB=function(A,G){var B=G.R,F=G.position.x+(B.col1.x*this.m_p.x+B.col2.x*this.m_p.y);B=G.position.y+(B.col1.y*this.m_p.x+B.col2.y*this.m_p.y);A.lowerBound.Set(F-this.m_radius,B-this.m_radius);A.upperBound.Set(F+this.m_radius,B+this.m_radius)};e.prototype.ComputeMass=function(A,B){if(B===undefined){B=0}A.mass=B*f.b2_pi*this.m_radius*this.m_radius;A.center.SetV(this.m_p);A.I=A.mass*(0.5*this.m_radius*this.m_radius+(this.m_p.x*this.m_p.x+this.m_p.y*this.m_p.y))};e.prototype.ComputeSubmergedArea=function(A,K,B,I){if(K===undefined){K=0}B=D.MulX(B,this.m_p);var F=-(D.Dot(A,B)-K);if(F<-this.m_radius+Number.MIN_VALUE){return 0}if(F>this.m_radius){I.SetV(B);return Math.PI*this.m_radius*this.m_radius}K=this.m_radius*this.m_radius;var G=F*F;F=K*(Math.asin(F/this.m_radius)+Math.PI/2)+F*Math.sqrt(K-G);K=-2/3*Math.pow(K-G,1.5)/F;I.x=B.x+A.x*K;I.y=B.y+A.y*K;return F};e.prototype.GetLocalPosition=function(){return this.m_p};e.prototype.SetLocalPosition=function(A){this.m_p.SetV(A)};e.prototype.GetRadius=function(){return this.m_radius};e.prototype.SetRadius=function(A){if(A===undefined){A=0}this.m_radius=A};e.prototype.b2CircleShape=function(A){if(A===undefined){A=0}this.__super.b2Shape.call(this);this.m_type=O.e_circleShape;this.m_radius=A};X.b2EdgeChainDef=function(){};X.prototype.b2EdgeChainDef=function(){this.vertexCount=0;this.isALoop=true;this.vertices=[]};Box2D.inherit(T,Box2D.Collision.Shapes.b2Shape);T.prototype.__super=Box2D.Collision.Shapes.b2Shape.prototype;T.b2EdgeShape=function(){Box2D.Collision.Shapes.b2Shape.b2Shape.apply(this,arguments);this.s_supportVec=new N;this.m_v1=new N;this.m_v2=new N;this.m_coreV1=new N;this.m_coreV2=new N;this.m_normal=new N;this.m_direction=new N;this.m_cornerDir1=new N;this.m_cornerDir2=new N};T.prototype.TestPoint=function(){return false};T.prototype.RayCast=function(F,M,U){var B,Q=M.p2.x-M.p1.x,K=M.p2.y-M.p1.y;B=U.R;var V=U.position.x+(B.col1.x*this.m_v1.x+B.col2.x*this.m_v1.y),I=U.position.y+(B.col1.y*this.m_v1.x+B.col2.y*this.m_v1.y),L=U.position.y+(B.col1.y*this.m_v2.x+B.col2.y*this.m_v2.y)-I;U=-(U.position.x+(B.col1.x*this.m_v2.x+B.col2.x*this.m_v2.y)-V);B=100*Number.MIN_VALUE;var G=-(Q*L+K*U);if(G>B){V=M.p1.x-V;var A=M.p1.y-I;I=V*L+A*U;if(0<=I&&I<=M.maxFraction*G){M=-Q*A+K*V;if(-B*G<=M&&M<=G*(1+B)){I/=G;F.fraction=I;M=Math.sqrt(L*L+U*U);F.normal.x=L/M;F.normal.y=U/M;return true}}}return false};T.prototype.ComputeAABB=function(A,K){var B=K.R,I=K.position.x+(B.col1.x*this.m_v1.x+B.col2.x*this.m_v1.y),F=K.position.y+(B.col1.y*this.m_v1.x+B.col2.y*this.m_v1.y),G=K.position.x+(B.col1.x*this.m_v2.x+B.col2.x*this.m_v2.y);B=K.position.y+(B.col1.y*this.m_v2.x+B.col2.y*this.m_v2.y);if(I<G){A.lowerBound.x=I;A.upperBound.x=G}else{A.lowerBound.x=G;A.upperBound.x=I}if(F<B){A.lowerBound.y=F;A.upperBound.y=B}else{A.lowerBound.y=B;A.upperBound.y=F}};T.prototype.ComputeMass=function(A){A.mass=0;A.center.SetV(this.m_v1);A.I=0};T.prototype.ComputeSubmergedArea=function(A,L,B,K){if(L===undefined){L=0}var F=new N(A.x*L,A.y*L),I=D.MulX(B,this.m_v1);B=D.MulX(B,this.m_v2);var G=D.Dot(A,I)-L;A=D.Dot(A,B)-L;if(G>0){if(A>0){return 0}else{I.x=-A/(G-A)*I.x+G/(G-A)*B.x;I.y=-A/(G-A)*I.y+G/(G-A)*B.y}}else{if(A>0){B.x=-A/(G-A)*I.x+G/(G-A)*B.x;B.y=-A/(G-A)*I.y+G/(G-A)*B.y}}K.x=(F.x+I.x+B.x)/3;K.y=(F.y+I.y+B.y)/3;return 0.5*((I.x-F.x)*(B.y-F.y)-(I.y-F.y)*(B.x-F.x))};T.prototype.GetLength=function(){return this.m_length};T.prototype.GetVertex1=function(){return this.m_v1};T.prototype.GetVertex2=function(){return this.m_v2};T.prototype.GetCoreVertex1=function(){return this.m_coreV1};T.prototype.GetCoreVertex2=function(){return this.m_coreV2};T.prototype.GetNormalVector=function(){return this.m_normal};T.prototype.GetDirectionVector=function(){return this.m_direction};T.prototype.GetCorner1Vector=function(){return this.m_cornerDir1};T.prototype.GetCorner2Vector=function(){return this.m_cornerDir2};T.prototype.Corner1IsConvex=function(){return this.m_cornerConvex1};T.prototype.Corner2IsConvex=function(){return this.m_cornerConvex2};T.prototype.GetFirstVertex=function(A){var B=A.R;return new N(A.position.x+(B.col1.x*this.m_coreV1.x+B.col2.x*this.m_coreV1.y),A.position.y+(B.col1.y*this.m_coreV1.x+B.col2.y*this.m_coreV1.y))};T.prototype.GetNextEdge=function(){return this.m_nextEdge};T.prototype.GetPrevEdge=function(){return this.m_prevEdge};T.prototype.Support=function(A,L,B){if(L===undefined){L=0}if(B===undefined){B=0}var K=A.R,F=A.position.x+(K.col1.x*this.m_coreV1.x+K.col2.x*this.m_coreV1.y),I=A.position.y+(K.col1.y*this.m_coreV1.x+K.col2.y*this.m_coreV1.y),G=A.position.x+(K.col1.x*this.m_coreV2.x+K.col2.x*this.m_coreV2.y);A=A.position.y+(K.col1.y*this.m_coreV2.x+K.col2.y*this.m_coreV2.y);if(F*L+I*B>G*L+A*B){this.s_supportVec.x=F;this.s_supportVec.y=I}else{this.s_supportVec.x=G;this.s_supportVec.y=A}return this.s_supportVec};T.prototype.b2EdgeShape=function(A,B){this.__super.b2Shape.call(this);this.m_type=O.e_edgeShape;this.m_nextEdge=this.m_prevEdge=null;this.m_v1=A;this.m_v2=B;this.m_direction.Set(this.m_v2.x-this.m_v1.x,this.m_v2.y-this.m_v1.y);this.m_length=this.m_direction.Normalize();this.m_normal.Set(this.m_direction.y,-this.m_direction.x);this.m_coreV1.Set(-f.b2_toiSlop*(this.m_normal.x-this.m_direction.x)+this.m_v1.x,-f.b2_toiSlop*(this.m_normal.y-this.m_direction.y)+this.m_v1.y);this.m_coreV2.Set(-f.b2_toiSlop*(this.m_normal.x+this.m_direction.x)+this.m_v2.x,-f.b2_toiSlop*(this.m_normal.y+this.m_direction.y)+this.m_v2.y);this.m_cornerDir1=this.m_normal;this.m_cornerDir2.Set(-this.m_normal.x,-this.m_normal.y)};T.prototype.SetPrevEdge=function(A,G,B,F){this.m_prevEdge=A;this.m_coreV1=G;this.m_cornerDir1=B;this.m_cornerConvex1=F};T.prototype.SetNextEdge=function(A,G,B,F){this.m_nextEdge=A;this.m_coreV2=G;this.m_cornerDir2=B;this.m_cornerConvex2=F};b.b2MassData=function(){this.mass=0;this.center=new N(0,0);this.I=0};Box2D.inherit(H,Box2D.Collision.Shapes.b2Shape);H.prototype.__super=Box2D.Collision.Shapes.b2Shape.prototype;H.b2PolygonShape=function(){Box2D.Collision.Shapes.b2Shape.b2Shape.apply(this,arguments)};H.prototype.Copy=function(){var A=new H;A.Set(this);return A};H.prototype.Set=function(A){this.__super.Set.call(this,A);if(Box2D.is(A,H)){A=A instanceof H?A:null;this.m_centroid.SetV(A.m_centroid);this.m_vertexCount=A.m_vertexCount;this.Reserve(this.m_vertexCount);for(var B=0;B<this.m_vertexCount;B++){this.m_vertices[B].SetV(A.m_vertices[B]);this.m_normals[B].SetV(A.m_normals[B])}}};H.prototype.SetAsArray=function(A,I){if(I===undefined){I=0}var B=new Vector,G=0,F;for(G=0;G<A.length;++G){F=A[G];B.push(F)}this.SetAsVector(B,I)};H.AsArray=function(A,F){if(F===undefined){F=0}var B=new H;B.SetAsArray(A,F);return B};H.prototype.SetAsVector=function(A,I){if(I===undefined){I=0}if(I==0){I=A.length}f.b2Assert(2<=I);this.m_vertexCount=I;this.Reserve(I);var B=0;for(B=0;B<this.m_vertexCount;B++){this.m_vertices[B].SetV(A[B])}for(B=0;B<this.m_vertexCount;++B){var G=parseInt(B),F=parseInt(B+1<this.m_vertexCount?B+1:0);G=D.SubtractVV(this.m_vertices[F],this.m_vertices[G]);f.b2Assert(G.LengthSquared()>Number.MIN_VALUE);this.m_normals[B].SetV(D.CrossVF(G,1));this.m_normals[B].Normalize()}this.m_centroid=H.ComputeCentroid(this.m_vertices,this.m_vertexCount)};H.AsVector=function(A,F){if(F===undefined){F=0}var B=new H;B.SetAsVector(A,F);return B};H.prototype.SetAsBox=function(A,B){if(A===undefined){A=0}if(B===undefined){B=0}this.m_vertexCount=4;this.Reserve(4);this.m_vertices[0].Set(-A,-B);this.m_vertices[1].Set(A,-B);this.m_vertices[2].Set(A,B);this.m_vertices[3].Set(-A,B);this.m_normals[0].Set(0,-1);this.m_normals[1].Set(1,0);this.m_normals[2].Set(0,1);this.m_normals[3].Set(-1,0);this.m_centroid.SetZero()};H.AsBox=function(A,F){if(A===undefined){A=0}if(F===undefined){F=0}var B=new H;B.SetAsBox(A,F);return B};H.prototype.SetAsOrientedBox=function(A,G,B,F){if(A===undefined){A=0}if(G===undefined){G=0}if(B===undefined){B=null}if(F===undefined){F=0}this.m_vertexCount=4;this.Reserve(4);this.m_vertices[0].Set(-A,-G);this.m_vertices[1].Set(A,-G);this.m_vertices[2].Set(A,G);this.m_vertices[3].Set(-A,G);this.m_normals[0].Set(0,-1);this.m_normals[1].Set(1,0);this.m_normals[2].Set(0,1);this.m_normals[3].Set(-1,0);this.m_centroid=B;A=new P;A.position=B;A.R.Set(F);for(B=0;B<this.m_vertexCount;++B){this.m_vertices[B]=D.MulX(A,this.m_vertices[B]);this.m_normals[B]=D.MulMV(A.R,this.m_normals[B])}};H.AsOrientedBox=function(A,I,B,G){if(A===undefined){A=0}if(I===undefined){I=0}if(B===undefined){B=null}if(G===undefined){G=0}var F=new H;F.SetAsOrientedBox(A,I,B,G);return F};H.prototype.SetAsEdge=function(A,B){this.m_vertexCount=2;this.Reserve(2);this.m_vertices[0].SetV(A);this.m_vertices[1].SetV(B);this.m_centroid.x=0.5*(A.x+B.x);this.m_centroid.y=0.5*(A.y+B.y);this.m_normals[0]=D.CrossVF(D.SubtractVV(B,A),1);this.m_normals[0].Normalize();this.m_normals[1].x=-this.m_normals[0].x;this.m_normals[1].y=-this.m_normals[0].y};H.AsEdge=function(A,F){var B=new H;B.SetAsEdge(A,F);return B};H.prototype.TestPoint=function(A,M){var B;B=A.R;for(var L=M.x-A.position.x,F=M.y-A.position.y,K=L*B.col1.x+F*B.col1.y,I=L*B.col2.x+F*B.col2.y,G=0;G<this.m_vertexCount;++G){B=this.m_vertices[G];L=K-B.x;F=I-B.y;B=this.m_normals[G];if(B.x*L+B.y*F>0){return false}}return true};H.prototype.RayCast=function(G,U,W){var B=0,V=U.maxFraction,L=0,Y=0,K,M;L=U.p1.x-W.position.x;Y=U.p1.y-W.position.y;K=W.R;var I=L*K.col1.x+Y*K.col1.y,A=L*K.col2.x+Y*K.col2.y;L=U.p2.x-W.position.x;Y=U.p2.y-W.position.y;K=W.R;U=L*K.col1.x+Y*K.col1.y-I;K=L*K.col2.x+Y*K.col2.y-A;for(var F=parseInt(-1),Q=0;Q<this.m_vertexCount;++Q){M=this.m_vertices[Q];L=M.x-I;Y=M.y-A;M=this.m_normals[Q];L=M.x*L+M.y*Y;Y=M.x*U+M.y*K;if(Y==0){if(L<0){return false}}else{if(Y<0&&L<B*Y){B=L/Y;F=Q}else{if(Y>0&&L<V*Y){V=L/Y}}}if(V<B-Number.MIN_VALUE){return false}}if(F>=0){G.fraction=B;K=W.R;M=this.m_normals[F];G.normal.x=K.col1.x*M.x+K.col2.x*M.y;G.normal.y=K.col1.y*M.x+K.col2.y*M.y;return true}return false};H.prototype.ComputeAABB=function(B,L){for(var Q=L.R,A=this.m_vertices[0],M=L.position.x+(Q.col1.x*A.x+Q.col2.x*A.y),I=L.position.y+(Q.col1.y*A.x+Q.col2.y*A.y),U=M,G=I,K=1;K<this.m_vertexCount;++K){A=this.m_vertices[K];var F=L.position.x+(Q.col1.x*A.x+Q.col2.x*A.y);A=L.position.y+(Q.col1.y*A.x+Q.col2.y*A.y);M=M<F?M:F;I=I<A?I:A;U=U>F?U:F;G=G>A?G:A}B.lowerBound.x=M-this.m_radius;B.lowerBound.y=I-this.m_radius;B.upperBound.x=U+this.m_radius;B.upperBound.y=G+this.m_radius};H.prototype.ComputeMass=function(I,Y){if(Y===undefined){Y=0}if(this.m_vertexCount==2){I.center.x=0.5*(this.m_vertices[0].x+this.m_vertices[1].x);I.center.y=0.5*(this.m_vertices[0].y+this.m_vertices[1].y);I.mass=0;I.I=0}else{for(var m=0,B=0,g=0,U=0,n=1/3,M=0;M<this.m_vertexCount;++M){var V=this.m_vertices[M],L=M+1<this.m_vertexCount?this.m_vertices[parseInt(M+1)]:this.m_vertices[0],A=V.x-0,F=V.y-0,W=L.x-0,Q=L.y-0,G=A*Q-F*W,K=0.5*G;g+=K;m+=K*n*(0+V.x+L.x);B+=K*n*(0+V.y+L.y);V=A;F=F;W=W;Q=Q;U+=G*(n*(0.25*(V*V+W*V+W*W)+(0*V+0*W))+0+(n*(0.25*(F*F+Q*F+Q*Q)+(0*F+0*Q))+0))}I.mass=Y*g;m*=1/g;B*=1/g;I.center.Set(m,B);I.I=Y*U}};H.prototype.ComputeSubmergedArea=function(F,M,U,B){if(M===undefined){M=0}var Q=D.MulTMV(U.R,F),K=M-D.Dot(F,U.position),V=new Vector_a2j_Number,I=0,L=parseInt(-1);M=parseInt(-1);var G=false;for(F=F=0;F<this.m_vertexCount;++F){V[F]=D.Dot(Q,this.m_vertices[F])-K;var A=V[F]<-Number.MIN_VALUE;if(F>0){if(A){if(!G){L=F-1;I++}}else{if(G){M=F-1;I++}}}G=A}switch(I){case 0:if(G){F=new b;this.ComputeMass(F,1);B.SetV(D.MulX(U,F.center));return F.mass}else{return 0}case 1:if(L==-1){L=this.m_vertexCount-1}else{M=this.m_vertexCount-1}}F=parseInt((L+1)%this.m_vertexCount);Q=parseInt((M+1)%this.m_vertexCount);K=(0-V[L])/(V[F]-V[L]);V=(0-V[M])/(V[Q]-V[M]);L=new N(this.m_vertices[L].x*(1-K)+this.m_vertices[F].x*K,this.m_vertices[L].y*(1-K)+this.m_vertices[F].y*K);M=new N(this.m_vertices[M].x*(1-V)+this.m_vertices[Q].x*V,this.m_vertices[M].y*(1-V)+this.m_vertices[Q].y*V);V=0;K=new N;I=this.m_vertices[F];for(F=F;F!=Q;){F=(F+1)%this.m_vertexCount;G=F==Q?M:this.m_vertices[F];A=0.5*((I.x-L.x)*(G.y-L.y)-(I.y-L.y)*(G.x-L.x));V+=A;K.x+=A*(L.x+I.x+G.x)/3;K.y+=A*(L.y+I.y+G.y)/3;I=G}K.Multiply(1/V);B.SetV(D.MulX(U,K));return V};H.prototype.GetVertexCount=function(){return this.m_vertexCount};H.prototype.GetVertices=function(){return this.m_vertices};H.prototype.GetNormals=function(){return this.m_normals};H.prototype.GetSupport=function(A){for(var I=0,B=this.m_vertices[0].x*A.x+this.m_vertices[0].y*A.y,G=1;G<this.m_vertexCount;++G){var F=this.m_vertices[G].x*A.x+this.m_vertices[G].y*A.y;if(F>B){I=G;B=F}}return I};H.prototype.GetSupportVertex=function(A){for(var I=0,B=this.m_vertices[0].x*A.x+this.m_vertices[0].y*A.y,G=1;G<this.m_vertexCount;++G){var F=this.m_vertices[G].x*A.x+this.m_vertices[G].y*A.y;if(F>B){I=G;B=F}}return this.m_vertices[I]};H.prototype.Validate=function(){return false};H.prototype.b2PolygonShape=function(){this.__super.b2Shape.call(this);this.m_type=O.e_polygonShape;this.m_centroid=new N;this.m_vertices=new Vector;this.m_normals=new Vector};H.prototype.Reserve=function(A){if(A===undefined){A=0}for(var B=parseInt(this.m_vertices.length);B<A;B++){this.m_vertices[B]=new N;this.m_normals[B]=new N}};H.ComputeCentroid=function(B,K){if(K===undefined){K=0}for(var M=new N,A=0,L=1/3,G=0;G<K;++G){var Q=B[G],F=G+1<K?B[parseInt(G+1)]:B[0],I=0.5*((Q.x-0)*(F.y-0)-(Q.y-0)*(F.x-0));A+=I;M.x+=I*L*(0+Q.x+F.x);M.y+=I*L*(0+Q.y+F.y)}M.x*=1/A;M.y*=1/A;return M};H.ComputeOBB=function(g,K,M){if(M===undefined){M=0}var U=0,L=new Vector(M+1);for(U=0;U<M;++U){L[U]=K[U]}L[M]=L[0];K=Number.MAX_VALUE;for(U=1;U<=M;++U){var G=L[parseInt(U-1)],Q=L[U].x-G.x,F=L[U].y-G.y,I=Math.sqrt(Q*Q+F*F);Q/=I;F/=I;for(var B=-F,t=Q,A=I=Number.MAX_VALUE,p=-Number.MAX_VALUE,n=-Number.MAX_VALUE,Y=0;Y<M;++Y){var m=L[Y].x-G.x,W=L[Y].y-G.y,V=Q*m+F*W;m=B*m+t*W;if(V<I){I=V}if(m<A){A=m}if(V>p){p=V}if(m>n){n=m}}Y=(p-I)*(n-A);if(Y<0.95*K){K=Y;g.R.col1.x=Q;g.R.col1.y=F;g.R.col2.x=B;g.R.col2.y=t;Q=0.5*(I+p);F=0.5*(A+n);B=g.R;g.center.x=G.x+(B.col1.x*Q+B.col2.x*F);g.center.y=G.y+(B.col1.y*Q+B.col2.y*F);g.extents.x=0.5*(p-I);g.extents.y=0.5*(n-A)}}};Box2D.postDefs.push(function(){Box2D.Collision.Shapes.b2PolygonShape.s_mat=new E});O.b2Shape=function(){};O.prototype.Copy=function(){return null};O.prototype.Set=function(A){this.m_radius=A.m_radius};O.prototype.GetType=function(){return this.m_type};O.prototype.TestPoint=function(){return false};O.prototype.RayCast=function(){return false};O.prototype.ComputeAABB=function(){};O.prototype.ComputeMass=function(){};O.prototype.ComputeSubmergedArea=function(){return 0};O.TestOverlap=function(A,I,B,G){var F=new S;F.proxyA=new J;F.proxyA.Set(A);F.proxyB=new J;F.proxyB.Set(B);F.transformA=I;F.transformB=G;F.useRadii=true;A=new C;A.count=0;I=new Z;R.Distance(I,A,F);return I.distance<10*Number.MIN_VALUE};O.prototype.b2Shape=function(){this.m_type=O.e_unknownShape;this.m_radius=f.b2_linearSlop};Box2D.postDefs.push(function(){Box2D.Collision.Shapes.b2Shape.e_unknownShape=parseInt(-1);Box2D.Collision.Shapes.b2Shape.e_circleShape=0;Box2D.Collision.Shapes.b2Shape.e_polygonShape=1;Box2D.Collision.Shapes.b2Shape.e_edgeShape=2;Box2D.Collision.Shapes.b2Shape.e_shapeTypeCount=3;Box2D.Collision.Shapes.b2Shape.e_hitCollide=1;Box2D.Collision.Shapes.b2Shape.e_missCollide=0;Box2D.Collision.Shapes.b2Shape.e_startsInsideCollide=parseInt(-1)})})();(function(){var C=Box2D.Common.b2Color,B=Box2D.Common.b2Settings,A=Box2D.Common.Math.b2Math;C.b2Color=function(){this._b=this._g=this._r=0};C.prototype.b2Color=function(F,E,D){if(F===undefined){F=0}if(E===undefined){E=0}if(D===undefined){D=0}this._r=Box2D.parseUInt(255*A.Clamp(F,0,1));this._g=Box2D.parseUInt(255*A.Clamp(E,0,1));this._b=Box2D.parseUInt(255*A.Clamp(D,0,1))};C.prototype.Set=function(F,E,D){if(F===undefined){F=0}if(E===undefined){E=0}if(D===undefined){D=0}this._r=Box2D.parseUInt(255*A.Clamp(F,0,1));this._g=Box2D.parseUInt(255*A.Clamp(E,0,1));this._b=Box2D.parseUInt(255*A.Clamp(D,0,1))};Object.defineProperty(C.prototype,"r",{enumerable:false,configurable:true,set:function(D){if(D===undefined){D=0}this._r=Box2D.parseUInt(255*A.Clamp(D,0,1))}});Object.defineProperty(C.prototype,"g",{enumerable:false,configurable:true,set:function(D){if(D===undefined){D=0}this._g=Box2D.parseUInt(255*A.Clamp(D,0,1))}});Object.defineProperty(C.prototype,"b",{enumerable:false,configurable:true,set:function(D){if(D===undefined){D=0}this._b=Box2D.parseUInt(255*A.Clamp(D,0,1))}});Object.defineProperty(C.prototype,"color",{enumerable:false,configurable:true,get:function(){return this._r<<16|this._g<<8|this._b}});B.b2Settings=function(){};B.b2MixFriction=function(E,D){if(E===undefined){E=0}if(D===undefined){D=0}return Math.sqrt(E*D)};B.b2MixRestitution=function(E,D){if(E===undefined){E=0}if(D===undefined){D=0}return E>D?E:D};B.b2Assert=function(D){if(!D){throw"Assertion Failed"}};Box2D.postDefs.push(function(){Box2D.Common.b2Settings.VERSION="2.1alpha";Box2D.Common.b2Settings.USHRT_MAX=65535;Box2D.Common.b2Settings.b2_pi=Math.PI;Box2D.Common.b2Settings.b2_maxManifoldPoints=2;Box2D.Common.b2Settings.b2_aabbExtension=0.1;Box2D.Common.b2Settings.b2_aabbMultiplier=2;Box2D.Common.b2Settings.b2_polygonRadius=2*B.b2_linearSlop;Box2D.Common.b2Settings.b2_linearSlop=0.005;Box2D.Common.b2Settings.b2_angularSlop=2/180*B.b2_pi;Box2D.Common.b2Settings.b2_toiSlop=8*B.b2_linearSlop;Box2D.Common.b2Settings.b2_maxTOIContactsPerIsland=32;Box2D.Common.b2Settings.b2_maxTOIJointsPerIsland=32;Box2D.Common.b2Settings.b2_velocityThreshold=1;Box2D.Common.b2Settings.b2_maxLinearCorrection=0.2;Box2D.Common.b2Settings.b2_maxAngularCorrection=8/180*B.b2_pi;Box2D.Common.b2Settings.b2_maxTranslation=2;Box2D.Common.b2Settings.b2_maxTranslationSquared=B.b2_maxTranslation*B.b2_maxTranslation;Box2D.Common.b2Settings.b2_maxRotation=0.5*B.b2_pi;Box2D.Common.b2Settings.b2_maxRotationSquared=B.b2_maxRotation*B.b2_maxRotation;Box2D.Common.b2Settings.b2_contactBaumgarte=0.2;Box2D.Common.b2Settings.b2_timeToSleep=0.5;Box2D.Common.b2Settings.b2_linearSleepTolerance=0.01;Box2D.Common.b2Settings.b2_angularSleepTolerance=2/180*B.b2_pi})})();(function(){var I=Box2D.Common.Math.b2Mat22,H=Box2D.Common.Math.b2Mat33,D=Box2D.Common.Math.b2Math,J=Box2D.Common.Math.b2Sweep,C=Box2D.Common.Math.b2Transform,B=Box2D.Common.Math.b2Vec2,E=Box2D.Common.Math.b2Vec3;I.b2Mat22=function(){this.col1=new B;this.col2=new B};I.prototype.b2Mat22=function(){this.SetIdentity()};I.FromAngle=function(A){if(A===undefined){A=0}var F=new I;F.Set(A);return F};I.FromVV=function(F,G){var A=new I;A.SetVV(F,G);return A};I.prototype.Set=function(A){if(A===undefined){A=0}var F=Math.cos(A);A=Math.sin(A);this.col1.x=F;this.col2.x=-A;this.col1.y=A;this.col2.y=F};I.prototype.SetVV=function(A,F){this.col1.SetV(A);this.col2.SetV(F)};I.prototype.Copy=function(){var A=new I;A.SetM(this);return A};I.prototype.SetM=function(A){this.col1.SetV(A.col1);this.col2.SetV(A.col2)};I.prototype.AddM=function(A){this.col1.x+=A.col1.x;this.col1.y+=A.col1.y;this.col2.x+=A.col2.x;this.col2.y+=A.col2.y};I.prototype.SetIdentity=function(){this.col1.x=1;this.col2.x=0;this.col1.y=0;this.col2.y=1};I.prototype.SetZero=function(){this.col1.x=0;this.col2.x=0;this.col1.y=0;this.col2.y=0};I.prototype.GetAngle=function(){return Math.atan2(this.col1.y,this.col1.x)};I.prototype.GetInverse=function(K){var O=this.col1.x,G=this.col2.x,F=this.col1.y,N=this.col2.y,A=O*N-G*F;if(A!=0){A=1/A}K.col1.x=A*N;K.col2.x=-A*G;K.col1.y=-A*F;K.col2.y=A*O;return K};I.prototype.Solve=function(O,R,N){if(R===undefined){R=0}if(N===undefined){N=0}var G=this.col1.x,P=this.col2.x,F=this.col1.y,K=this.col2.y,A=G*K-P*F;if(A!=0){A=1/A}O.x=A*(K*R-P*N);O.y=A*(G*N-F*R);return O};I.prototype.Abs=function(){this.col1.Abs();this.col2.Abs()};H.b2Mat33=function(){this.col1=new E;this.col2=new E;this.col3=new E};H.prototype.b2Mat33=function(F,G,A){if(F===undefined){F=null}if(G===undefined){G=null}if(A===undefined){A=null}if(!F&&!G&&!A){this.col1.SetZero();this.col2.SetZero();this.col3.SetZero()}else{this.col1.SetV(F);this.col2.SetV(G);this.col3.SetV(A)}};H.prototype.SetVVV=function(F,G,A){this.col1.SetV(F);this.col2.SetV(G);this.col3.SetV(A)};H.prototype.Copy=function(){return new H(this.col1,this.col2,this.col3)};H.prototype.SetM=function(A){this.col1.SetV(A.col1);this.col2.SetV(A.col2);this.col3.SetV(A.col3)};H.prototype.AddM=function(A){this.col1.x+=A.col1.x;this.col1.y+=A.col1.y;this.col1.z+=A.col1.z;this.col2.x+=A.col2.x;this.col2.y+=A.col2.y;this.col2.z+=A.col2.z;this.col3.x+=A.col3.x;this.col3.y+=A.col3.y;this.col3.z+=A.col3.z};H.prototype.SetIdentity=function(){this.col1.x=1;this.col2.x=0;this.col3.x=0;this.col1.y=0;this.col2.y=1;this.col3.y=0;this.col1.z=0;this.col2.z=0;this.col3.z=1};H.prototype.SetZero=function(){this.col1.x=0;this.col2.x=0;this.col3.x=0;this.col1.y=0;this.col2.y=0;this.col3.y=0;this.col1.z=0;this.col2.z=0;this.col3.z=0};H.prototype.Solve22=function(O,R,N){if(R===undefined){R=0}if(N===undefined){N=0}var G=this.col1.x,P=this.col2.x,F=this.col1.y,K=this.col2.y,A=G*K-P*F;if(A!=0){A=1/A}O.x=A*(K*R-P*N);O.y=A*(G*N-F*R);return O};H.prototype.Solve33=function(K,G,R,O){if(G===undefined){G=0}if(R===undefined){R=0}if(O===undefined){O=0}var S=this.col1.x,U=this.col1.y,X=this.col1.z,N=this.col2.x,F=this.col2.y,P=this.col2.z,T=this.col3.x,b=this.col3.y,A=this.col3.z,Z=S*(F*A-P*b)+U*(P*T-N*A)+X*(N*b-F*T);if(Z!=0){Z=1/Z}K.x=Z*(G*(F*A-P*b)+R*(P*T-N*A)+O*(N*b-F*T));K.y=Z*(S*(R*A-O*b)+U*(O*T-G*A)+X*(G*b-R*T));K.z=Z*(S*(F*O-P*R)+U*(P*G-N*O)+X*(N*R-F*G));return K};D.b2Math=function(){};D.IsValid=function(A){if(A===undefined){A=0}return isFinite(A)};D.Dot=function(A,F){return A.x*F.x+A.y*F.y};D.CrossVV=function(A,F){return A.x*F.y-A.y*F.x};D.CrossVF=function(A,F){if(F===undefined){F=0}return new B(F*A.y,-F*A.x)};D.CrossFV=function(A,F){if(A===undefined){A=0}return new B(-A*F.y,A*F.x)};D.MulMV=function(A,F){return new B(A.col1.x*F.x+A.col2.x*F.y,A.col1.y*F.x+A.col2.y*F.y)};D.MulTMV=function(A,F){return new B(D.Dot(F,A.col1),D.Dot(F,A.col2))};D.MulX=function(F,G){var A=D.MulMV(F.R,G);A.x+=F.position.x;A.y+=F.position.y;return A};D.MulXT=function(G,K){var F=D.SubtractVV(K,G.position),A=F.x*G.R.col1.x+F.y*G.R.col1.y;F.y=F.x*G.R.col2.x+F.y*G.R.col2.y;F.x=A;return F};D.AddVV=function(A,F){return new B(A.x+F.x,A.y+F.y)};D.SubtractVV=function(A,F){return new B(A.x-F.x,A.y-F.y)};D.Distance=function(G,K){var F=G.x-K.x,A=G.y-K.y;return Math.sqrt(F*F+A*A)};D.DistanceSquared=function(G,K){var F=G.x-K.x,A=G.y-K.y;return F*F+A*A};D.MulFV=function(A,F){if(A===undefined){A=0}return new B(A*F.x,A*F.y)};D.AddMM=function(A,F){return I.FromVV(D.AddVV(A.col1,F.col1),D.AddVV(A.col2,F.col2))};D.MulMM=function(A,F){return I.FromVV(D.MulMV(A,F.col1),D.MulMV(A,F.col2))};D.MulTMM=function(G,K){var F=new B(D.Dot(G.col1,K.col1),D.Dot(G.col2,K.col1)),A=new B(D.Dot(G.col1,K.col2),D.Dot(G.col2,K.col2));return I.FromVV(F,A)};D.Abs=function(A){if(A===undefined){A=0}return A>0?A:-A};D.AbsV=function(A){return new B(D.Abs(A.x),D.Abs(A.y))};D.AbsM=function(A){return I.FromVV(D.AbsV(A.col1),D.AbsV(A.col2))};D.Min=function(A,F){if(A===undefined){A=0}if(F===undefined){F=0}return A<F?A:F};D.MinV=function(A,F){return new B(D.Min(A.x,F.x),D.Min(A.y,F.y))};D.Max=function(A,F){if(A===undefined){A=0}if(F===undefined){F=0}return A>F?A:F};D.MaxV=function(A,F){return new B(D.Max(A.x,F.x),D.Max(A.y,F.y))};D.Clamp=function(F,G,A){if(F===undefined){F=0}if(G===undefined){G=0}if(A===undefined){A=0}return F<G?G:F>A?A:F};D.ClampV=function(F,G,A){return D.MaxV(G,D.MinV(F,A))};D.Swap=function(F,G){var A=F[0];F[0]=G[0];G[0]=A};D.Random=function(){return Math.random()*2-1};D.RandomRange=function(F,G){if(F===undefined){F=0}if(G===undefined){G=0}var A=Math.random();return A=(G-F)*A+F};D.NextPowerOfTwo=function(A){if(A===undefined){A=0}A|=A>>1&2147483647;A|=A>>2&1073741823;A|=A>>4&268435455;A|=A>>8&16777215;A|=A>>16&65535;return A+1};D.IsPowerOfTwo=function(A){if(A===undefined){A=0}return A>0&&(A&A-1)==0};Box2D.postDefs.push(function(){Box2D.Common.Math.b2Math.b2Vec2_zero=new B(0,0);Box2D.Common.Math.b2Math.b2Mat22_identity=I.FromVV(new B(1,0),new B(0,1));Box2D.Common.Math.b2Math.b2Transform_identity=new C(D.b2Vec2_zero,D.b2Mat22_identity)});J.b2Sweep=function(){this.localCenter=new B;this.c0=new B;this.c=new B};J.prototype.Set=function(A){this.localCenter.SetV(A.localCenter);this.c0.SetV(A.c0);this.c.SetV(A.c);this.a0=A.a0;this.a=A.a;this.t0=A.t0};J.prototype.Copy=function(){var A=new J;A.localCenter.SetV(this.localCenter);A.c0.SetV(this.c0);A.c.SetV(this.c);A.a0=this.a0;A.a=this.a;A.t0=this.t0;return A};J.prototype.GetTransform=function(F,G){if(G===undefined){G=0}F.position.x=(1-G)*this.c0.x+G*this.c.x;F.position.y=(1-G)*this.c0.y+G*this.c.y;F.R.Set((1-G)*this.a0+G*this.a);var A=F.R;F.position.x-=A.col1.x*this.localCenter.x+A.col2.x*this.localCenter.y;F.position.y-=A.col1.y*this.localCenter.x+A.col2.y*this.localCenter.y};J.prototype.Advance=function(A){if(A===undefined){A=0}if(this.t0<A&&1-this.t0>Number.MIN_VALUE){var F=(A-this.t0)/(1-this.t0);this.c0.x=(1-F)*this.c0.x+F*this.c.x;this.c0.y=(1-F)*this.c0.y+F*this.c.y;this.a0=(1-F)*this.a0+F*this.a;this.t0=A}};C.b2Transform=function(){this.position=new B;this.R=new I};C.prototype.b2Transform=function(A,F){if(A===undefined){A=null}if(F===undefined){F=null}if(A){this.position.SetV(A);this.R.SetM(F)}};C.prototype.Initialize=function(A,F){this.position.SetV(A);this.R.SetM(F)};C.prototype.SetIdentity=function(){this.position.SetZero();this.R.SetIdentity()};C.prototype.Set=function(A){this.position.SetV(A.position);this.R.SetM(A.R)};C.prototype.GetAngle=function(){return Math.atan2(this.R.col1.y,this.R.col1.x)};B.b2Vec2=function(){};B.prototype.b2Vec2=function(A,F){if(A===undefined){A=0}if(F===undefined){F=0}this.x=A;this.y=F};B.prototype.SetZero=function(){this.y=this.x=0};B.prototype.Set=function(A,F){if(A===undefined){A=0}if(F===undefined){F=0}this.x=A;this.y=F};B.prototype.SetV=function(A){this.x=A.x;this.y=A.y};B.prototype.GetNegative=function(){return new B(-this.x,-this.y)};B.prototype.NegativeSelf=function(){this.x=-this.x;this.y=-this.y};B.Make=function(A,F){if(A===undefined){A=0}if(F===undefined){F=0}return new B(A,F)};B.prototype.Copy=function(){return new B(this.x,this.y)};B.prototype.Add=function(A){this.x+=A.x;this.y+=A.y};B.prototype.Subtract=function(A){this.x-=A.x;this.y-=A.y};B.prototype.Multiply=function(A){if(A===undefined){A=0}this.x*=A;this.y*=A};B.prototype.MulM=function(A){var F=this.x;this.x=A.col1.x*F+A.col2.x*this.y;this.y=A.col1.y*F+A.col2.y*this.y};B.prototype.MulTM=function(A){var F=D.Dot(this,A.col1);this.y=D.Dot(this,A.col2);this.x=F};B.prototype.CrossVF=function(A){if(A===undefined){A=0}var F=this.x;this.x=A*this.y;this.y=-A*F};B.prototype.CrossFV=function(A){if(A===undefined){A=0}var F=this.x;this.x=-A*this.y;this.y=A*F};B.prototype.MinV=function(A){this.x=this.x<A.x?this.x:A.x;this.y=this.y<A.y?this.y:A.y};B.prototype.MaxV=function(A){this.x=this.x>A.x?this.x:A.x;this.y=this.y>A.y?this.y:A.y};B.prototype.Abs=function(){if(this.x<0){this.x=-this.x}if(this.y<0){this.y=-this.y}};B.prototype.Length=function(){return Math.sqrt(this.x*this.x+this.y*this.y)};B.prototype.LengthSquared=function(){return this.x*this.x+this.y*this.y};B.prototype.Normalize=function(){var A=Math.sqrt(this.x*this.x+this.y*this.y);if(A<Number.MIN_VALUE){return 0}var F=1/A;this.x*=F;this.y*=F;return A};B.prototype.IsValid=function(){return D.IsValid(this.x)&&D.IsValid(this.y)};E.b2Vec3=function(){};E.prototype.b2Vec3=function(F,G,A){if(F===undefined){F=0}if(G===undefined){G=0}if(A===undefined){A=0}this.x=F;this.y=G;this.z=A};E.prototype.SetZero=function(){this.x=this.y=this.z=0};E.prototype.Set=function(F,G,A){if(F===undefined){F=0}if(G===undefined){G=0}if(A===undefined){A=0}this.x=F;this.y=G;this.z=A};E.prototype.SetV=function(A){this.x=A.x;this.y=A.y;this.z=A.z};E.prototype.GetNegative=function(){return new E(-this.x,-this.y,-this.z)};E.prototype.NegativeSelf=function(){this.x=-this.x;this.y=-this.y;this.z=-this.z};E.prototype.Copy=function(){return new E(this.x,this.y,this.z)};E.prototype.Add=function(A){this.x+=A.x;this.y+=A.y;this.z+=A.z};E.prototype.Subtract=function(A){this.x-=A.x;this.y-=A.y;this.z-=A.z};E.prototype.Multiply=function(A){if(A===undefined){A=0}this.x*=A;this.y*=A;this.z*=A}})();(function(){var AI=Box2D.Common.Math.b2Math,AG=Box2D.Common.Math.b2Sweep,AB=Box2D.Common.Math.b2Transform,AC=Box2D.Common.Math.b2Vec2,AF=Box2D.Common.b2Color,AN=Box2D.Common.b2Settings,X=Box2D.Collision.b2AABB,AO=Box2D.Collision.b2ContactPoint,AM=Box2D.Collision.b2DynamicTreeBroadPhase,f=Box2D.Collision.b2RayCastInput,T=Box2D.Collision.b2RayCastOutput,t=Box2D.Collision.Shapes.b2CircleShape,x=Box2D.Collision.Shapes.b2EdgeShape,AD=Box2D.Collision.Shapes.b2MassData,P=Box2D.Collision.Shapes.b2PolygonShape,J=Box2D.Collision.Shapes.b2Shape,AS=Box2D.Dynamics.b2Body,AA=Box2D.Dynamics.b2BodyDef,AH=Box2D.Dynamics.b2ContactFilter,AK=Box2D.Dynamics.b2ContactImpulse,AE=Box2D.Dynamics.b2ContactListener,g=Box2D.Dynamics.b2ContactManager,AJ=Box2D.Dynamics.b2DebugDraw,e=Box2D.Dynamics.b2DestructionListener,m=Box2D.Dynamics.b2FilterData,b=Box2D.Dynamics.b2Fixture,AW=Box2D.Dynamics.b2FixtureDef,C=Box2D.Dynamics.b2Island,AV=Box2D.Dynamics.b2TimeStep,AU=Box2D.Dynamics.b2World,AR=Box2D.Dynamics.Contacts.b2Contact,AT=Box2D.Dynamics.Contacts.b2ContactFactory,AP=Box2D.Dynamics.Contacts.b2ContactSolver,AL=Box2D.Dynamics.Joints.b2Joint,AQ=Box2D.Dynamics.Joints.b2PulleyJoint;AS.b2Body=function(){this.m_xf=new AB;this.m_sweep=new AG;this.m_linearVelocity=new AC;this.m_force=new AC};AS.prototype.connectEdges=function(B,G,D){if(D===undefined){D=0}var A=Math.atan2(G.GetDirectionVector().y,G.GetDirectionVector().x);D=AI.MulFV(Math.tan((A-D)*0.5),G.GetDirectionVector());D=AI.SubtractVV(D,G.GetNormalVector());D=AI.MulFV(AN.b2_toiSlop,D);D=AI.AddVV(D,G.GetVertex1());var F=AI.AddVV(B.GetDirectionVector(),G.GetDirectionVector());F.Normalize();var E=AI.Dot(B.GetDirectionVector(),G.GetNormalVector())>0;B.SetNextEdge(G,D,F,E);G.SetPrevEdge(B,D,F,E);return A};AS.prototype.CreateFixture=function(A){if(this.m_world.IsLocked()==true){return null}var B=new b;B.Create(this,this.m_xf,A);this.m_flags&AS.e_activeFlag&&B.CreateProxy(this.m_world.m_contactManager.m_broadPhase,this.m_xf);B.m_next=this.m_fixtureList;this.m_fixtureList=B;++this.m_fixtureCount;B.m_body=this;B.m_density>0&&this.ResetMassData();this.m_world.m_flags|=AU.e_newFixture;return B};AS.prototype.CreateFixture2=function(A,D){if(D===undefined){D=0}var B=new AW;B.shape=A;B.density=D;return this.CreateFixture(B)};AS.prototype.DestroyFixture=function(B){if(this.m_world.IsLocked()!=true){for(var F=this.m_fixtureList,D=null;F!=null;){if(F==B){if(D){D.m_next=B.m_next}else{this.m_fixtureList=B.m_next}break}D=F;F=F.m_next}for(F=this.m_contactList;F;){D=F.contact;F=F.next;var A=D.GetFixtureA(),E=D.GetFixtureB();if(B==A||B==E){this.m_world.m_contactManager.Destroy(D)}}this.m_flags&AS.e_activeFlag&&B.DestroyProxy(this.m_world.m_contactManager.m_broadPhase);B.Destroy();B.m_body=null;B.m_next=null;--this.m_fixtureCount;this.ResetMassData()}};AS.prototype.SetPositionAndAngle=function(B,E){if(E===undefined){E=0}var D;if(this.m_world.IsLocked()!=true){this.m_xf.R.Set(E);this.m_xf.position.SetV(B);D=this.m_xf.R;var A=this.m_sweep.localCenter;this.m_sweep.c.x=D.col1.x*A.x+D.col2.x*A.y;this.m_sweep.c.y=D.col1.y*A.x+D.col2.y*A.y;this.m_sweep.c.x+=this.m_xf.position.x;this.m_sweep.c.y+=this.m_xf.position.y;this.m_sweep.c0.SetV(this.m_sweep.c);this.m_sweep.a0=this.m_sweep.a=E;A=this.m_world.m_contactManager.m_broadPhase;for(D=this.m_fixtureList;D;D=D.m_next){D.Synchronize(A,this.m_xf,this.m_xf)}this.m_world.m_contactManager.FindNewContacts()}};AS.prototype.SetTransform=function(A){this.SetPositionAndAngle(A.position,A.GetAngle())};AS.prototype.GetTransform=function(){return this.m_xf};AS.prototype.GetPosition=function(){return this.m_xf.position};AS.prototype.SetPosition=function(A){this.SetPositionAndAngle(A,this.GetAngle())};AS.prototype.GetAngle=function(){return this.m_sweep.a};AS.prototype.SetAngle=function(A){if(A===undefined){A=0}this.SetPositionAndAngle(this.GetPosition(),A)};AS.prototype.GetWorldCenter=function(){return this.m_sweep.c};AS.prototype.GetLocalCenter=function(){return this.m_sweep.localCenter};AS.prototype.SetLinearVelocity=function(A){this.m_type!=AS.b2_staticBody&&this.m_linearVelocity.SetV(A)};AS.prototype.GetLinearVelocity=function(){return this.m_linearVelocity};AS.prototype.SetAngularVelocity=function(A){if(A===undefined){A=0}if(this.m_type!=AS.b2_staticBody){this.m_angularVelocity=A}};AS.prototype.GetAngularVelocity=function(){return this.m_angularVelocity};AS.prototype.GetDefinition=function(){var A=new AA;A.type=this.GetType();A.allowSleep=(this.m_flags&AS.e_allowSleepFlag)==AS.e_allowSleepFlag;A.angle=this.GetAngle();A.angularDamping=this.m_angularDamping;A.angularVelocity=this.m_angularVelocity;A.fixedRotation=(this.m_flags&AS.e_fixedRotationFlag)==AS.e_fixedRotationFlag;A.bullet=(this.m_flags&AS.e_bulletFlag)==AS.e_bulletFlag;A.awake=(this.m_flags&AS.e_awakeFlag)==AS.e_awakeFlag;A.linearDamping=this.m_linearDamping;A.linearVelocity.SetV(this.GetLinearVelocity());A.position=this.GetPosition();A.userData=this.GetUserData();return A};AS.prototype.ApplyForce=function(A,B){if(this.m_type==AS.b2_dynamicBody){this.IsAwake()==false&&this.SetAwake(true);this.m_force.x+=A.x;this.m_force.y+=A.y;this.m_torque+=(B.x-this.m_sweep.c.x)*A.y-(B.y-this.m_sweep.c.y)*A.x}};AS.prototype.ApplyTorque=function(A){if(A===undefined){A=0}if(this.m_type==AS.b2_dynamicBody){this.IsAwake()==false&&this.SetAwake(true);this.m_torque+=A}};AS.prototype.ApplyImpulse=function(A,B){if(this.m_type==AS.b2_dynamicBody){this.IsAwake()==false&&this.SetAwake(true);this.m_linearVelocity.x+=this.m_invMass*A.x;this.m_linearVelocity.y+=this.m_invMass*A.y;this.m_angularVelocity+=this.m_invI*((B.x-this.m_sweep.c.x)*A.y-(B.y-this.m_sweep.c.y)*A.x)}};AS.prototype.Split=function(D){for(var I=this.GetLinearVelocity().Copy(),F=this.GetAngularVelocity(),B=this.GetWorldCenter(),H=this.m_world.CreateBody(this.GetDefinition()),G,A=this.m_fixtureList;A;){if(D(A)){var E=A.m_next;if(G){G.m_next=E}else{this.m_fixtureList=E}this.m_fixtureCount--;A.m_next=H.m_fixtureList;H.m_fixtureList=A;H.m_fixtureCount++;A.m_body=H;A=E}else{G=A;A=A.m_next}}this.ResetMassData();H.ResetMassData();G=this.GetWorldCenter();D=H.GetWorldCenter();G=AI.AddVV(I,AI.CrossFV(F,AI.SubtractVV(G,B)));I=AI.AddVV(I,AI.CrossFV(F,AI.SubtractVV(D,B)));this.SetLinearVelocity(G);H.SetLinearVelocity(I);this.SetAngularVelocity(F);H.SetAngularVelocity(F);this.SynchronizeFixtures();H.SynchronizeFixtures();return H};AS.prototype.Merge=function(B){var F;for(F=B.m_fixtureList;F;){var D=F.m_next;B.m_fixtureCount--;F.m_next=this.m_fixtureList;this.m_fixtureList=F;this.m_fixtureCount++;F.m_body=E;F=D}A.m_fixtureCount=0;var A=this,E=B;A.GetWorldCenter();E.GetWorldCenter();A.GetLinearVelocity().Copy();E.GetLinearVelocity().Copy();A.GetAngularVelocity();E.GetAngularVelocity();A.ResetMassData();this.SynchronizeFixtures()};AS.prototype.GetMass=function(){return this.m_mass};AS.prototype.GetInertia=function(){return this.m_I};AS.prototype.GetMassData=function(A){A.mass=this.m_mass;A.I=this.m_I;A.center.SetV(this.m_sweep.localCenter)};AS.prototype.SetMassData=function(A){AN.b2Assert(this.m_world.IsLocked()==false);if(this.m_world.IsLocked()!=true){if(this.m_type==AS.b2_dynamicBody){this.m_invI=this.m_I=this.m_invMass=0;this.m_mass=A.mass;if(this.m_mass<=0){this.m_mass=1}this.m_invMass=1/this.m_mass;if(A.I>0&&(this.m_flags&AS.e_fixedRotationFlag)==0){this.m_I=A.I-this.m_mass*(A.center.x*A.center.x+A.center.y*A.center.y);this.m_invI=1/this.m_I}var B=this.m_sweep.c.Copy();this.m_sweep.localCenter.SetV(A.center);this.m_sweep.c0.SetV(AI.MulX(this.m_xf,this.m_sweep.localCenter));this.m_sweep.c.SetV(this.m_sweep.c0);this.m_linearVelocity.x+=this.m_angularVelocity*-(this.m_sweep.c.y-B.y);this.m_linearVelocity.y+=this.m_angularVelocity*+(this.m_sweep.c.x-B.x)}}};AS.prototype.ResetMassData=function(){this.m_invI=this.m_I=this.m_invMass=this.m_mass=0;this.m_sweep.localCenter.SetZero();if(!(this.m_type==AS.b2_staticBody||this.m_type==AS.b2_kinematicBody)){for(var A=AC.Make(0,0),D=this.m_fixtureList;D;D=D.m_next){if(D.m_density!=0){var B=D.GetMassData();this.m_mass+=B.mass;A.x+=B.center.x*B.mass;A.y+=B.center.y*B.mass;this.m_I+=B.I}}if(this.m_mass>0){this.m_invMass=1/this.m_mass;A.x*=this.m_invMass;A.y*=this.m_invMass}else{this.m_invMass=this.m_mass=1}if(this.m_I>0&&(this.m_flags&AS.e_fixedRotationFlag)==0){this.m_I-=this.m_mass*(A.x*A.x+A.y*A.y);this.m_I*=this.m_inertiaScale;AN.b2Assert(this.m_I>0);this.m_invI=1/this.m_I}else{this.m_invI=this.m_I=0}D=this.m_sweep.c.Copy();this.m_sweep.localCenter.SetV(A);this.m_sweep.c0.SetV(AI.MulX(this.m_xf,this.m_sweep.localCenter));this.m_sweep.c.SetV(this.m_sweep.c0);this.m_linearVelocity.x+=this.m_angularVelocity*-(this.m_sweep.c.y-D.y);this.m_linearVelocity.y+=this.m_angularVelocity*+(this.m_sweep.c.x-D.x)}};AS.prototype.GetWorldPoint=function(A){var B=this.m_xf.R;A=new AC(B.col1.x*A.x+B.col2.x*A.y,B.col1.y*A.x+B.col2.y*A.y);A.x+=this.m_xf.position.x;A.y+=this.m_xf.position.y;return A};AS.prototype.GetWorldVector=function(A){return AI.MulMV(this.m_xf.R,A)};AS.prototype.GetLocalPoint=function(A){return AI.MulXT(this.m_xf,A)};AS.prototype.GetLocalVector=function(A){return AI.MulTMV(this.m_xf.R,A)};AS.prototype.GetLinearVelocityFromWorldPoint=function(A){return new AC(this.m_linearVelocity.x-this.m_angularVelocity*(A.y-this.m_sweep.c.y),this.m_linearVelocity.y+this.m_angularVelocity*(A.x-this.m_sweep.c.x))};AS.prototype.GetLinearVelocityFromLocalPoint=function(A){var B=this.m_xf.R;A=new AC(B.col1.x*A.x+B.col2.x*A.y,B.col1.y*A.x+B.col2.y*A.y);A.x+=this.m_xf.position.x;A.y+=this.m_xf.position.y;return new AC(this.m_linearVelocity.x-this.m_angularVelocity*(A.y-this.m_sweep.c.y),this.m_linearVelocity.y+this.m_angularVelocity*(A.x-this.m_sweep.c.x))};AS.prototype.GetLinearDamping=function(){return this.m_linearDamping};AS.prototype.SetLinearDamping=function(A){if(A===undefined){A=0}this.m_linearDamping=A};AS.prototype.GetAngularDamping=function(){return this.m_angularDamping};AS.prototype.SetAngularDamping=function(A){if(A===undefined){A=0}this.m_angularDamping=A};AS.prototype.SetType=function(A){if(A===undefined){A=0}if(this.m_type!=A){this.m_type=A;this.ResetMassData();if(this.m_type==AS.b2_staticBody){this.m_linearVelocity.SetZero();this.m_angularVelocity=0}this.SetAwake(true);this.m_force.SetZero();this.m_torque=0;for(A=this.m_contactList;A;A=A.next){A.contact.FlagForFiltering()}}};AS.prototype.GetType=function(){return this.m_type};AS.prototype.SetBullet=function(A){if(A){this.m_flags|=AS.e_bulletFlag}else{this.m_flags&=~AS.e_bulletFlag}};AS.prototype.IsBullet=function(){return(this.m_flags&AS.e_bulletFlag)==AS.e_bulletFlag};AS.prototype.SetSleepingAllowed=function(A){if(A){this.m_flags|=AS.e_allowSleepFlag}else{this.m_flags&=~AS.e_allowSleepFlag;this.SetAwake(true)}};AS.prototype.SetAwake=function(A){if(A){this.m_flags|=AS.e_awakeFlag;this.m_sleepTime=0}else{this.m_flags&=~AS.e_awakeFlag;this.m_sleepTime=0;this.m_linearVelocity.SetZero();this.m_angularVelocity=0;this.m_force.SetZero();this.m_torque=0}};AS.prototype.IsAwake=function(){return(this.m_flags&AS.e_awakeFlag)==AS.e_awakeFlag};AS.prototype.SetFixedRotation=function(A){if(A){this.m_flags|=AS.e_fixedRotationFlag}else{this.m_flags&=~AS.e_fixedRotationFlag}this.ResetMassData()};AS.prototype.IsFixedRotation=function(){return(this.m_flags&AS.e_fixedRotationFlag)==AS.e_fixedRotationFlag};AS.prototype.SetActive=function(A){if(A!=this.IsActive()){var B;if(A){this.m_flags|=AS.e_activeFlag;A=this.m_world.m_contactManager.m_broadPhase;for(B=this.m_fixtureList;B;B=B.m_next){B.CreateProxy(A,this.m_xf)}}else{this.m_flags&=~AS.e_activeFlag;A=this.m_world.m_contactManager.m_broadPhase;for(B=this.m_fixtureList;B;B=B.m_next){B.DestroyProxy(A)}for(A=this.m_contactList;A;){B=A;A=A.next;this.m_world.m_contactManager.Destroy(B.contact)}this.m_contactList=null}}};AS.prototype.IsActive=function(){return(this.m_flags&AS.e_activeFlag)==AS.e_activeFlag};AS.prototype.IsSleepingAllowed=function(){return(this.m_flags&AS.e_allowSleepFlag)==AS.e_allowSleepFlag};AS.prototype.GetFixtureList=function(){return this.m_fixtureList};AS.prototype.GetJointList=function(){return this.m_jointList};AS.prototype.GetControllerList=function(){return this.m_controllerList};AS.prototype.GetContactList=function(){return this.m_contactList};AS.prototype.GetNext=function(){return this.m_next};AS.prototype.GetUserData=function(){return this.m_userData};AS.prototype.SetUserData=function(A){this.m_userData=A};AS.prototype.GetWorld=function(){return this.m_world};AS.prototype.b2Body=function(B,E){this.m_flags=0;if(B.bullet){this.m_flags|=AS.e_bulletFlag}if(B.fixedRotation){this.m_flags|=AS.e_fixedRotationFlag}if(B.allowSleep){this.m_flags|=AS.e_allowSleepFlag}if(B.awake){this.m_flags|=AS.e_awakeFlag}if(B.active){this.m_flags|=AS.e_activeFlag}this.m_world=E;this.m_xf.position.SetV(B.position);this.m_xf.R.Set(B.angle);this.m_sweep.localCenter.SetZero();this.m_sweep.t0=1;this.m_sweep.a0=this.m_sweep.a=B.angle;var D=this.m_xf.R,A=this.m_sweep.localCenter;this.m_sweep.c.x=D.col1.x*A.x+D.col2.x*A.y;this.m_sweep.c.y=D.col1.y*A.x+D.col2.y*A.y;this.m_sweep.c.x+=this.m_xf.position.x;this.m_sweep.c.y+=this.m_xf.position.y;this.m_sweep.c0.SetV(this.m_sweep.c);this.m_contactList=this.m_controllerList=this.m_jointList=null;this.m_controllerCount=0;this.m_next=this.m_prev=null;this.m_linearVelocity.SetV(B.linearVelocity);this.m_angularVelocity=B.angularVelocity;this.m_linearDamping=B.linearDamping;this.m_angularDamping=B.angularDamping;this.m_force.Set(0,0);this.m_sleepTime=this.m_torque=0;this.m_type=B.type;if(this.m_type==AS.b2_dynamicBody){this.m_invMass=this.m_mass=1}else{this.m_invMass=this.m_mass=0}this.m_invI=this.m_I=0;this.m_inertiaScale=B.inertiaScale;this.m_userData=B.userData;this.m_fixtureList=null;this.m_fixtureCount=0};AS.prototype.SynchronizeFixtures=function(){var A=AS.s_xf1;A.R.Set(this.m_sweep.a0);var D=A.R,B=this.m_sweep.localCenter;A.position.x=this.m_sweep.c0.x-(D.col1.x*B.x+D.col2.x*B.y);A.position.y=this.m_sweep.c0.y-(D.col1.y*B.x+D.col2.y*B.y);B=this.m_world.m_contactManager.m_broadPhase;for(D=this.m_fixtureList;D;D=D.m_next){D.Synchronize(B,A,this.m_xf)}};AS.prototype.SynchronizeTransform=function(){this.m_xf.R.Set(this.m_sweep.a);var A=this.m_xf.R,B=this.m_sweep.localCenter;this.m_xf.position.x=this.m_sweep.c.x-(A.col1.x*B.x+A.col2.x*B.y);this.m_xf.position.y=this.m_sweep.c.y-(A.col1.y*B.x+A.col2.y*B.y)};AS.prototype.ShouldCollide=function(A){if(this.m_type!=AS.b2_dynamicBody&&A.m_type!=AS.b2_dynamicBody){return false}for(var B=this.m_jointList;B;B=B.next){if(B.other==A){if(B.joint.m_collideConnected==false){return false}}}return true};AS.prototype.Advance=function(A){if(A===undefined){A=0}this.m_sweep.Advance(A);this.m_sweep.c.SetV(this.m_sweep.c0);this.m_sweep.a=this.m_sweep.a0;this.SynchronizeTransform()};Box2D.postDefs.push(function(){Box2D.Dynamics.b2Body.s_xf1=new AB;Box2D.Dynamics.b2Body.e_islandFlag=1;Box2D.Dynamics.b2Body.e_awakeFlag=2;Box2D.Dynamics.b2Body.e_allowSleepFlag=4;Box2D.Dynamics.b2Body.e_bulletFlag=8;Box2D.Dynamics.b2Body.e_fixedRotationFlag=16;Box2D.Dynamics.b2Body.e_activeFlag=32;Box2D.Dynamics.b2Body.b2_staticBody=0;Box2D.Dynamics.b2Body.b2_kinematicBody=1;Box2D.Dynamics.b2Body.b2_dynamicBody=2});AA.b2BodyDef=function(){this.position=new AC;this.linearVelocity=new AC};AA.prototype.b2BodyDef=function(){this.userData=null;this.position.Set(0,0);this.angle=0;this.linearVelocity.Set(0,0);this.angularDamping=this.linearDamping=this.angularVelocity=0;this.awake=this.allowSleep=true;this.bullet=this.fixedRotation=false;this.type=AS.b2_staticBody;this.active=true;this.inertiaScale=1};AH.b2ContactFilter=function(){};AH.prototype.ShouldCollide=function(B,E){var D=B.GetFilterData(),A=E.GetFilterData();if(D.groupIndex==A.groupIndex&&D.groupIndex!=0){return D.groupIndex>0}return(D.maskBits&A.categoryBits)!=0&&(D.categoryBits&A.maskBits)!=0};AH.prototype.RayCollide=function(A,B){if(!A){return true}return this.ShouldCollide(A instanceof b?A:null,B)};Box2D.postDefs.push(function(){Box2D.Dynamics.b2ContactFilter.b2_defaultFilter=new AH});AK.b2ContactImpulse=function(){this.normalImpulses=new Vector_a2j_Number(AN.b2_maxManifoldPoints);this.tangentImpulses=new Vector_a2j_Number(AN.b2_maxManifoldPoints)};AE.b2ContactListener=function(){};AE.prototype.BeginContact=function(){};AE.prototype.EndContact=function(){};AE.prototype.PreSolve=function(){};AE.prototype.PostSolve=function(){};Box2D.postDefs.push(function(){Box2D.Dynamics.b2ContactListener.b2_defaultListener=new AE});g.b2ContactManager=function(){};g.prototype.b2ContactManager=function(){this.m_world=null;this.m_contactCount=0;this.m_contactFilter=AH.b2_defaultFilter;this.m_contactListener=AE.b2_defaultListener;this.m_contactFactory=new AT(this.m_allocator);this.m_broadPhase=new AM};g.prototype.AddPair=function(I,G){var D=I instanceof b?I:null,H=G instanceof b?G:null,F=D.GetBody(),E=H.GetBody();if(F!=E){for(var B=E.GetContactList();B;){if(B.other==F){var A=B.contact.GetFixtureA(),K=B.contact.GetFixtureB();if(A==D&&K==H){return}if(A==H&&K==D){return}}B=B.next}if(E.ShouldCollide(F)!=false){if(this.m_contactFilter.ShouldCollide(D,H)!=false){B=this.m_contactFactory.Create(D,H);D=B.GetFixtureA();H=B.GetFixtureB();F=D.m_body;E=H.m_body;B.m_prev=null;B.m_next=this.m_world.m_contactList;if(this.m_world.m_contactList!=null){this.m_world.m_contactList.m_prev=B}this.m_world.m_contactList=B;B.m_nodeA.contact=B;B.m_nodeA.other=E;B.m_nodeA.prev=null;B.m_nodeA.next=F.m_contactList;if(F.m_contactList!=null){F.m_contactList.prev=B.m_nodeA}F.m_contactList=B.m_nodeA;B.m_nodeB.contact=B;B.m_nodeB.other=F;B.m_nodeB.prev=null;B.m_nodeB.next=E.m_contactList;if(E.m_contactList!=null){E.m_contactList.prev=B.m_nodeB}E.m_contactList=B.m_nodeB;++this.m_world.m_contactCount}}}};g.prototype.FindNewContacts=function(){this.m_broadPhase.UpdatePairs(Box2D.generateCallback(this,this.AddPair))};g.prototype.Destroy=function(A){var D=A.GetFixtureA(),B=A.GetFixtureB();D=D.GetBody();B=B.GetBody();A.IsTouching()&&this.m_contactListener.EndContact(A);if(A.m_prev){A.m_prev.m_next=A.m_next}if(A.m_next){A.m_next.m_prev=A.m_prev}if(A==this.m_world.m_contactList){this.m_world.m_contactList=A.m_next}if(A.m_nodeA.prev){A.m_nodeA.prev.next=A.m_nodeA.next}if(A.m_nodeA.next){A.m_nodeA.next.prev=A.m_nodeA.prev}if(A.m_nodeA==D.m_contactList){D.m_contactList=A.m_nodeA.next}if(A.m_nodeB.prev){A.m_nodeB.prev.next=A.m_nodeB.next}if(A.m_nodeB.next){A.m_nodeB.next.prev=A.m_nodeB.prev}if(A.m_nodeB==B.m_contactList){B.m_contactList=A.m_nodeB.next}this.m_contactFactory.Destroy(A);--this.m_contactCount};g.prototype.Collide=function(){for(var B=this.m_world.m_contactList;B;){var F=B.GetFixtureA(),D=B.GetFixtureB(),A=F.GetBody(),E=D.GetBody();if(A.IsAwake()==false&&E.IsAwake()==false){B=B.GetNext()}else{if(B.m_flags&AR.e_filterFlag){if(E.ShouldCollide(A)==false){F=B;B=F.GetNext();this.Destroy(F);continue}if(this.m_contactFilter.ShouldCollide(F,D)==false){F=B;B=F.GetNext();this.Destroy(F);continue}B.m_flags&=~AR.e_filterFlag}if(this.m_broadPhase.TestOverlap(F.m_proxy,D.m_proxy)==false){F=B;B=F.GetNext();this.Destroy(F)}else{B.Update(this.m_contactListener);B=B.GetNext()}}}};Box2D.postDefs.push(function(){Box2D.Dynamics.b2ContactManager.s_evalCP=new AO});AJ.b2DebugDraw=function(){};AJ.prototype.b2DebugDraw=function(){};AJ.prototype.SetFlags=function(){};AJ.prototype.GetFlags=function(){};AJ.prototype.AppendFlags=function(){};AJ.prototype.ClearFlags=function(){};AJ.prototype.SetSprite=function(){};AJ.prototype.GetSprite=function(){};AJ.prototype.SetDrawScale=function(){};AJ.prototype.GetDrawScale=function(){};AJ.prototype.SetLineThickness=function(){};AJ.prototype.GetLineThickness=function(){};AJ.prototype.SetAlpha=function(){};AJ.prototype.GetAlpha=function(){};AJ.prototype.SetFillAlpha=function(){};AJ.prototype.GetFillAlpha=function(){};AJ.prototype.SetXFormScale=function(){};AJ.prototype.GetXFormScale=function(){};AJ.prototype.DrawPolygon=function(){};AJ.prototype.DrawSolidPolygon=function(){};AJ.prototype.DrawCircle=function(){};AJ.prototype.DrawSolidCircle=function(){};AJ.prototype.DrawSegment=function(){};AJ.prototype.DrawTransform=function(){};Box2D.postDefs.push(function(){Box2D.Dynamics.b2DebugDraw.e_shapeBit=1;Box2D.Dynamics.b2DebugDraw.e_jointBit=2;Box2D.Dynamics.b2DebugDraw.e_aabbBit=4;Box2D.Dynamics.b2DebugDraw.e_pairBit=8;Box2D.Dynamics.b2DebugDraw.e_centerOfMassBit=16;Box2D.Dynamics.b2DebugDraw.e_controllerBit=32});e.b2DestructionListener=function(){};e.prototype.SayGoodbyeJoint=function(){};e.prototype.SayGoodbyeFixture=function(){};m.b2FilterData=function(){this.categoryBits=1;this.maskBits=65535;this.groupIndex=0};m.prototype.Copy=function(){var A=new m;A.categoryBits=this.categoryBits;A.maskBits=this.maskBits;A.groupIndex=this.groupIndex;return A};b.b2Fixture=function(){this.m_filter=new m};b.prototype.GetType=function(){return this.m_shape.GetType()};b.prototype.GetShape=function(){return this.m_shape};b.prototype.SetSensor=function(B){if(this.m_isSensor!=B){this.m_isSensor=B;if(this.m_body!=null){for(B=this.m_body.GetContactList();B;){var E=B.contact,D=E.GetFixtureA(),A=E.GetFixtureB();if(D==this||A==this){E.SetSensor(D.IsSensor()||A.IsSensor())}B=B.next}}}};b.prototype.IsSensor=function(){return this.m_isSensor};b.prototype.SetFilterData=function(B){this.m_filter=B.Copy();if(!this.m_body){for(B=this.m_body.GetContactList();B;){var E=B.contact,D=E.GetFixtureA(),A=E.GetFixtureB();if(D==this||A==this){E.FlagForFiltering()}B=B.next}}};b.prototype.GetFilterData=function(){return this.m_filter.Copy()};b.prototype.GetBody=function(){return this.m_body};b.prototype.GetNext=function(){return this.m_next};b.prototype.GetUserData=function(){return this.m_userData};b.prototype.SetUserData=function(A){this.m_userData=A};b.prototype.TestPoint=function(A){return this.m_shape.TestPoint(this.m_body.GetTransform(),A)};b.prototype.RayCast=function(A,B){return this.m_shape.RayCast(A,B,this.m_body.GetTransform())};b.prototype.GetMassData=function(A){if(A===undefined){A=null}if(A==null){A=new AD}this.m_shape.ComputeMass(A,this.m_density);return A};b.prototype.SetDensity=function(A){if(A===undefined){A=0}this.m_density=A};b.prototype.GetDensity=function(){return this.m_density};b.prototype.GetFriction=function(){return this.m_friction};b.prototype.SetFriction=function(A){if(A===undefined){A=0}this.m_friction=A};b.prototype.GetRestitution=function(){return this.m_restitution};b.prototype.SetRestitution=function(A){if(A===undefined){A=0}this.m_restitution=A};b.prototype.GetAABB=function(){return this.m_aabb};b.prototype.b2Fixture=function(){this.m_aabb=new X;this.m_shape=this.m_next=this.m_body=this.m_userData=null;this.m_restitution=this.m_friction=this.m_density=0};b.prototype.Create=function(A,D,B){this.m_userData=B.userData;this.m_friction=B.friction;this.m_restitution=B.restitution;this.m_body=A;this.m_next=null;this.m_filter=B.filter.Copy();this.m_isSensor=B.isSensor;this.m_shape=B.shape.Copy();this.m_density=B.density};b.prototype.Destroy=function(){this.m_shape=null};b.prototype.CreateProxy=function(A,B){this.m_shape.ComputeAABB(this.m_aabb,B);this.m_proxy=A.CreateProxy(this.m_aabb,this)};b.prototype.DestroyProxy=function(A){if(this.m_proxy!=null){A.DestroyProxy(this.m_proxy);this.m_proxy=null}};b.prototype.Synchronize=function(B,F,D){if(this.m_proxy){var A=new X,E=new X;this.m_shape.ComputeAABB(A,F);this.m_shape.ComputeAABB(E,D);this.m_aabb.Combine(A,E);F=AI.SubtractVV(D.position,F.position);B.MoveProxy(this.m_proxy,this.m_aabb,F)}};AW.b2FixtureDef=function(){this.filter=new m};AW.prototype.b2FixtureDef=function(){this.userData=this.shape=null;this.friction=0.2;this.density=this.restitution=0;this.filter.categoryBits=1;this.filter.maskBits=65535;this.filter.groupIndex=0;this.isSensor=false};C.b2Island=function(){};C.prototype.b2Island=function(){this.m_bodies=new Vector;this.m_contacts=new Vector;this.m_joints=new Vector};C.prototype.Initialize=function(D,H,E,B,G,F){if(D===undefined){D=0}if(H===undefined){H=0}if(E===undefined){E=0}var A=0;this.m_bodyCapacity=D;this.m_contactCapacity=H;this.m_jointCapacity=E;this.m_jointCount=this.m_contactCount=this.m_bodyCount=0;this.m_allocator=B;this.m_listener=G;this.m_contactSolver=F;for(A=this.m_bodies.length;A<D;A++){this.m_bodies[A]=null}for(A=this.m_contacts.length;A<H;A++){this.m_contacts[A]=null}for(A=this.m_joints.length;A<E;A++){this.m_joints[A]=null}};C.prototype.Clear=function(){this.m_jointCount=this.m_contactCount=this.m_bodyCount=0};C.prototype.Solve=function(D,I,F){var B=0,H=0,G;for(B=0;B<this.m_bodyCount;++B){H=this.m_bodies[B];if(H.GetType()==AS.b2_dynamicBody){H.m_linearVelocity.x+=D.dt*(I.x+H.m_invMass*H.m_force.x);H.m_linearVelocity.y+=D.dt*(I.y+H.m_invMass*H.m_force.y);H.m_angularVelocity+=D.dt*H.m_invI*H.m_torque;H.m_linearVelocity.Multiply(AI.Clamp(1-D.dt*H.m_linearDamping,0,1));H.m_angularVelocity*=AI.Clamp(1-D.dt*H.m_angularDamping,0,1)}}this.m_contactSolver.Initialize(D,this.m_contacts,this.m_contactCount,this.m_allocator);I=this.m_contactSolver;I.InitVelocityConstraints(D);for(B=0;B<this.m_jointCount;++B){G=this.m_joints[B];G.InitVelocityConstraints(D)}for(B=0;B<D.velocityIterations;++B){for(H=0;H<this.m_jointCount;++H){G=this.m_joints[H];G.SolveVelocityConstraints(D)}I.SolveVelocityConstraints()}for(B=0;B<this.m_jointCount;++B){G=this.m_joints[B];G.FinalizeVelocityConstraints()}I.FinalizeVelocityConstraints();for(B=0;B<this.m_bodyCount;++B){H=this.m_bodies[B];if(H.GetType()!=AS.b2_staticBody){var A=D.dt*H.m_linearVelocity.x,E=D.dt*H.m_linearVelocity.y;if(A*A+E*E>AN.b2_maxTranslationSquared){H.m_linearVelocity.Normalize();H.m_linearVelocity.x*=AN.b2_maxTranslation*D.inv_dt;H.m_linearVelocity.y*=AN.b2_maxTranslation*D.inv_dt}A=D.dt*H.m_angularVelocity;if(A*A>AN.b2_maxRotationSquared){H.m_angularVelocity=H.m_angularVelocity<0?-AN.b2_maxRotation*D.inv_dt:AN.b2_maxRotation*D.inv_dt}H.m_sweep.c0.SetV(H.m_sweep.c);H.m_sweep.a0=H.m_sweep.a;H.m_sweep.c.x+=D.dt*H.m_linearVelocity.x;H.m_sweep.c.y+=D.dt*H.m_linearVelocity.y;H.m_sweep.a+=D.dt*H.m_angularVelocity;H.SynchronizeTransform()}}for(B=0;B<D.positionIterations;++B){A=I.SolvePositionConstraints(AN.b2_contactBaumgarte);E=true;for(H=0;H<this.m_jointCount;++H){G=this.m_joints[H];G=G.SolvePositionConstraints(AN.b2_contactBaumgarte);E=E&&G}if(A&&E){break}}this.Report(I.m_constraints);if(F){F=Number.MAX_VALUE;I=AN.b2_linearSleepTolerance*AN.b2_linearSleepTolerance;A=AN.b2_angularSleepTolerance*AN.b2_angularSleepTolerance;for(B=0;B<this.m_bodyCount;++B){H=this.m_bodies[B];if(H.GetType()!=AS.b2_staticBody){if((H.m_flags&AS.e_allowSleepFlag)==0){F=H.m_sleepTime=0}if((H.m_flags&AS.e_allowSleepFlag)==0||H.m_angularVelocity*H.m_angularVelocity>A||AI.Dot(H.m_linearVelocity,H.m_linearVelocity)>I){F=H.m_sleepTime=0}else{H.m_sleepTime+=D.dt;F=AI.Min(F,H.m_sleepTime)}}}if(F>=AN.b2_timeToSleep){for(B=0;B<this.m_bodyCount;++B){H=this.m_bodies[B];H.SetAwake(false)}}}};C.prototype.SolveTOI=function(D){var H=0,E=0;this.m_contactSolver.Initialize(D,this.m_contacts,this.m_contactCount,this.m_allocator);var B=this.m_contactSolver;for(H=0;H<this.m_jointCount;++H){this.m_joints[H].InitVelocityConstraints(D)}for(H=0;H<D.velocityIterations;++H){B.SolveVelocityConstraints();for(E=0;E<this.m_jointCount;++E){this.m_joints[E].SolveVelocityConstraints(D)}}for(H=0;H<this.m_bodyCount;++H){E=this.m_bodies[H];if(E.GetType()!=AS.b2_staticBody){var G=D.dt*E.m_linearVelocity.x,F=D.dt*E.m_linearVelocity.y;if(G*G+F*F>AN.b2_maxTranslationSquared){E.m_linearVelocity.Normalize();E.m_linearVelocity.x*=AN.b2_maxTranslation*D.inv_dt;E.m_linearVelocity.y*=AN.b2_maxTranslation*D.inv_dt}G=D.dt*E.m_angularVelocity;if(G*G>AN.b2_maxRotationSquared){E.m_angularVelocity=E.m_angularVelocity<0?-AN.b2_maxRotation*D.inv_dt:AN.b2_maxRotation*D.inv_dt}E.m_sweep.c0.SetV(E.m_sweep.c);E.m_sweep.a0=E.m_sweep.a;E.m_sweep.c.x+=D.dt*E.m_linearVelocity.x;E.m_sweep.c.y+=D.dt*E.m_linearVelocity.y;E.m_sweep.a+=D.dt*E.m_angularVelocity;E.SynchronizeTransform()}}for(H=0;H<D.positionIterations;++H){G=B.SolvePositionConstraints(0.75);F=true;for(E=0;E<this.m_jointCount;++E){var A=this.m_joints[E].SolvePositionConstraints(AN.b2_contactBaumgarte);F=F&&A}if(G&&F){break}}this.Report(B.m_constraints)};C.prototype.Report=function(B){if(this.m_listener!=null){for(var F=0;F<this.m_contactCount;++F){for(var D=this.m_contacts[F],A=B[F],E=0;E<A.pointCount;++E){C.s_impulse.normalImpulses[E]=A.points[E].normalImpulse;C.s_impulse.tangentImpulses[E]=A.points[E].tangentImpulse}this.m_listener.PostSolve(D,C.s_impulse)}}};C.prototype.AddBody=function(A){A.m_islandIndex=this.m_bodyCount;this.m_bodies[this.m_bodyCount++]=A};C.prototype.AddContact=function(A){this.m_contacts[this.m_contactCount++]=A};C.prototype.AddJoint=function(A){this.m_joints[this.m_jointCount++]=A};Box2D.postDefs.push(function(){Box2D.Dynamics.b2Island.s_impulse=new AK});AV.b2TimeStep=function(){};AV.prototype.Set=function(A){this.dt=A.dt;this.inv_dt=A.inv_dt;this.positionIterations=A.positionIterations;this.velocityIterations=A.velocityIterations;this.warmStarting=A.warmStarting};AU.b2World=function(){this.s_stack=new Vector;this.m_contactManager=new g;this.m_contactSolver=new AP;this.m_island=new C};AU.prototype.b2World=function(A,B){this.m_controllerList=this.m_jointList=this.m_contactList=this.m_bodyList=this.m_debugDraw=this.m_destructionListener=null;this.m_controllerCount=this.m_jointCount=this.m_contactCount=this.m_bodyCount=0;AU.m_warmStarting=true;AU.m_continuousPhysics=true;this.m_allowSleep=B;this.m_gravity=A;this.m_inv_dt0=0;this.m_contactManager.m_world=this;this.m_groundBody=this.CreateBody(new AA)};AU.prototype.SetDestructionListener=function(A){this.m_destructionListener=A};AU.prototype.SetContactFilter=function(A){this.m_contactManager.m_contactFilter=A};AU.prototype.SetContactListener=function(A){this.m_contactManager.m_contactListener=A};AU.prototype.SetDebugDraw=function(A){this.m_debugDraw=A};AU.prototype.SetBroadPhase=function(B){var E=this.m_contactManager.m_broadPhase;this.m_contactManager.m_broadPhase=B;for(var D=this.m_bodyList;D;D=D.m_next){for(var A=D.m_fixtureList;A;A=A.m_next){A.m_proxy=B.CreateProxy(E.GetFatAABB(A.m_proxy),A)}}};AU.prototype.Validate=function(){this.m_contactManager.m_broadPhase.Validate()};AU.prototype.GetProxyCount=function(){return this.m_contactManager.m_broadPhase.GetProxyCount()};AU.prototype.CreateBody=function(A){if(this.IsLocked()==true){return null}A=new AS(A,this);A.m_prev=null;if(A.m_next=this.m_bodyList){this.m_bodyList.m_prev=A}this.m_bodyList=A;++this.m_bodyCount;return A};AU.prototype.DestroyBody=function(A){if(this.IsLocked()!=true){for(var D=A.m_jointList;D;){var B=D;D=D.next;this.m_destructionListener&&this.m_destructionListener.SayGoodbyeJoint(B.joint);this.DestroyJoint(B.joint)}for(D=A.m_controllerList;D;){B=D;D=D.nextController;B.controller.RemoveBody(A)}for(D=A.m_contactList;D;){B=D;D=D.next;this.m_contactManager.Destroy(B.contact)}A.m_contactList=null;for(D=A.m_fixtureList;D;){B=D;D=D.m_next;this.m_destructionListener&&this.m_destructionListener.SayGoodbyeFixture(B);B.DestroyProxy(this.m_contactManager.m_broadPhase);B.Destroy()}A.m_fixtureList=null;A.m_fixtureCount=0;if(A.m_prev){A.m_prev.m_next=A.m_next}if(A.m_next){A.m_next.m_prev=A.m_prev}if(A==this.m_bodyList){this.m_bodyList=A.m_next}--this.m_bodyCount}};AU.prototype.CreateJoint=function(B){var E=AL.Create(B,null);E.m_prev=null;if(E.m_next=this.m_jointList){this.m_jointList.m_prev=E}this.m_jointList=E;++this.m_jointCount;E.m_edgeA.joint=E;E.m_edgeA.other=E.m_bodyB;E.m_edgeA.prev=null;if(E.m_edgeA.next=E.m_bodyA.m_jointList){E.m_bodyA.m_jointList.prev=E.m_edgeA}E.m_bodyA.m_jointList=E.m_edgeA;E.m_edgeB.joint=E;E.m_edgeB.other=E.m_bodyA;E.m_edgeB.prev=null;if(E.m_edgeB.next=E.m_bodyB.m_jointList){E.m_bodyB.m_jointList.prev=E.m_edgeB}E.m_bodyB.m_jointList=E.m_edgeB;var D=B.bodyA,A=B.bodyB;if(B.collideConnected==false){for(B=A.GetContactList();B;){B.other==D&&B.contact.FlagForFiltering();B=B.next}}return E};AU.prototype.DestroyJoint=function(B){var E=B.m_collideConnected;if(B.m_prev){B.m_prev.m_next=B.m_next}if(B.m_next){B.m_next.m_prev=B.m_prev}if(B==this.m_jointList){this.m_jointList=B.m_next}var D=B.m_bodyA,A=B.m_bodyB;D.SetAwake(true);A.SetAwake(true);if(B.m_edgeA.prev){B.m_edgeA.prev.next=B.m_edgeA.next}if(B.m_edgeA.next){B.m_edgeA.next.prev=B.m_edgeA.prev}if(B.m_edgeA==D.m_jointList){D.m_jointList=B.m_edgeA.next}B.m_edgeA.prev=null;B.m_edgeA.next=null;if(B.m_edgeB.prev){B.m_edgeB.prev.next=B.m_edgeB.next}if(B.m_edgeB.next){B.m_edgeB.next.prev=B.m_edgeB.prev}if(B.m_edgeB==A.m_jointList){A.m_jointList=B.m_edgeB.next}B.m_edgeB.prev=null;B.m_edgeB.next=null;AL.Destroy(B,null);--this.m_jointCount;if(E==false){for(B=A.GetContactList();B;){B.other==D&&B.contact.FlagForFiltering();B=B.next}}};AU.prototype.AddController=function(A){A.m_next=this.m_controllerList;A.m_prev=null;this.m_controllerList=A;A.m_world=this;this.m_controllerCount++;return A};AU.prototype.RemoveController=function(A){if(A.m_prev){A.m_prev.m_next=A.m_next}if(A.m_next){A.m_next.m_prev=A.m_prev}if(this.m_controllerList==A){this.m_controllerList=A.m_next}this.m_controllerCount--};AU.prototype.CreateController=function(A){if(A.m_world!=this){throw Error("Controller can only be a member of one world")}A.m_next=this.m_controllerList;A.m_prev=null;if(this.m_controllerList){this.m_controllerList.m_prev=A}this.m_controllerList=A;++this.m_controllerCount;A.m_world=this;return A};AU.prototype.DestroyController=function(A){A.Clear();if(A.m_next){A.m_next.m_prev=A.m_prev}if(A.m_prev){A.m_prev.m_next=A.m_next}if(A==this.m_controllerList){this.m_controllerList=A.m_next}--this.m_controllerCount};AU.prototype.SetWarmStarting=function(A){AU.m_warmStarting=A};AU.prototype.SetContinuousPhysics=function(A){AU.m_continuousPhysics=A};AU.prototype.GetBodyCount=function(){return this.m_bodyCount};AU.prototype.GetJointCount=function(){return this.m_jointCount};AU.prototype.GetContactCount=function(){return this.m_contactCount};AU.prototype.SetGravity=function(A){this.m_gravity=A};AU.prototype.GetGravity=function(){return this.m_gravity};AU.prototype.GetGroundBody=function(){return this.m_groundBody};AU.prototype.Step=function(B,E,D){if(B===undefined){B=0}if(E===undefined){E=0}if(D===undefined){D=0}if(this.m_flags&AU.e_newFixture){this.m_contactManager.FindNewContacts();this.m_flags&=~AU.e_newFixture}this.m_flags|=AU.e_locked;var A=AU.s_timestep2;A.dt=B;A.velocityIterations=E;A.positionIterations=D;A.inv_dt=B>0?1/B:0;A.dtRatio=this.m_inv_dt0*B;A.warmStarting=AU.m_warmStarting;this.m_contactManager.Collide();A.dt>0&&this.Solve(A);AU.m_continuousPhysics&&A.dt>0&&this.SolveTOI(A);if(A.dt>0){this.m_inv_dt0=A.inv_dt}this.m_flags&=~AU.e_locked};AU.prototype.ClearForces=function(){for(var A=this.m_bodyList;A;A=A.m_next){A.m_force.SetZero();A.m_torque=0}};AU.prototype.DrawDebugData=function(){if(this.m_debugDraw!=null){this.m_debugDraw.m_sprite.graphics.clear();var D=this.m_debugDraw.GetFlags(),H,E,B;new AC;new AC;new AC;var G;new X;new X;G=[new AC,new AC,new AC,new AC];var F=new AF(0,0,0);if(D&AJ.e_shapeBit){for(H=this.m_bodyList;H;H=H.m_next){G=H.m_xf;for(E=H.GetFixtureList();E;E=E.m_next){B=E.GetShape();if(H.IsActive()==false){F.Set(0.5,0.5,0.3)}else{if(H.GetType()==AS.b2_staticBody){F.Set(0.5,0.9,0.5)}else{if(H.GetType()==AS.b2_kinematicBody){F.Set(0.5,0.5,0.9)}else{H.IsAwake()==false?F.Set(0.6,0.6,0.6):F.Set(0.9,0.7,0.7)}}}this.DrawShape(B,G,F)}}}if(D&AJ.e_jointBit){for(H=this.m_jointList;H;H=H.m_next){this.DrawJoint(H)}}if(D&AJ.e_controllerBit){for(H=this.m_controllerList;H;H=H.m_next){H.Draw(this.m_debugDraw)}}if(D&AJ.e_pairBit){F.Set(0.3,0.9,0.9);for(H=this.m_contactManager.m_contactList;H;H=H.GetNext()){B=H.GetFixtureA();E=H.GetFixtureB();B=B.GetAABB().GetCenter();E=E.GetAABB().GetCenter();this.m_debugDraw.DrawSegment(B,E,F)}}if(D&AJ.e_aabbBit){B=this.m_contactManager.m_broadPhase;G=[new AC,new AC,new AC,new AC];for(H=this.m_bodyList;H;H=H.GetNext()){if(H.IsActive()!=false){for(E=H.GetFixtureList();E;E=E.GetNext()){var A=B.GetFatAABB(E.m_proxy);G[0].Set(A.lowerBound.x,A.lowerBound.y);G[1].Set(A.upperBound.x,A.lowerBound.y);G[2].Set(A.upperBound.x,A.upperBound.y);G[3].Set(A.lowerBound.x,A.upperBound.y);this.m_debugDraw.DrawPolygon(G,4,F)}}}}if(D&AJ.e_centerOfMassBit){for(H=this.m_bodyList;H;H=H.m_next){G=AU.s_xf;G.R=H.m_xf.R;G.position=H.GetWorldCenter();this.m_debugDraw.DrawTransform(G)}}}};AU.prototype.QueryAABB=function(A,D){var B=this.m_contactManager.m_broadPhase;B.Query(function(E){return A(B.GetUserData(E))},D)};AU.prototype.QueryShape=function(B,F,D){if(D===undefined){D=null}if(D==null){D=new AB;D.SetIdentity()}var A=this.m_contactManager.m_broadPhase,E=new X;F.ComputeAABB(E,D);A.Query(function(G){G=A.GetUserData(G) instanceof b?A.GetUserData(G):null;if(J.TestOverlap(F,D,G.GetShape(),G.GetBody().GetTransform())){return B(G)}return true},E)};AU.prototype.QueryPoint=function(B,E){var D=this.m_contactManager.m_broadPhase,A=new X;A.lowerBound.Set(E.x-AN.b2_linearSlop,E.y-AN.b2_linearSlop);A.upperBound.Set(E.x+AN.b2_linearSlop,E.y+AN.b2_linearSlop);D.Query(function(F){F=D.GetUserData(F) instanceof b?D.GetUserData(F):null;if(F.TestPoint(E)){return B(F)}return true},A)};AU.prototype.RayCast=function(B,G,D){var A=this.m_contactManager.m_broadPhase,F=new T,E=new f(G,D);A.RayCast(function(H,M){var L=A.GetUserData(M);L=L instanceof b?L:null;if(L.RayCast(F,H)){var I=F.fraction,K=new AC((1-I)*G.x+I*D.x,(1-I)*G.y+I*D.y);return B(L,K,F.normal,I)}return H.maxFraction},E)};AU.prototype.RayCastOne=function(A,D){var B;this.RayCast(function(F,H,G,E){if(E===undefined){E=0}B=F;return E},A,D);return B};AU.prototype.RayCastAll=function(A,D){var B=new Vector;this.RayCast(function(E){B[B.length]=E;return 1},A,D);return B};AU.prototype.GetBodyList=function(){return this.m_bodyList};AU.prototype.GetJointList=function(){return this.m_jointList};AU.prototype.GetContactList=function(){return this.m_contactList};AU.prototype.IsLocked=function(){return(this.m_flags&AU.e_locked)>0};AU.prototype.Solve=function(D){for(var I,F=this.m_controllerList;F;F=F.m_next){F.Step(D)}F=this.m_island;F.Initialize(this.m_bodyCount,this.m_contactCount,this.m_jointCount,null,this.m_contactManager.m_contactListener,this.m_contactSolver);for(I=this.m_bodyList;I;I=I.m_next){I.m_flags&=~AS.e_islandFlag}for(var B=this.m_contactList;B;B=B.m_next){B.m_flags&=~AR.e_islandFlag}for(B=this.m_jointList;B;B=B.m_next){B.m_islandFlag=false}parseInt(this.m_bodyCount);B=this.s_stack;for(var H=this.m_bodyList;H;H=H.m_next){if(!(H.m_flags&AS.e_islandFlag)){if(!(H.IsAwake()==false||H.IsActive()==false)){if(H.GetType()!=AS.b2_staticBody){F.Clear();var G=0;B[G++]=H;for(H.m_flags|=AS.e_islandFlag;G>0;){I=B[--G];F.AddBody(I);I.IsAwake()==false&&I.SetAwake(true);if(I.GetType()!=AS.b2_staticBody){for(var A,E=I.m_contactList;E;E=E.next){if(!(E.contact.m_flags&AR.e_islandFlag)){if(!(E.contact.IsSensor()==true||E.contact.IsEnabled()==false||E.contact.IsTouching()==false)){F.AddContact(E.contact);E.contact.m_flags|=AR.e_islandFlag;A=E.other;if(!(A.m_flags&AS.e_islandFlag)){B[G++]=A;A.m_flags|=AS.e_islandFlag}}}}for(I=I.m_jointList;I;I=I.next){if(I.joint.m_islandFlag!=true){A=I.other;if(A.IsActive()!=false){F.AddJoint(I.joint);I.joint.m_islandFlag=true;if(!(A.m_flags&AS.e_islandFlag)){B[G++]=A;A.m_flags|=AS.e_islandFlag}}}}}}F.Solve(D,this.m_gravity,this.m_allowSleep);for(G=0;G<F.m_bodyCount;++G){I=F.m_bodies[G];if(I.GetType()==AS.b2_staticBody){I.m_flags&=~AS.e_islandFlag}}}}}}for(G=0;G<B.length;++G){if(!B[G]){break}B[G]=null}for(I=this.m_bodyList;I;I=I.m_next){I.IsAwake()==false||I.IsActive()==false||I.GetType()!=AS.b2_staticBody&&I.SynchronizeFixtures()}this.m_contactManager.FindNewContacts()};AU.prototype.SolveTOI=function(I){var G,D,H,F=this.m_island;F.Initialize(this.m_bodyCount,AN.b2_maxTOIContactsPerIsland,AN.b2_maxTOIJointsPerIsland,null,this.m_contactManager.m_contactListener,this.m_contactSolver);var E=AU.s_queue;for(G=this.m_bodyList;G;G=G.m_next){G.m_flags&=~AS.e_islandFlag;G.m_sweep.t0=0}for(H=this.m_contactList;H;H=H.m_next){H.m_flags&=~(AR.e_toiFlag|AR.e_islandFlag)}for(H=this.m_jointList;H;H=H.m_next){H.m_islandFlag=false}for(;;){var B=null,A=1;for(H=this.m_contactList;H;H=H.m_next){if(!(H.IsSensor()==true||H.IsEnabled()==false||H.IsContinuous()==false)){G=1;if(H.m_flags&AR.e_toiFlag){G=H.m_toi}else{G=H.m_fixtureA;D=H.m_fixtureB;G=G.m_body;D=D.m_body;if((G.GetType()!=AS.b2_dynamicBody||G.IsAwake()==false)&&(D.GetType()!=AS.b2_dynamicBody||D.IsAwake()==false)){continue}var K=G.m_sweep.t0;if(G.m_sweep.t0<D.m_sweep.t0){K=D.m_sweep.t0;G.m_sweep.Advance(K)}else{if(D.m_sweep.t0<G.m_sweep.t0){K=G.m_sweep.t0;D.m_sweep.Advance(K)}}G=H.ComputeTOI(G.m_sweep,D.m_sweep);AN.b2Assert(0<=G&&G<=1);if(G>0&&G<1){G=(1-G)*K+G;if(G>1){G=1}}H.m_toi=G;H.m_flags|=AR.e_toiFlag}if(Number.MIN_VALUE<G&&G<A){B=H;A=G}}}if(B==null||1-100*Number.MIN_VALUE<A){break}G=B.m_fixtureA;D=B.m_fixtureB;G=G.m_body;D=D.m_body;AU.s_backupA.Set(G.m_sweep);AU.s_backupB.Set(D.m_sweep);G.Advance(A);D.Advance(A);B.Update(this.m_contactManager.m_contactListener);B.m_flags&=~AR.e_toiFlag;if(B.IsSensor()==true||B.IsEnabled()==false){G.m_sweep.Set(AU.s_backupA);D.m_sweep.Set(AU.s_backupB);G.SynchronizeTransform();D.SynchronizeTransform()}else{if(B.IsTouching()!=false){G=G;if(G.GetType()!=AS.b2_dynamicBody){G=D}F.Clear();B=H=0;E[H+B++]=G;for(G.m_flags|=AS.e_islandFlag;B>0;){G=E[H++];--B;F.AddBody(G);G.IsAwake()==false&&G.SetAwake(true);if(G.GetType()==AS.b2_dynamicBody){for(D=G.m_contactList;D;D=D.next){if(F.m_contactCount==F.m_contactCapacity){break}if(!(D.contact.m_flags&AR.e_islandFlag)){if(!(D.contact.IsSensor()==true||D.contact.IsEnabled()==false||D.contact.IsTouching()==false)){F.AddContact(D.contact);D.contact.m_flags|=AR.e_islandFlag;K=D.other;if(!(K.m_flags&AS.e_islandFlag)){if(K.GetType()!=AS.b2_staticBody){K.Advance(A);K.SetAwake(true)}E[H+B]=K;++B;K.m_flags|=AS.e_islandFlag}}}}for(G=G.m_jointList;G;G=G.next){if(F.m_jointCount!=F.m_jointCapacity){if(G.joint.m_islandFlag!=true){K=G.other;if(K.IsActive()!=false){F.AddJoint(G.joint);G.joint.m_islandFlag=true;if(!(K.m_flags&AS.e_islandFlag)){if(K.GetType()!=AS.b2_staticBody){K.Advance(A);K.SetAwake(true)}E[H+B]=K;++B;K.m_flags|=AS.e_islandFlag}}}}}}}H=AU.s_timestep;H.warmStarting=false;H.dt=(1-A)*I.dt;H.inv_dt=1/H.dt;H.dtRatio=0;H.velocityIterations=I.velocityIterations;H.positionIterations=I.positionIterations;F.SolveTOI(H);for(A=A=0;A<F.m_bodyCount;++A){G=F.m_bodies[A];G.m_flags&=~AS.e_islandFlag;if(G.IsAwake()!=false){if(G.GetType()==AS.b2_dynamicBody){G.SynchronizeFixtures();for(D=G.m_contactList;D;D=D.next){D.contact.m_flags&=~AR.e_toiFlag}}}}for(A=0;A<F.m_contactCount;++A){H=F.m_contacts[A];H.m_flags&=~(AR.e_toiFlag|AR.e_islandFlag)}for(A=0;A<F.m_jointCount;++A){H=F.m_joints[A];H.m_islandFlag=false}this.m_contactManager.FindNewContacts()}}}};AU.prototype.DrawJoint=function(D){var I=D.GetBodyA(),F=D.GetBodyB(),B=I.m_xf.position,H=F.m_xf.position,G=D.GetAnchorA(),A=D.GetAnchorB(),E=AU.s_jointColor;switch(D.m_type){case AL.e_distanceJoint:this.m_debugDraw.DrawSegment(G,A,E);break;case AL.e_pulleyJoint:I=D instanceof AQ?D:null;D=I.GetGroundAnchorA();I=I.GetGroundAnchorB();this.m_debugDraw.DrawSegment(D,G,E);this.m_debugDraw.DrawSegment(I,A,E);this.m_debugDraw.DrawSegment(D,I,E);break;case AL.e_mouseJoint:this.m_debugDraw.DrawSegment(G,A,E);break;default:I!=this.m_groundBody&&this.m_debugDraw.DrawSegment(B,G,E);this.m_debugDraw.DrawSegment(G,A,E);F!=this.m_groundBody&&this.m_debugDraw.DrawSegment(H,A,E)}};AU.prototype.DrawShape=function(B,G,D){switch(B.m_type){case J.e_circleShape:var A=B instanceof t?B:null;this.m_debugDraw.DrawSolidCircle(AI.MulX(G,A.m_p),A.m_radius,G.R.col1,D);break;case J.e_polygonShape:A=0;A=B instanceof P?B:null;B=parseInt(A.GetVertexCount());var F=A.GetVertices(),E=new Vector(B);for(A=0;A<B;++A){E[A]=AI.MulX(G,F[A])}this.m_debugDraw.DrawSolidPolygon(E,B,D);break;case J.e_edgeShape:A=B instanceof x?B:null;this.m_debugDraw.DrawSegment(AI.MulX(G,A.GetVertex1()),AI.MulX(G,A.GetVertex2()),D)}};Box2D.postDefs.push(function(){Box2D.Dynamics.b2World.s_timestep2=new AV;Box2D.Dynamics.b2World.s_xf=new AB;Box2D.Dynamics.b2World.s_backupA=new AG;Box2D.Dynamics.b2World.s_backupB=new AG;Box2D.Dynamics.b2World.s_timestep=new AV;Box2D.Dynamics.b2World.s_queue=new Vector;Box2D.Dynamics.b2World.s_jointColor=new AF(0.5,0.8,0.8);Box2D.Dynamics.b2World.e_newFixture=1;Box2D.Dynamics.b2World.e_locked=2})})();(function(){var AG=Box2D.Collision.Shapes.b2CircleShape,AE=Box2D.Collision.Shapes.b2EdgeShape,x=Box2D.Collision.Shapes.b2PolygonShape,AA=Box2D.Collision.Shapes.b2Shape,AD=Box2D.Dynamics.Contacts.b2CircleContact,AK=Box2D.Dynamics.Contacts.b2Contact,X=Box2D.Dynamics.Contacts.b2ContactConstraint,AL=Box2D.Dynamics.Contacts.b2ContactConstraintPoint,AJ=Box2D.Dynamics.Contacts.b2ContactEdge,f=Box2D.Dynamics.Contacts.b2ContactFactory,T=Box2D.Dynamics.Contacts.b2ContactRegister,n=Box2D.Dynamics.Contacts.b2ContactResult,o=Box2D.Dynamics.Contacts.b2ContactSolver,AB=Box2D.Dynamics.Contacts.b2EdgeAndCircleContact,P=Box2D.Dynamics.Contacts.b2NullContact,J=Box2D.Dynamics.Contacts.b2PolyAndCircleContact,AN=Box2D.Dynamics.Contacts.b2PolyAndEdgeContact,t=Box2D.Dynamics.Contacts.b2PolygonContact,AF=Box2D.Dynamics.Contacts.b2PositionSolverManifold,AI=Box2D.Dynamics.b2Body,AC=Box2D.Dynamics.b2TimeStep,g=Box2D.Common.b2Settings,AH=Box2D.Common.Math.b2Mat22,e=Box2D.Common.Math.b2Math,m=Box2D.Common.Math.b2Vec2,b=Box2D.Collision.b2Collision,AQ=Box2D.Collision.b2ContactID,C=Box2D.Collision.b2Manifold,AP=Box2D.Collision.b2TimeOfImpact,AO=Box2D.Collision.b2TOIInput,AM=Box2D.Collision.b2WorldManifold;Box2D.inherit(AD,Box2D.Dynamics.Contacts.b2Contact);AD.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;AD.b2CircleContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};AD.Create=function(){return new AD};AD.Destroy=function(){};AD.prototype.Reset=function(A,B){this.__super.Reset.call(this,A,B)};AD.prototype.Evaluate=function(){var A=this.m_fixtureA.GetBody(),B=this.m_fixtureB.GetBody();b.CollideCircles(this.m_manifold,this.m_fixtureA.GetShape() instanceof AG?this.m_fixtureA.GetShape():null,A.m_xf,this.m_fixtureB.GetShape() instanceof AG?this.m_fixtureB.GetShape():null,B.m_xf)};AK.b2Contact=function(){this.m_nodeA=new AJ;this.m_nodeB=new AJ;this.m_manifold=new C;this.m_oldManifold=new C};AK.prototype.GetManifold=function(){return this.m_manifold};AK.prototype.GetWorldManifold=function(B){var E=this.m_fixtureA.GetBody(),D=this.m_fixtureB.GetBody(),F=this.m_fixtureA.GetShape(),A=this.m_fixtureB.GetShape();B.Initialize(this.m_manifold,E.GetTransform(),F.m_radius,D.GetTransform(),A.m_radius)};AK.prototype.IsTouching=function(){return(this.m_flags&AK.e_touchingFlag)==AK.e_touchingFlag};AK.prototype.IsContinuous=function(){return(this.m_flags&AK.e_continuousFlag)==AK.e_continuousFlag};AK.prototype.SetSensor=function(A){if(A){this.m_flags|=AK.e_sensorFlag}else{this.m_flags&=~AK.e_sensorFlag}};AK.prototype.IsSensor=function(){return(this.m_flags&AK.e_sensorFlag)==AK.e_sensorFlag};AK.prototype.SetEnabled=function(A){if(A){this.m_flags|=AK.e_enabledFlag}else{this.m_flags&=~AK.e_enabledFlag}};AK.prototype.IsEnabled=function(){return(this.m_flags&AK.e_enabledFlag)==AK.e_enabledFlag};AK.prototype.GetNext=function(){return this.m_next};AK.prototype.GetFixtureA=function(){return this.m_fixtureA};AK.prototype.GetFixtureB=function(){return this.m_fixtureB};AK.prototype.FlagForFiltering=function(){this.m_flags|=AK.e_filterFlag};AK.prototype.b2Contact=function(){};AK.prototype.Reset=function(A,D){if(A===undefined){A=null}if(D===undefined){D=null}this.m_flags=AK.e_enabledFlag;if(!A||!D){this.m_fixtureB=this.m_fixtureA=null}else{if(A.IsSensor()||D.IsSensor()){this.m_flags|=AK.e_sensorFlag}var B=A.GetBody(),E=D.GetBody();if(B.GetType()!=AI.b2_dynamicBody||B.IsBullet()||E.GetType()!=AI.b2_dynamicBody||E.IsBullet()){this.m_flags|=AK.e_continuousFlag}this.m_fixtureA=A;this.m_fixtureB=D;this.m_manifold.m_pointCount=0;this.m_next=this.m_prev=null;this.m_nodeA.contact=null;this.m_nodeA.prev=null;this.m_nodeA.next=null;this.m_nodeA.other=null;this.m_nodeB.contact=null;this.m_nodeB.prev=null;this.m_nodeB.next=null;this.m_nodeB.other=null}};AK.prototype.Update=function(E){var B=this.m_oldManifold;this.m_oldManifold=this.m_manifold;this.m_manifold=B;this.m_flags|=AK.e_enabledFlag;var A=false;B=(this.m_flags&AK.e_touchingFlag)==AK.e_touchingFlag;var D=this.m_fixtureA.m_body,L=this.m_fixtureB.m_body,I=this.m_fixtureA.m_aabb.TestOverlap(this.m_fixtureB.m_aabb);if(this.m_flags&AK.e_sensorFlag){if(I){A=this.m_fixtureA.GetShape();I=this.m_fixtureB.GetShape();D=D.GetTransform();L=L.GetTransform();A=AA.TestOverlap(A,D,I,L)}this.m_manifold.m_pointCount=0}else{if(D.GetType()!=AI.b2_dynamicBody||D.IsBullet()||L.GetType()!=AI.b2_dynamicBody||L.IsBullet()){this.m_flags|=AK.e_continuousFlag}else{this.m_flags&=~AK.e_continuousFlag}if(I){this.Evaluate();A=this.m_manifold.m_pointCount>0;for(I=0;I<this.m_manifold.m_pointCount;++I){var F=this.m_manifold.m_points[I];F.m_normalImpulse=0;F.m_tangentImpulse=0;for(var K=F.m_id,H=0;H<this.m_oldManifold.m_pointCount;++H){var G=this.m_oldManifold.m_points[H];if(G.m_id.key==K.key){F.m_normalImpulse=G.m_normalImpulse;F.m_tangentImpulse=G.m_tangentImpulse;break}}}}else{this.m_manifold.m_pointCount=0}if(A!=B){D.SetAwake(true);L.SetAwake(true)}}if(A){this.m_flags|=AK.e_touchingFlag}else{this.m_flags&=~AK.e_touchingFlag}B==false&&A==true&&E.BeginContact(this);B==true&&A==false&&E.EndContact(this);(this.m_flags&AK.e_sensorFlag)==0&&E.PreSolve(this,this.m_oldManifold)};AK.prototype.Evaluate=function(){};AK.prototype.ComputeTOI=function(A,B){AK.s_input.proxyA.Set(this.m_fixtureA.GetShape());AK.s_input.proxyB.Set(this.m_fixtureB.GetShape());AK.s_input.sweepA=A;AK.s_input.sweepB=B;AK.s_input.tolerance=g.b2_linearSlop;return AP.TimeOfImpact(AK.s_input)};Box2D.postDefs.push(function(){Box2D.Dynamics.Contacts.b2Contact.e_sensorFlag=1;Box2D.Dynamics.Contacts.b2Contact.e_continuousFlag=2;Box2D.Dynamics.Contacts.b2Contact.e_islandFlag=4;Box2D.Dynamics.Contacts.b2Contact.e_toiFlag=8;Box2D.Dynamics.Contacts.b2Contact.e_touchingFlag=16;Box2D.Dynamics.Contacts.b2Contact.e_enabledFlag=32;Box2D.Dynamics.Contacts.b2Contact.e_filterFlag=64;Box2D.Dynamics.Contacts.b2Contact.s_input=new AO});X.b2ContactConstraint=function(){this.localPlaneNormal=new m;this.localPoint=new m;this.normal=new m;this.normalMass=new AH;this.K=new AH};X.prototype.b2ContactConstraint=function(){this.points=new Vector(g.b2_maxManifoldPoints);for(var A=0;A<g.b2_maxManifoldPoints;A++){this.points[A]=new AL}};AL.b2ContactConstraintPoint=function(){this.localPoint=new m;this.rA=new m;this.rB=new m};AJ.b2ContactEdge=function(){};f.b2ContactFactory=function(){};f.prototype.b2ContactFactory=function(A){this.m_allocator=A;this.InitializeRegisters()};f.prototype.AddType=function(A,D,B,E){if(B===undefined){B=0}if(E===undefined){E=0}this.m_registers[B][E].createFcn=A;this.m_registers[B][E].destroyFcn=D;this.m_registers[B][E].primary=true;if(B!=E){this.m_registers[E][B].createFcn=A;this.m_registers[E][B].destroyFcn=D;this.m_registers[E][B].primary=false}};f.prototype.InitializeRegisters=function(){this.m_registers=new Vector(AA.e_shapeTypeCount);for(var A=0;A<AA.e_shapeTypeCount;A++){this.m_registers[A]=new Vector(AA.e_shapeTypeCount);for(var B=0;B<AA.e_shapeTypeCount;B++){this.m_registers[A][B]=new T}}this.AddType(AD.Create,AD.Destroy,AA.e_circleShape,AA.e_circleShape);this.AddType(J.Create,J.Destroy,AA.e_polygonShape,AA.e_circleShape);this.AddType(t.Create,t.Destroy,AA.e_polygonShape,AA.e_polygonShape);this.AddType(AB.Create,AB.Destroy,AA.e_edgeShape,AA.e_circleShape);this.AddType(AN.Create,AN.Destroy,AA.e_polygonShape,AA.e_edgeShape)};f.prototype.Create=function(A,D){var B=parseInt(A.GetType()),E=parseInt(D.GetType());B=this.m_registers[B][E];if(B.pool){E=B.pool;B.pool=E.m_next;B.poolCount--;E.Reset(A,D);return E}E=B.createFcn;if(E!=null){if(B.primary){E=E(this.m_allocator);E.Reset(A,D)}else{E=E(this.m_allocator);E.Reset(D,A)}return E}else{return null}};f.prototype.Destroy=function(A){if(A.m_manifold.m_pointCount>0){A.m_fixtureA.m_body.SetAwake(true);A.m_fixtureB.m_body.SetAwake(true)}var D=parseInt(A.m_fixtureA.GetType()),B=parseInt(A.m_fixtureB.GetType());D=this.m_registers[D][B];D.poolCount++;A.m_next=D.pool;D.pool=A;D=D.destroyFcn;D(A,this.m_allocator)};T.b2ContactRegister=function(){};n.b2ContactResult=function(){this.position=new m;this.normal=new m;this.id=new AQ};o.b2ContactSolver=function(){this.m_step=new AC;this.m_constraints=new Vector};o.prototype.b2ContactSolver=function(){};o.prototype.Initialize=function(V,R,O,S){if(O===undefined){O=0}var l;this.m_step.Set(V);this.m_allocator=S;V=0;for(this.m_constraintCount=O;this.m_constraints.length<this.m_constraintCount;){this.m_constraints[this.m_constraints.length]=new X}for(V=0;V<O;++V){l=R[V];S=l.m_fixtureA;var h=l.m_fixtureB,W=S.m_shape.m_radius,k=h.m_shape.m_radius,Z=S.m_body,Y=h.m_body,U=l.GetManifold(),N=g.b2MixFriction(S.GetFriction(),h.GetFriction()),L=g.b2MixRestitution(S.GetRestitution(),h.GetRestitution()),I=Z.m_linearVelocity.x,K=Z.m_linearVelocity.y,H=Y.m_linearVelocity.x,M=Y.m_linearVelocity.y,G=Z.m_angularVelocity,B=Y.m_angularVelocity;g.b2Assert(U.m_pointCount>0);o.s_worldManifold.Initialize(U,Z.m_xf,W,Y.m_xf,k);h=o.s_worldManifold.m_normal.x;l=o.s_worldManifold.m_normal.y;S=this.m_constraints[V];S.bodyA=Z;S.bodyB=Y;S.manifold=U;S.normal.x=h;S.normal.y=l;S.pointCount=U.m_pointCount;S.friction=N;S.restitution=L;S.localPlaneNormal.x=U.m_localPlaneNormal.x;S.localPlaneNormal.y=U.m_localPlaneNormal.y;S.localPoint.x=U.m_localPoint.x;S.localPoint.y=U.m_localPoint.y;S.radius=W+k;S.type=U.m_type;for(W=0;W<S.pointCount;++W){N=U.m_points[W];k=S.points[W];k.normalImpulse=N.m_normalImpulse;k.tangentImpulse=N.m_tangentImpulse;k.localPoint.SetV(N.m_localPoint);N=k.rA.x=o.s_worldManifold.m_points[W].x-Z.m_sweep.c.x;L=k.rA.y=o.s_worldManifold.m_points[W].y-Z.m_sweep.c.y;var F=k.rB.x=o.s_worldManifold.m_points[W].x-Y.m_sweep.c.x,A=k.rB.y=o.s_worldManifold.m_points[W].y-Y.m_sweep.c.y,D=N*l-L*h,E=F*l-A*h;D*=D;E*=E;k.normalMass=1/(Z.m_invMass+Y.m_invMass+Z.m_invI*D+Y.m_invI*E);var Q=Z.m_mass*Z.m_invMass+Y.m_mass*Y.m_invMass;Q+=Z.m_mass*Z.m_invI*D+Y.m_mass*Y.m_invI*E;k.equalizedMass=1/Q;E=l;Q=-h;D=N*Q-L*E;E=F*Q-A*E;D*=D;E*=E;k.tangentMass=1/(Z.m_invMass+Y.m_invMass+Z.m_invI*D+Y.m_invI*E);k.velocityBias=0;N=S.normal.x*(H+-B*A-I- -G*L)+S.normal.y*(M+B*F-K-G*N);if(N<-g.b2_velocityThreshold){k.velocityBias+=-S.restitution*N}}if(S.pointCount==2){M=S.points[0];H=S.points[1];U=Z.m_invMass;Z=Z.m_invI;I=Y.m_invMass;Y=Y.m_invI;K=M.rA.x*l-M.rA.y*h;M=M.rB.x*l-M.rB.y*h;G=H.rA.x*l-H.rA.y*h;H=H.rB.x*l-H.rB.y*h;h=U+I+Z*K*K+Y*M*M;l=U+I+Z*G*G+Y*H*H;Y=U+I+Z*K*G+Y*M*H;if(h*h<100*(h*l-Y*Y)){S.K.col1.Set(h,Y);S.K.col2.Set(Y,l);S.K.GetInverse(S.normalMass)}else{S.pointCount=1}}}};o.prototype.InitVelocityConstraints=function(N){for(var K=0;K<this.m_constraintCount;++K){var I=this.m_constraints[K],L=I.bodyA,V=I.bodyB,S=L.m_invMass,O=L.m_invI,U=V.m_invMass,R=V.m_invI,Q=I.normal.x,M=I.normal.y,H=M,F=-Q,D=0,E=0;if(N.warmStarting){E=I.pointCount;for(D=0;D<E;++D){var B=I.points[D];B.normalImpulse*=N.dtRatio;B.tangentImpulse*=N.dtRatio;var G=B.normalImpulse*Q+B.tangentImpulse*H,A=B.normalImpulse*M+B.tangentImpulse*F;L.m_angularVelocity-=O*(B.rA.x*A-B.rA.y*G);L.m_linearVelocity.x-=S*G;L.m_linearVelocity.y-=S*A;V.m_angularVelocity+=R*(B.rB.x*A-B.rB.y*G);V.m_linearVelocity.x+=U*G;V.m_linearVelocity.y+=U*A}}else{E=I.pointCount;for(D=0;D<E;++D){L=I.points[D];L.normalImpulse=0;L.tangentImpulse=0}}}};o.prototype.SolveVelocityConstraints=function(){for(var V=0,R,O=0,S=0,l=0,h=S=S=O=O=0,W=O=O=0,k=O=l=0,Z=0,Y,U=0;U<this.m_constraintCount;++U){l=this.m_constraints[U];var N=l.bodyA,L=l.bodyB,I=N.m_angularVelocity,K=L.m_angularVelocity,H=N.m_linearVelocity,M=L.m_linearVelocity,G=N.m_invMass,B=N.m_invI,F=L.m_invMass,A=L.m_invI;k=l.normal.x;var D=Z=l.normal.y;Y=-k;W=l.friction;for(V=0;V<l.pointCount;V++){R=l.points[V];O=M.x-K*R.rB.y-H.x+I*R.rA.y;S=M.y+K*R.rB.x-H.y-I*R.rA.x;O=O*D+S*Y;O=R.tangentMass*-O;S=W*R.normalImpulse;S=e.Clamp(R.tangentImpulse+O,-S,S);O=S-R.tangentImpulse;h=O*D;O=O*Y;H.x-=G*h;H.y-=G*O;I-=B*(R.rA.x*O-R.rA.y*h);M.x+=F*h;M.y+=F*O;K+=A*(R.rB.x*O-R.rB.y*h);R.tangentImpulse=S}parseInt(l.pointCount);if(l.pointCount==1){R=l.points[0];O=M.x+-K*R.rB.y-H.x- -I*R.rA.y;S=M.y+K*R.rB.x-H.y-I*R.rA.x;l=O*k+S*Z;O=-R.normalMass*(l-R.velocityBias);S=R.normalImpulse+O;S=S>0?S:0;O=S-R.normalImpulse;h=O*k;O=O*Z;H.x-=G*h;H.y-=G*O;I-=B*(R.rA.x*O-R.rA.y*h);M.x+=F*h;M.y+=F*O;K+=A*(R.rB.x*O-R.rB.y*h);R.normalImpulse=S}else{R=l.points[0];V=l.points[1];O=R.normalImpulse;W=V.normalImpulse;var E=(M.x-K*R.rB.y-H.x+I*R.rA.y)*k+(M.y+K*R.rB.x-H.y-I*R.rA.x)*Z,Q=(M.x-K*V.rB.y-H.x+I*V.rA.y)*k+(M.y+K*V.rB.x-H.y-I*V.rA.x)*Z;S=E-R.velocityBias;h=Q-V.velocityBias;Y=l.K;S-=Y.col1.x*O+Y.col2.x*W;for(h-=Y.col1.y*O+Y.col2.y*W;;){Y=l.normalMass;D=-(Y.col1.x*S+Y.col2.x*h);Y=-(Y.col1.y*S+Y.col2.y*h);if(D>=0&&Y>=0){O=D-O;W=Y-W;l=O*k;O=O*Z;k=W*k;Z=W*Z;H.x-=G*(l+k);H.y-=G*(O+Z);I-=B*(R.rA.x*O-R.rA.y*l+V.rA.x*Z-V.rA.y*k);M.x+=F*(l+k);M.y+=F*(O+Z);K+=A*(R.rB.x*O-R.rB.y*l+V.rB.x*Z-V.rB.y*k);R.normalImpulse=D;V.normalImpulse=Y;break}D=-R.normalMass*S;Y=0;Q=l.K.col1.y*D+h;if(D>=0&&Q>=0){O=D-O;W=Y-W;l=O*k;O=O*Z;k=W*k;Z=W*Z;H.x-=G*(l+k);H.y-=G*(O+Z);I-=B*(R.rA.x*O-R.rA.y*l+V.rA.x*Z-V.rA.y*k);M.x+=F*(l+k);M.y+=F*(O+Z);K+=A*(R.rB.x*O-R.rB.y*l+V.rB.x*Z-V.rB.y*k);R.normalImpulse=D;V.normalImpulse=Y;break}D=0;Y=-V.normalMass*h;E=l.K.col2.x*Y+S;if(Y>=0&&E>=0){O=D-O;W=Y-W;l=O*k;O=O*Z;k=W*k;Z=W*Z;H.x-=G*(l+k);H.y-=G*(O+Z);I-=B*(R.rA.x*O-R.rA.y*l+V.rA.x*Z-V.rA.y*k);M.x+=F*(l+k);M.y+=F*(O+Z);K+=A*(R.rB.x*O-R.rB.y*l+V.rB.x*Z-V.rB.y*k);R.normalImpulse=D;V.normalImpulse=Y;break}Y=D=0;E=S;Q=h;if(E>=0&&Q>=0){O=D-O;W=Y-W;l=O*k;O=O*Z;k=W*k;Z=W*Z;H.x-=G*(l+k);H.y-=G*(O+Z);I-=B*(R.rA.x*O-R.rA.y*l+V.rA.x*Z-V.rA.y*k);M.x+=F*(l+k);M.y+=F*(O+Z);K+=A*(R.rB.x*O-R.rB.y*l+V.rB.x*Z-V.rB.y*k);R.normalImpulse=D;V.normalImpulse=Y;break}break}}N.m_angularVelocity=I;L.m_angularVelocity=K}};o.prototype.FinalizeVelocityConstraints=function(){for(var B=0;B<this.m_constraintCount;++B){for(var E=this.m_constraints[B],D=E.manifold,G=0;G<E.pointCount;++G){var A=D.m_points[G],F=E.points[G];A.m_normalImpulse=F.normalImpulse;A.m_tangentImpulse=F.tangentImpulse}}};o.prototype.SolvePositionConstraints=function(N){if(N===undefined){N=0}for(var K=0,I=0;I<this.m_constraintCount;I++){var L=this.m_constraints[I],V=L.bodyA,S=L.bodyB,O=V.m_mass*V.m_invMass,U=V.m_mass*V.m_invI,R=S.m_mass*S.m_invMass,Q=S.m_mass*S.m_invI;o.s_psm.Initialize(L);for(var M=o.s_psm.m_normal,H=0;H<L.pointCount;H++){var F=L.points[H],D=o.s_psm.m_points[H],E=o.s_psm.m_separations[H],B=D.x-V.m_sweep.c.x,G=D.y-V.m_sweep.c.y,A=D.x-S.m_sweep.c.x;D=D.y-S.m_sweep.c.y;K=K<E?K:E;E=e.Clamp(N*(E+g.b2_linearSlop),-g.b2_maxLinearCorrection,0);E=-F.equalizedMass*E;F=E*M.x;E=E*M.y;V.m_sweep.c.x-=O*F;V.m_sweep.c.y-=O*E;V.m_sweep.a-=U*(B*E-G*F);V.SynchronizeTransform();S.m_sweep.c.x+=R*F;S.m_sweep.c.y+=R*E;S.m_sweep.a+=Q*(A*E-D*F);S.SynchronizeTransform()}}return K>-1.5*g.b2_linearSlop};Box2D.postDefs.push(function(){Box2D.Dynamics.Contacts.b2ContactSolver.s_worldManifold=new AM;Box2D.Dynamics.Contacts.b2ContactSolver.s_psm=new AF});Box2D.inherit(AB,Box2D.Dynamics.Contacts.b2Contact);AB.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;AB.b2EdgeAndCircleContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};AB.Create=function(){return new AB};AB.Destroy=function(){};AB.prototype.Reset=function(A,B){this.__super.Reset.call(this,A,B)};AB.prototype.Evaluate=function(){var A=this.m_fixtureA.GetBody(),B=this.m_fixtureB.GetBody();this.b2CollideEdgeAndCircle(this.m_manifold,this.m_fixtureA.GetShape() instanceof AE?this.m_fixtureA.GetShape():null,A.m_xf,this.m_fixtureB.GetShape() instanceof AG?this.m_fixtureB.GetShape():null,B.m_xf)};AB.prototype.b2CollideEdgeAndCircle=function(){};Box2D.inherit(P,Box2D.Dynamics.Contacts.b2Contact);P.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;P.b2NullContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};P.prototype.b2NullContact=function(){this.__super.b2Contact.call(this)};P.prototype.Evaluate=function(){};Box2D.inherit(J,Box2D.Dynamics.Contacts.b2Contact);J.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;J.b2PolyAndCircleContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};J.Create=function(){return new J};J.Destroy=function(){};J.prototype.Reset=function(A,B){this.__super.Reset.call(this,A,B);g.b2Assert(A.GetType()==AA.e_polygonShape);g.b2Assert(B.GetType()==AA.e_circleShape)};J.prototype.Evaluate=function(){var A=this.m_fixtureA.m_body,B=this.m_fixtureB.m_body;b.CollidePolygonAndCircle(this.m_manifold,this.m_fixtureA.GetShape() instanceof x?this.m_fixtureA.GetShape():null,A.m_xf,this.m_fixtureB.GetShape() instanceof AG?this.m_fixtureB.GetShape():null,B.m_xf)};Box2D.inherit(AN,Box2D.Dynamics.Contacts.b2Contact);AN.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;AN.b2PolyAndEdgeContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};AN.Create=function(){return new AN};AN.Destroy=function(){};AN.prototype.Reset=function(A,B){this.__super.Reset.call(this,A,B);g.b2Assert(A.GetType()==AA.e_polygonShape);g.b2Assert(B.GetType()==AA.e_edgeShape)};AN.prototype.Evaluate=function(){var A=this.m_fixtureA.GetBody(),B=this.m_fixtureB.GetBody();this.b2CollidePolyAndEdge(this.m_manifold,this.m_fixtureA.GetShape() instanceof x?this.m_fixtureA.GetShape():null,A.m_xf,this.m_fixtureB.GetShape() instanceof AE?this.m_fixtureB.GetShape():null,B.m_xf)};AN.prototype.b2CollidePolyAndEdge=function(){};Box2D.inherit(t,Box2D.Dynamics.Contacts.b2Contact);t.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;t.b2PolygonContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};t.Create=function(){return new t};t.Destroy=function(){};t.prototype.Reset=function(A,B){this.__super.Reset.call(this,A,B)};t.prototype.Evaluate=function(){var A=this.m_fixtureA.GetBody(),B=this.m_fixtureB.GetBody();b.CollidePolygons(this.m_manifold,this.m_fixtureA.GetShape() instanceof x?this.m_fixtureA.GetShape():null,A.m_xf,this.m_fixtureB.GetShape() instanceof x?this.m_fixtureB.GetShape():null,B.m_xf)};AF.b2PositionSolverManifold=function(){};AF.prototype.b2PositionSolverManifold=function(){this.m_normal=new m;this.m_separations=new Vector_a2j_Number(g.b2_maxManifoldPoints);this.m_points=new Vector(g.b2_maxManifoldPoints);for(var A=0;A<g.b2_maxManifoldPoints;A++){this.m_points[A]=new m}};AF.prototype.Initialize=function(D){g.b2Assert(D.pointCount>0);var G=0,F=0,I=0,B,H=0,E=0;switch(D.type){case C.e_circles:B=D.bodyA.m_xf.R;I=D.localPoint;G=D.bodyA.m_xf.position.x+(B.col1.x*I.x+B.col2.x*I.y);F=D.bodyA.m_xf.position.y+(B.col1.y*I.x+B.col2.y*I.y);B=D.bodyB.m_xf.R;I=D.points[0].localPoint;H=D.bodyB.m_xf.position.x+(B.col1.x*I.x+B.col2.x*I.y);B=D.bodyB.m_xf.position.y+(B.col1.y*I.x+B.col2.y*I.y);I=H-G;E=B-F;var A=I*I+E*E;if(A>Number.MIN_VALUE*Number.MIN_VALUE){A=Math.sqrt(A);this.m_normal.x=I/A;this.m_normal.y=E/A}else{this.m_normal.x=1;this.m_normal.y=0}this.m_points[0].x=0.5*(G+H);this.m_points[0].y=0.5*(F+B);this.m_separations[0]=I*this.m_normal.x+E*this.m_normal.y-D.radius;break;case C.e_faceA:B=D.bodyA.m_xf.R;I=D.localPlaneNormal;this.m_normal.x=B.col1.x*I.x+B.col2.x*I.y;this.m_normal.y=B.col1.y*I.x+B.col2.y*I.y;B=D.bodyA.m_xf.R;I=D.localPoint;H=D.bodyA.m_xf.position.x+(B.col1.x*I.x+B.col2.x*I.y);E=D.bodyA.m_xf.position.y+(B.col1.y*I.x+B.col2.y*I.y);B=D.bodyB.m_xf.R;for(G=0;G<D.pointCount;++G){I=D.points[G].localPoint;F=D.bodyB.m_xf.position.x+(B.col1.x*I.x+B.col2.x*I.y);I=D.bodyB.m_xf.position.y+(B.col1.y*I.x+B.col2.y*I.y);this.m_separations[G]=(F-H)*this.m_normal.x+(I-E)*this.m_normal.y-D.radius;this.m_points[G].x=F;this.m_points[G].y=I}break;case C.e_faceB:B=D.bodyB.m_xf.R;I=D.localPlaneNormal;this.m_normal.x=B.col1.x*I.x+B.col2.x*I.y;this.m_normal.y=B.col1.y*I.x+B.col2.y*I.y;B=D.bodyB.m_xf.R;I=D.localPoint;H=D.bodyB.m_xf.position.x+(B.col1.x*I.x+B.col2.x*I.y);E=D.bodyB.m_xf.position.y+(B.col1.y*I.x+B.col2.y*I.y);B=D.bodyA.m_xf.R;for(G=0;G<D.pointCount;++G){I=D.points[G].localPoint;F=D.bodyA.m_xf.position.x+(B.col1.x*I.x+B.col2.x*I.y);I=D.bodyA.m_xf.position.y+(B.col1.y*I.x+B.col2.y*I.y);this.m_separations[G]=(F-H)*this.m_normal.x+(I-E)*this.m_normal.y-D.radius;this.m_points[G].Set(F,I)}this.m_normal.x*=-1;this.m_normal.y*=-1}};Box2D.postDefs.push(function(){Box2D.Dynamics.Contacts.b2PositionSolverManifold.circlePointA=new m;Box2D.Dynamics.Contacts.b2PositionSolverManifold.circlePointB=new m})})();(function(){var P=Box2D.Common.Math.b2Mat22,O=Box2D.Common.Math.b2Math,M=Box2D.Common.Math.b2Vec2,L=Box2D.Common.b2Color,N=Box2D.Dynamics.Controllers.b2BuoyancyController,E=Box2D.Dynamics.Controllers.b2ConstantAccelController,I=Box2D.Dynamics.Controllers.b2ConstantForceController,D=Box2D.Dynamics.Controllers.b2Controller,C=Box2D.Dynamics.Controllers.b2ControllerEdge,J=Box2D.Dynamics.Controllers.b2GravityController,H=Box2D.Dynamics.Controllers.b2TensorDampingController;Box2D.inherit(N,Box2D.Dynamics.Controllers.b2Controller);N.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;N.b2BuoyancyController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.normal=new M(0,-1);this.density=this.offset=0;this.velocity=new M(0,0);this.linearDrag=2;this.angularDrag=1;this.useDensity=false;this.useWorldGravity=true;this.gravity=null};N.prototype.Step=function(){if(this.m_bodyList){if(this.useWorldGravity){this.gravity=this.GetWorld().GetGravity().Copy()}for(var K=this.m_bodyList;K;K=K.nextBody){var R=K.body;if(R.IsAwake()!=false){for(var S=new M,F=new M,B=0,G=0,Q=R.GetFixtureList();Q;Q=Q.GetNext()){var U=new M,A=Q.GetShape().ComputeSubmergedArea(this.normal,this.offset,R.GetTransform(),U);B+=A;S.x+=A*U.x;S.y+=A*U.y;var T=0;T=1;G+=A*T;F.x+=A*U.x*T;F.y+=A*U.y*T}S.x/=B;S.y/=B;F.x/=G;F.y/=G;if(!(B<Number.MIN_VALUE)){G=this.gravity.GetNegative();G.Multiply(this.density*B);R.ApplyForce(G,F);F=R.GetLinearVelocityFromWorldPoint(S);F.Subtract(this.velocity);F.Multiply(-this.linearDrag*B);R.ApplyForce(F,S);R.ApplyTorque(-R.GetInertia()/R.GetMass()*B*R.GetAngularVelocity()*this.angularDrag)}}}}};N.prototype.Draw=function(G){var B=new M,F=new M;B.x=this.normal.x*this.offset+this.normal.y*1000;B.y=this.normal.y*this.offset-this.normal.x*1000;F.x=this.normal.x*this.offset-this.normal.y*1000;F.y=this.normal.y*this.offset+this.normal.x*1000;var A=new L(0,0,1);G.DrawSegment(B,F,A)};Box2D.inherit(E,Box2D.Dynamics.Controllers.b2Controller);E.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;E.b2ConstantAccelController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.A=new M(0,0)};E.prototype.Step=function(F){F=new M(this.A.x*F.dt,this.A.y*F.dt);for(var A=this.m_bodyList;A;A=A.nextBody){var B=A.body;B.IsAwake()&&B.SetLinearVelocity(new M(B.GetLinearVelocity().x+F.x,B.GetLinearVelocity().y+F.y))}};Box2D.inherit(I,Box2D.Dynamics.Controllers.b2Controller);I.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;I.b2ConstantForceController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.F=new M(0,0)};I.prototype.Step=function(){for(var B=this.m_bodyList;B;B=B.nextBody){var A=B.body;A.IsAwake()&&A.ApplyForce(this.F,A.GetWorldCenter())}};D.b2Controller=function(){};D.prototype.Step=function(){};D.prototype.Draw=function(){};D.prototype.AddBody=function(B){var A=new C;A.controller=this;A.body=B;A.nextBody=this.m_bodyList;A.prevBody=null;this.m_bodyList=A;if(A.nextBody){A.nextBody.prevBody=A}this.m_bodyCount++;A.nextController=B.m_controllerList;A.prevController=null;B.m_controllerList=A;if(A.nextController){A.nextController.prevController=A}B.m_controllerCount++};D.prototype.RemoveBody=function(B){for(var A=B.m_controllerList;A&&A.controller!=this;){A=A.nextController}if(A.prevBody){A.prevBody.nextBody=A.nextBody}if(A.nextBody){A.nextBody.prevBody=A.prevBody}if(A.nextController){A.nextController.prevController=A.prevController}if(A.prevController){A.prevController.nextController=A.nextController}if(this.m_bodyList==A){this.m_bodyList=A.nextBody}if(B.m_controllerList==A){B.m_controllerList=A.nextController}B.m_controllerCount--;this.m_bodyCount--};D.prototype.Clear=function(){for(;this.m_bodyList;){this.RemoveBody(this.m_bodyList.body)}};D.prototype.GetNext=function(){return this.m_next};D.prototype.GetWorld=function(){return this.m_world};D.prototype.GetBodyList=function(){return this.m_bodyList};C.b2ControllerEdge=function(){};Box2D.inherit(J,Box2D.Dynamics.Controllers.b2Controller);J.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;J.b2GravityController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.G=1;this.invSqr=true};J.prototype.Step=function(){var K=null,R=null,S=null,F=0,B=null,G=null,Q=null,U=0,A=0,T=0;U=null;if(this.invSqr){for(K=this.m_bodyList;K;K=K.nextBody){R=K.body;S=R.GetWorldCenter();F=R.GetMass();for(B=this.m_bodyList;B!=K;B=B.nextBody){G=B.body;Q=G.GetWorldCenter();U=Q.x-S.x;A=Q.y-S.y;T=U*U+A*A;if(!(T<Number.MIN_VALUE)){U=new M(U,A);U.Multiply(this.G/T/Math.sqrt(T)*F*G.GetMass());R.IsAwake()&&R.ApplyForce(U,S);U.Multiply(-1);G.IsAwake()&&G.ApplyForce(U,Q)}}}}else{for(K=this.m_bodyList;K;K=K.nextBody){R=K.body;S=R.GetWorldCenter();F=R.GetMass();for(B=this.m_bodyList;B!=K;B=B.nextBody){G=B.body;Q=G.GetWorldCenter();U=Q.x-S.x;A=Q.y-S.y;T=U*U+A*A;if(!(T<Number.MIN_VALUE)){U=new M(U,A);U.Multiply(this.G/T*F*G.GetMass());R.IsAwake()&&R.ApplyForce(U,S);U.Multiply(-1);G.IsAwake()&&G.ApplyForce(U,Q)}}}}};Box2D.inherit(H,Box2D.Dynamics.Controllers.b2Controller);H.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;H.b2TensorDampingController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.T=new P;this.maxTimestep=0};H.prototype.SetAxisAligned=function(B,A){if(B===undefined){B=0}if(A===undefined){A=0}this.T.col1.x=-B;this.T.col1.y=0;this.T.col2.x=0;this.T.col2.y=-A;this.maxTimestep=B>0||A>0?1/Math.max(B,A):0};H.prototype.Step=function(G){G=G.dt;if(!(G<=Number.MIN_VALUE)){if(G>this.maxTimestep&&this.maxTimestep>0){G=this.maxTimestep}for(var B=this.m_bodyList;B;B=B.nextBody){var F=B.body;if(F.IsAwake()){var A=F.GetWorldVector(O.MulMV(this.T,F.GetLocalVector(F.GetLinearVelocity())));F.SetLinearVelocity(new M(F.GetLinearVelocity().x+A.x*G,F.GetLinearVelocity().y+A.y*G))}}}}})();(function(){var AE=Box2D.Common.b2Settings,AC=Box2D.Common.Math.b2Mat22,o=Box2D.Common.Math.b2Mat33,t=Box2D.Common.Math.b2Math,AB=Box2D.Common.Math.b2Vec2,AI=Box2D.Common.Math.b2Vec3,X=Box2D.Dynamics.Joints.b2DistanceJoint,AJ=Box2D.Dynamics.Joints.b2DistanceJointDef,AH=Box2D.Dynamics.Joints.b2FrictionJoint,f=Box2D.Dynamics.Joints.b2FrictionJointDef,T=Box2D.Dynamics.Joints.b2GearJoint,l=Box2D.Dynamics.Joints.b2GearJointDef,m=Box2D.Dynamics.Joints.b2Jacobian,x=Box2D.Dynamics.Joints.b2Joint,P=Box2D.Dynamics.Joints.b2JointDef,J=Box2D.Dynamics.Joints.b2JointEdge,AK=Box2D.Dynamics.Joints.b2LineJoint,n=Box2D.Dynamics.Joints.b2LineJointDef,AD=Box2D.Dynamics.Joints.b2MouseJoint,AG=Box2D.Dynamics.Joints.b2MouseJointDef,AA=Box2D.Dynamics.Joints.b2PrismaticJoint,g=Box2D.Dynamics.Joints.b2PrismaticJointDef,AF=Box2D.Dynamics.Joints.b2PulleyJoint,e=Box2D.Dynamics.Joints.b2PulleyJointDef,h=Box2D.Dynamics.Joints.b2RevoluteJoint,b=Box2D.Dynamics.Joints.b2RevoluteJointDef,AL=Box2D.Dynamics.Joints.b2WeldJoint,C=Box2D.Dynamics.Joints.b2WeldJointDef;Box2D.inherit(X,Box2D.Dynamics.Joints.b2Joint);X.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;X.b2DistanceJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchor1=new AB;this.m_localAnchor2=new AB;this.m_u=new AB};X.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};X.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};X.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*this.m_impulse*this.m_u.x,A*this.m_impulse*this.m_u.y)};X.prototype.GetReactionTorque=function(){return 0};X.prototype.GetLength=function(){return this.m_length};X.prototype.SetLength=function(A){if(A===undefined){A=0}this.m_length=A};X.prototype.GetFrequency=function(){return this.m_frequencyHz};X.prototype.SetFrequency=function(A){if(A===undefined){A=0}this.m_frequencyHz=A};X.prototype.GetDampingRatio=function(){return this.m_dampingRatio};X.prototype.SetDampingRatio=function(A){if(A===undefined){A=0}this.m_dampingRatio=A};X.prototype.b2DistanceJoint=function(A){this.__super.b2Joint.call(this,A);this.m_localAnchor1.SetV(A.localAnchorA);this.m_localAnchor2.SetV(A.localAnchorB);this.m_length=A.length;this.m_frequencyHz=A.frequencyHz;this.m_dampingRatio=A.dampingRatio;this.m_bias=this.m_gamma=this.m_impulse=0};X.prototype.InitVelocityConstraints=function(I){var G,E=0,F=this.m_bodyA,B=this.m_bodyB;G=F.m_xf.R;var A=this.m_localAnchor1.x-F.m_sweep.localCenter.x,D=this.m_localAnchor1.y-F.m_sweep.localCenter.y;E=G.col1.x*A+G.col2.x*D;D=G.col1.y*A+G.col2.y*D;A=E;G=B.m_xf.R;var M=this.m_localAnchor2.x-B.m_sweep.localCenter.x,K=this.m_localAnchor2.y-B.m_sweep.localCenter.y;E=G.col1.x*M+G.col2.x*K;K=G.col1.y*M+G.col2.y*K;M=E;this.m_u.x=B.m_sweep.c.x+M-F.m_sweep.c.x-A;this.m_u.y=B.m_sweep.c.y+K-F.m_sweep.c.y-D;E=Math.sqrt(this.m_u.x*this.m_u.x+this.m_u.y*this.m_u.y);E>AE.b2_linearSlop?this.m_u.Multiply(1/E):this.m_u.SetZero();G=A*this.m_u.y-D*this.m_u.x;var H=M*this.m_u.y-K*this.m_u.x;G=F.m_invMass+F.m_invI*G*G+B.m_invMass+B.m_invI*H*H;this.m_mass=G!=0?1/G:0;if(this.m_frequencyHz>0){E=E-this.m_length;H=2*Math.PI*this.m_frequencyHz;var L=this.m_mass*H*H;this.m_gamma=I.dt*(2*this.m_mass*this.m_dampingRatio*H+I.dt*L);this.m_gamma=this.m_gamma!=0?1/this.m_gamma:0;this.m_bias=E*I.dt*L*this.m_gamma;this.m_mass=G+this.m_gamma;this.m_mass=this.m_mass!=0?1/this.m_mass:0}if(I.warmStarting){this.m_impulse*=I.dtRatio;I=this.m_impulse*this.m_u.x;G=this.m_impulse*this.m_u.y;F.m_linearVelocity.x-=F.m_invMass*I;F.m_linearVelocity.y-=F.m_invMass*G;F.m_angularVelocity-=F.m_invI*(A*G-D*I);B.m_linearVelocity.x+=B.m_invMass*I;B.m_linearVelocity.y+=B.m_invMass*G;B.m_angularVelocity+=B.m_invI*(M*G-K*I)}else{this.m_impulse=0}};X.prototype.SolveVelocityConstraints=function(){var H,E=this.m_bodyA,B=this.m_bodyB;H=E.m_xf.R;var D=this.m_localAnchor1.x-E.m_sweep.localCenter.x,G=this.m_localAnchor1.y-E.m_sweep.localCenter.y,F=H.col1.x*D+H.col2.x*G;G=H.col1.y*D+H.col2.y*G;D=F;H=B.m_xf.R;var I=this.m_localAnchor2.x-B.m_sweep.localCenter.x,A=this.m_localAnchor2.y-B.m_sweep.localCenter.y;F=H.col1.x*I+H.col2.x*A;A=H.col1.y*I+H.col2.y*A;I=F;F=-this.m_mass*(this.m_u.x*(B.m_linearVelocity.x+-B.m_angularVelocity*A-(E.m_linearVelocity.x+-E.m_angularVelocity*G))+this.m_u.y*(B.m_linearVelocity.y+B.m_angularVelocity*I-(E.m_linearVelocity.y+E.m_angularVelocity*D))+this.m_bias+this.m_gamma*this.m_impulse);this.m_impulse+=F;H=F*this.m_u.x;F=F*this.m_u.y;E.m_linearVelocity.x-=E.m_invMass*H;E.m_linearVelocity.y-=E.m_invMass*F;E.m_angularVelocity-=E.m_invI*(D*F-G*H);B.m_linearVelocity.x+=B.m_invMass*H;B.m_linearVelocity.y+=B.m_invMass*F;B.m_angularVelocity+=B.m_invI*(I*F-A*H)};X.prototype.SolvePositionConstraints=function(){var I;if(this.m_frequencyHz>0){return true}var G=this.m_bodyA,E=this.m_bodyB;I=G.m_xf.R;var F=this.m_localAnchor1.x-G.m_sweep.localCenter.x,B=this.m_localAnchor1.y-G.m_sweep.localCenter.y,A=I.col1.x*F+I.col2.x*B;B=I.col1.y*F+I.col2.y*B;F=A;I=E.m_xf.R;var D=this.m_localAnchor2.x-E.m_sweep.localCenter.x,L=this.m_localAnchor2.y-E.m_sweep.localCenter.y;A=I.col1.x*D+I.col2.x*L;L=I.col1.y*D+I.col2.y*L;D=A;A=E.m_sweep.c.x+D-G.m_sweep.c.x-F;var K=E.m_sweep.c.y+L-G.m_sweep.c.y-B;I=Math.sqrt(A*A+K*K);A/=I;K/=I;I=I-this.m_length;I=t.Clamp(I,-AE.b2_maxLinearCorrection,AE.b2_maxLinearCorrection);var H=-this.m_mass*I;this.m_u.Set(A,K);A=H*this.m_u.x;K=H*this.m_u.y;G.m_sweep.c.x-=G.m_invMass*A;G.m_sweep.c.y-=G.m_invMass*K;G.m_sweep.a-=G.m_invI*(F*K-B*A);E.m_sweep.c.x+=E.m_invMass*A;E.m_sweep.c.y+=E.m_invMass*K;E.m_sweep.a+=E.m_invI*(D*K-L*A);G.SynchronizeTransform();E.SynchronizeTransform();return t.Abs(I)<AE.b2_linearSlop};Box2D.inherit(AJ,Box2D.Dynamics.Joints.b2JointDef);AJ.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;AJ.b2DistanceJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new AB;this.localAnchorB=new AB};AJ.prototype.b2DistanceJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_distanceJoint;this.length=1;this.dampingRatio=this.frequencyHz=0};AJ.prototype.Initialize=function(E,D,A,B){this.bodyA=E;this.bodyB=D;this.localAnchorA.SetV(this.bodyA.GetLocalPoint(A));this.localAnchorB.SetV(this.bodyB.GetLocalPoint(B));E=B.x-A.x;A=B.y-A.y;this.length=Math.sqrt(E*E+A*A);this.dampingRatio=this.frequencyHz=0};Box2D.inherit(AH,Box2D.Dynamics.Joints.b2Joint);AH.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;AH.b2FrictionJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchorA=new AB;this.m_localAnchorB=new AB;this.m_linearMass=new AC;this.m_linearImpulse=new AB};AH.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchorA)};AH.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchorB)};AH.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*this.m_linearImpulse.x,A*this.m_linearImpulse.y)};AH.prototype.GetReactionTorque=function(A){if(A===undefined){A=0}return A*this.m_angularImpulse};AH.prototype.SetMaxForce=function(A){if(A===undefined){A=0}this.m_maxForce=A};AH.prototype.GetMaxForce=function(){return this.m_maxForce};AH.prototype.SetMaxTorque=function(A){if(A===undefined){A=0}this.m_maxTorque=A};AH.prototype.GetMaxTorque=function(){return this.m_maxTorque};AH.prototype.b2FrictionJoint=function(A){this.__super.b2Joint.call(this,A);this.m_localAnchorA.SetV(A.localAnchorA);this.m_localAnchorB.SetV(A.localAnchorB);this.m_linearMass.SetZero();this.m_angularMass=0;this.m_linearImpulse.SetZero();this.m_angularImpulse=0;this.m_maxForce=A.maxForce;this.m_maxTorque=A.maxTorque};AH.prototype.InitVelocityConstraints=function(K){var G,E=0,F=this.m_bodyA,B=this.m_bodyB;G=F.m_xf.R;var A=this.m_localAnchorA.x-F.m_sweep.localCenter.x,D=this.m_localAnchorA.y-F.m_sweep.localCenter.y;E=G.col1.x*A+G.col2.x*D;D=G.col1.y*A+G.col2.y*D;A=E;G=B.m_xf.R;var N=this.m_localAnchorB.x-B.m_sweep.localCenter.x,L=this.m_localAnchorB.y-B.m_sweep.localCenter.y;E=G.col1.x*N+G.col2.x*L;L=G.col1.y*N+G.col2.y*L;N=E;G=F.m_invMass;E=B.m_invMass;var H=F.m_invI,M=B.m_invI,I=new AC;I.col1.x=G+E;I.col2.x=0;I.col1.y=0;I.col2.y=G+E;I.col1.x+=H*D*D;I.col2.x+=-H*A*D;I.col1.y+=-H*A*D;I.col2.y+=H*A*A;I.col1.x+=M*L*L;I.col2.x+=-M*N*L;I.col1.y+=-M*N*L;I.col2.y+=M*N*N;I.GetInverse(this.m_linearMass);this.m_angularMass=H+M;if(this.m_angularMass>0){this.m_angularMass=1/this.m_angularMass}if(K.warmStarting){this.m_linearImpulse.x*=K.dtRatio;this.m_linearImpulse.y*=K.dtRatio;this.m_angularImpulse*=K.dtRatio;K=this.m_linearImpulse;F.m_linearVelocity.x-=G*K.x;F.m_linearVelocity.y-=G*K.y;F.m_angularVelocity-=H*(A*K.y-D*K.x+this.m_angularImpulse);B.m_linearVelocity.x+=E*K.x;B.m_linearVelocity.y+=E*K.y;B.m_angularVelocity+=M*(N*K.y-L*K.x+this.m_angularImpulse)}else{this.m_linearImpulse.SetZero();this.m_angularImpulse=0}};AH.prototype.SolveVelocityConstraints=function(R){var M,K=0,L=this.m_bodyA,G=this.m_bodyB,F=L.m_linearVelocity,H=L.m_angularVelocity,V=G.m_linearVelocity,S=G.m_angularVelocity,N=L.m_invMass,U=G.m_invMass,Q=L.m_invI,O=G.m_invI;M=L.m_xf.R;var I=this.m_localAnchorA.x-L.m_sweep.localCenter.x,E=this.m_localAnchorA.y-L.m_sweep.localCenter.y;K=M.col1.x*I+M.col2.x*E;E=M.col1.y*I+M.col2.y*E;I=K;M=G.m_xf.R;var D=this.m_localAnchorB.x-G.m_sweep.localCenter.x,A=this.m_localAnchorB.y-G.m_sweep.localCenter.y;K=M.col1.x*D+M.col2.x*A;A=M.col1.y*D+M.col2.y*A;D=K;M=0;K=-this.m_angularMass*(S-H);var B=this.m_angularImpulse;M=R.dt*this.m_maxTorque;this.m_angularImpulse=t.Clamp(this.m_angularImpulse+K,-M,M);K=this.m_angularImpulse-B;H-=Q*K;S+=O*K;M=t.MulMV(this.m_linearMass,new AB(-(V.x-S*A-F.x+H*E),-(V.y+S*D-F.y-H*I)));K=this.m_linearImpulse.Copy();this.m_linearImpulse.Add(M);M=R.dt*this.m_maxForce;if(this.m_linearImpulse.LengthSquared()>M*M){this.m_linearImpulse.Normalize();this.m_linearImpulse.Multiply(M)}M=t.SubtractVV(this.m_linearImpulse,K);F.x-=N*M.x;F.y-=N*M.y;H-=Q*(I*M.y-E*M.x);V.x+=U*M.x;V.y+=U*M.y;S+=O*(D*M.y-A*M.x);L.m_angularVelocity=H;G.m_angularVelocity=S};AH.prototype.SolvePositionConstraints=function(){return true};Box2D.inherit(f,Box2D.Dynamics.Joints.b2JointDef);f.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;f.b2FrictionJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new AB;this.localAnchorB=new AB};f.prototype.b2FrictionJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_frictionJoint;this.maxTorque=this.maxForce=0};f.prototype.Initialize=function(D,B,A){this.bodyA=D;this.bodyB=B;this.localAnchorA.SetV(this.bodyA.GetLocalPoint(A));this.localAnchorB.SetV(this.bodyB.GetLocalPoint(A))};Box2D.inherit(T,Box2D.Dynamics.Joints.b2Joint);T.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;T.b2GearJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_groundAnchor1=new AB;this.m_groundAnchor2=new AB;this.m_localAnchor1=new AB;this.m_localAnchor2=new AB;this.m_J=new m};T.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};T.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};T.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*this.m_impulse*this.m_J.linearB.x,A*this.m_impulse*this.m_J.linearB.y)};T.prototype.GetReactionTorque=function(F){if(F===undefined){F=0}var D=this.m_bodyB.m_xf.R,A=this.m_localAnchor1.x-this.m_bodyB.m_sweep.localCenter.x,B=this.m_localAnchor1.y-this.m_bodyB.m_sweep.localCenter.y,E=D.col1.x*A+D.col2.x*B;B=D.col1.y*A+D.col2.y*B;A=E;return F*(this.m_impulse*this.m_J.angularB-A*this.m_impulse*this.m_J.linearB.y+B*this.m_impulse*this.m_J.linearB.x)};T.prototype.GetRatio=function(){return this.m_ratio};T.prototype.SetRatio=function(A){if(A===undefined){A=0}this.m_ratio=A};T.prototype.b2GearJoint=function(F){this.__super.b2Joint.call(this,F);var D=parseInt(F.joint1.m_type),A=parseInt(F.joint2.m_type);this.m_prismatic2=this.m_revolute2=this.m_prismatic1=this.m_revolute1=null;var B=0,E=0;this.m_ground1=F.joint1.GetBodyA();this.m_bodyA=F.joint1.GetBodyB();if(D==x.e_revoluteJoint){this.m_revolute1=F.joint1 instanceof h?F.joint1:null;this.m_groundAnchor1.SetV(this.m_revolute1.m_localAnchor1);this.m_localAnchor1.SetV(this.m_revolute1.m_localAnchor2);B=this.m_revolute1.GetJointAngle()}else{this.m_prismatic1=F.joint1 instanceof AA?F.joint1:null;this.m_groundAnchor1.SetV(this.m_prismatic1.m_localAnchor1);this.m_localAnchor1.SetV(this.m_prismatic1.m_localAnchor2);B=this.m_prismatic1.GetJointTranslation()}this.m_ground2=F.joint2.GetBodyA();this.m_bodyB=F.joint2.GetBodyB();if(A==x.e_revoluteJoint){this.m_revolute2=F.joint2 instanceof h?F.joint2:null;this.m_groundAnchor2.SetV(this.m_revolute2.m_localAnchor1);this.m_localAnchor2.SetV(this.m_revolute2.m_localAnchor2);E=this.m_revolute2.GetJointAngle()}else{this.m_prismatic2=F.joint2 instanceof AA?F.joint2:null;this.m_groundAnchor2.SetV(this.m_prismatic2.m_localAnchor1);this.m_localAnchor2.SetV(this.m_prismatic2.m_localAnchor2);E=this.m_prismatic2.GetJointTranslation()}this.m_ratio=F.ratio;this.m_constant=B+this.m_ratio*E;this.m_impulse=0};T.prototype.InitVelocityConstraints=function(I){var G=this.m_ground1,E=this.m_ground2,F=this.m_bodyA,B=this.m_bodyB,A=0,D=0,M=0,K=0,H=M=0,L=0;this.m_J.SetZero();if(this.m_revolute1){this.m_J.angularA=-1;L+=F.m_invI}else{G=G.m_xf.R;D=this.m_prismatic1.m_localXAxis1;A=G.col1.x*D.x+G.col2.x*D.y;D=G.col1.y*D.x+G.col2.y*D.y;G=F.m_xf.R;M=this.m_localAnchor1.x-F.m_sweep.localCenter.x;K=this.m_localAnchor1.y-F.m_sweep.localCenter.y;H=G.col1.x*M+G.col2.x*K;K=G.col1.y*M+G.col2.y*K;M=H;M=M*D-K*A;this.m_J.linearA.Set(-A,-D);this.m_J.angularA=-M;L+=F.m_invMass+F.m_invI*M*M}if(this.m_revolute2){this.m_J.angularB=-this.m_ratio;L+=this.m_ratio*this.m_ratio*B.m_invI}else{G=E.m_xf.R;D=this.m_prismatic2.m_localXAxis1;A=G.col1.x*D.x+G.col2.x*D.y;D=G.col1.y*D.x+G.col2.y*D.y;G=B.m_xf.R;M=this.m_localAnchor2.x-B.m_sweep.localCenter.x;K=this.m_localAnchor2.y-B.m_sweep.localCenter.y;H=G.col1.x*M+G.col2.x*K;K=G.col1.y*M+G.col2.y*K;M=H;M=M*D-K*A;this.m_J.linearB.Set(-this.m_ratio*A,-this.m_ratio*D);this.m_J.angularB=-this.m_ratio*M;L+=this.m_ratio*this.m_ratio*(B.m_invMass+B.m_invI*M*M)}this.m_mass=L>0?1/L:0;if(I.warmStarting){F.m_linearVelocity.x+=F.m_invMass*this.m_impulse*this.m_J.linearA.x;F.m_linearVelocity.y+=F.m_invMass*this.m_impulse*this.m_J.linearA.y;F.m_angularVelocity+=F.m_invI*this.m_impulse*this.m_J.angularA;B.m_linearVelocity.x+=B.m_invMass*this.m_impulse*this.m_J.linearB.x;B.m_linearVelocity.y+=B.m_invMass*this.m_impulse*this.m_J.linearB.y;B.m_angularVelocity+=B.m_invI*this.m_impulse*this.m_J.angularB}else{this.m_impulse=0}};T.prototype.SolveVelocityConstraints=function(){var D=this.m_bodyA,B=this.m_bodyB,A=-this.m_mass*this.m_J.Compute(D.m_linearVelocity,D.m_angularVelocity,B.m_linearVelocity,B.m_angularVelocity);this.m_impulse+=A;D.m_linearVelocity.x+=D.m_invMass*A*this.m_J.linearA.x;D.m_linearVelocity.y+=D.m_invMass*A*this.m_J.linearA.y;D.m_angularVelocity+=D.m_invI*A*this.m_J.angularA;B.m_linearVelocity.x+=B.m_invMass*A*this.m_J.linearB.x;B.m_linearVelocity.y+=B.m_invMass*A*this.m_J.linearB.y;B.m_angularVelocity+=B.m_invI*A*this.m_J.angularB};T.prototype.SolvePositionConstraints=function(){var E=this.m_bodyA,D=this.m_bodyB,A=0,B=0;A=this.m_revolute1?this.m_revolute1.GetJointAngle():this.m_prismatic1.GetJointTranslation();B=this.m_revolute2?this.m_revolute2.GetJointAngle():this.m_prismatic2.GetJointTranslation();A=-this.m_mass*(this.m_constant-(A+this.m_ratio*B));E.m_sweep.c.x+=E.m_invMass*A*this.m_J.linearA.x;E.m_sweep.c.y+=E.m_invMass*A*this.m_J.linearA.y;E.m_sweep.a+=E.m_invI*A*this.m_J.angularA;D.m_sweep.c.x+=D.m_invMass*A*this.m_J.linearB.x;D.m_sweep.c.y+=D.m_invMass*A*this.m_J.linearB.y;D.m_sweep.a+=D.m_invI*A*this.m_J.angularB;E.SynchronizeTransform();D.SynchronizeTransform();return 0<AE.b2_linearSlop};Box2D.inherit(l,Box2D.Dynamics.Joints.b2JointDef);l.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;l.b2GearJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments)};l.prototype.b2GearJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_gearJoint;this.joint2=this.joint1=null;this.ratio=1};m.b2Jacobian=function(){this.linearA=new AB;this.linearB=new AB};m.prototype.SetZero=function(){this.linearA.SetZero();this.angularA=0;this.linearB.SetZero();this.angularB=0};m.prototype.Set=function(E,D,A,B){if(D===undefined){D=0}if(B===undefined){B=0}this.linearA.SetV(E);this.angularA=D;this.linearB.SetV(A);this.angularB=B};m.prototype.Compute=function(E,D,A,B){if(D===undefined){D=0}if(B===undefined){B=0}return this.linearA.x*E.x+this.linearA.y*E.y+this.angularA*D+(this.linearB.x*A.x+this.linearB.y*A.y)+this.angularB*B};x.b2Joint=function(){this.m_edgeA=new J;this.m_edgeB=new J;this.m_localCenterA=new AB;this.m_localCenterB=new AB};x.prototype.GetType=function(){return this.m_type};x.prototype.GetAnchorA=function(){return null};x.prototype.GetAnchorB=function(){return null};x.prototype.GetReactionForce=function(){return null};x.prototype.GetReactionTorque=function(){return 0};x.prototype.GetBodyA=function(){return this.m_bodyA};x.prototype.GetBodyB=function(){return this.m_bodyB};x.prototype.GetNext=function(){return this.m_next};x.prototype.GetUserData=function(){return this.m_userData};x.prototype.SetUserData=function(A){this.m_userData=A};x.prototype.IsActive=function(){return this.m_bodyA.IsActive()&&this.m_bodyB.IsActive()};x.Create=function(B){var A=null;switch(B.type){case x.e_distanceJoint:A=new X(B instanceof AJ?B:null);break;case x.e_mouseJoint:A=new AD(B instanceof AG?B:null);break;case x.e_prismaticJoint:A=new AA(B instanceof g?B:null);break;case x.e_revoluteJoint:A=new h(B instanceof b?B:null);break;case x.e_pulleyJoint:A=new AF(B instanceof e?B:null);break;case x.e_gearJoint:A=new T(B instanceof l?B:null);break;case x.e_lineJoint:A=new AK(B instanceof n?B:null);break;case x.e_weldJoint:A=new AL(B instanceof C?B:null);break;case x.e_frictionJoint:A=new AH(B instanceof f?B:null)}return A};x.Destroy=function(){};x.prototype.b2Joint=function(A){AE.b2Assert(A.bodyA!=A.bodyB);this.m_type=A.type;this.m_next=this.m_prev=null;this.m_bodyA=A.bodyA;this.m_bodyB=A.bodyB;this.m_collideConnected=A.collideConnected;this.m_islandFlag=false;this.m_userData=A.userData};x.prototype.InitVelocityConstraints=function(){};x.prototype.SolveVelocityConstraints=function(){};x.prototype.FinalizeVelocityConstraints=function(){};x.prototype.SolvePositionConstraints=function(){return false};Box2D.postDefs.push(function(){Box2D.Dynamics.Joints.b2Joint.e_unknownJoint=0;Box2D.Dynamics.Joints.b2Joint.e_revoluteJoint=1;Box2D.Dynamics.Joints.b2Joint.e_prismaticJoint=2;Box2D.Dynamics.Joints.b2Joint.e_distanceJoint=3;Box2D.Dynamics.Joints.b2Joint.e_pulleyJoint=4;Box2D.Dynamics.Joints.b2Joint.e_mouseJoint=5;Box2D.Dynamics.Joints.b2Joint.e_gearJoint=6;Box2D.Dynamics.Joints.b2Joint.e_lineJoint=7;Box2D.Dynamics.Joints.b2Joint.e_weldJoint=8;Box2D.Dynamics.Joints.b2Joint.e_frictionJoint=9;Box2D.Dynamics.Joints.b2Joint.e_inactiveLimit=0;Box2D.Dynamics.Joints.b2Joint.e_atLowerLimit=1;Box2D.Dynamics.Joints.b2Joint.e_atUpperLimit=2;Box2D.Dynamics.Joints.b2Joint.e_equalLimits=3});P.b2JointDef=function(){};P.prototype.b2JointDef=function(){this.type=x.e_unknownJoint;this.bodyB=this.bodyA=this.userData=null;this.collideConnected=false};J.b2JointEdge=function(){};Box2D.inherit(AK,Box2D.Dynamics.Joints.b2Joint);AK.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;AK.b2LineJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchor1=new AB;this.m_localAnchor2=new AB;this.m_localXAxis1=new AB;this.m_localYAxis1=new AB;this.m_axis=new AB;this.m_perp=new AB;this.m_K=new AC;this.m_impulse=new AB};AK.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};AK.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};AK.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*(this.m_impulse.x*this.m_perp.x+(this.m_motorImpulse+this.m_impulse.y)*this.m_axis.x),A*(this.m_impulse.x*this.m_perp.y+(this.m_motorImpulse+this.m_impulse.y)*this.m_axis.y))};AK.prototype.GetReactionTorque=function(A){if(A===undefined){A=0}return A*this.m_impulse.y};AK.prototype.GetJointTranslation=function(){var E=this.m_bodyA,D=this.m_bodyB,A=E.GetWorldPoint(this.m_localAnchor1),B=D.GetWorldPoint(this.m_localAnchor2);D=B.x-A.x;A=B.y-A.y;E=E.GetWorldVector(this.m_localXAxis1);return E.x*D+E.y*A};AK.prototype.GetJointSpeed=function(){var I=this.m_bodyA,G=this.m_bodyB,E;E=I.m_xf.R;var F=this.m_localAnchor1.x-I.m_sweep.localCenter.x,B=this.m_localAnchor1.y-I.m_sweep.localCenter.y,A=E.col1.x*F+E.col2.x*B;B=E.col1.y*F+E.col2.y*B;F=A;E=G.m_xf.R;var D=this.m_localAnchor2.x-G.m_sweep.localCenter.x,M=this.m_localAnchor2.y-G.m_sweep.localCenter.y;A=E.col1.x*D+E.col2.x*M;M=E.col1.y*D+E.col2.y*M;D=A;E=G.m_sweep.c.x+D-(I.m_sweep.c.x+F);A=G.m_sweep.c.y+M-(I.m_sweep.c.y+B);var K=I.GetWorldVector(this.m_localXAxis1),H=I.m_linearVelocity,L=G.m_linearVelocity;I=I.m_angularVelocity;G=G.m_angularVelocity;return E*-I*K.y+A*I*K.x+(K.x*(L.x+-G*M-H.x- -I*B)+K.y*(L.y+G*D-H.y-I*F))};AK.prototype.IsLimitEnabled=function(){return this.m_enableLimit};AK.prototype.EnableLimit=function(A){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_enableLimit=A};AK.prototype.GetLowerLimit=function(){return this.m_lowerTranslation};AK.prototype.GetUpperLimit=function(){return this.m_upperTranslation};AK.prototype.SetLimits=function(B,A){if(B===undefined){B=0}if(A===undefined){A=0}this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_lowerTranslation=B;this.m_upperTranslation=A};AK.prototype.IsMotorEnabled=function(){return this.m_enableMotor};AK.prototype.EnableMotor=function(A){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_enableMotor=A};AK.prototype.SetMotorSpeed=function(A){if(A===undefined){A=0}this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_motorSpeed=A};AK.prototype.GetMotorSpeed=function(){return this.m_motorSpeed};AK.prototype.SetMaxMotorForce=function(A){if(A===undefined){A=0}this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_maxMotorForce=A};AK.prototype.GetMaxMotorForce=function(){return this.m_maxMotorForce};AK.prototype.GetMotorForce=function(){return this.m_motorImpulse};AK.prototype.b2LineJoint=function(A){this.__super.b2Joint.call(this,A);this.m_localAnchor1.SetV(A.localAnchorA);this.m_localAnchor2.SetV(A.localAnchorB);this.m_localXAxis1.SetV(A.localAxisA);this.m_localYAxis1.x=-this.m_localXAxis1.y;this.m_localYAxis1.y=this.m_localXAxis1.x;this.m_impulse.SetZero();this.m_motorImpulse=this.m_motorMass=0;this.m_lowerTranslation=A.lowerTranslation;this.m_upperTranslation=A.upperTranslation;this.m_maxMotorForce=A.maxMotorForce;this.m_motorSpeed=A.motorSpeed;this.m_enableLimit=A.enableLimit;this.m_enableMotor=A.enableMotor;this.m_limitState=x.e_inactiveLimit;this.m_axis.SetZero();this.m_perp.SetZero()};AK.prototype.InitVelocityConstraints=function(I){var G=this.m_bodyA,E=this.m_bodyB,F,B=0;this.m_localCenterA.SetV(G.GetLocalCenter());this.m_localCenterB.SetV(E.GetLocalCenter());var A=G.GetTransform();E.GetTransform();F=G.m_xf.R;var D=this.m_localAnchor1.x-this.m_localCenterA.x,L=this.m_localAnchor1.y-this.m_localCenterA.y;B=F.col1.x*D+F.col2.x*L;L=F.col1.y*D+F.col2.y*L;D=B;F=E.m_xf.R;var K=this.m_localAnchor2.x-this.m_localCenterB.x,H=this.m_localAnchor2.y-this.m_localCenterB.y;B=F.col1.x*K+F.col2.x*H;H=F.col1.y*K+F.col2.y*H;K=B;F=E.m_sweep.c.x+K-G.m_sweep.c.x-D;B=E.m_sweep.c.y+H-G.m_sweep.c.y-L;this.m_invMassA=G.m_invMass;this.m_invMassB=E.m_invMass;this.m_invIA=G.m_invI;this.m_invIB=E.m_invI;this.m_axis.SetV(t.MulMV(A.R,this.m_localXAxis1));this.m_a1=(F+D)*this.m_axis.y-(B+L)*this.m_axis.x;this.m_a2=K*this.m_axis.y-H*this.m_axis.x;this.m_motorMass=this.m_invMassA+this.m_invMassB+this.m_invIA*this.m_a1*this.m_a1+this.m_invIB*this.m_a2*this.m_a2;this.m_motorMass=this.m_motorMass>Number.MIN_VALUE?1/this.m_motorMass:0;this.m_perp.SetV(t.MulMV(A.R,this.m_localYAxis1));this.m_s1=(F+D)*this.m_perp.y-(B+L)*this.m_perp.x;this.m_s2=K*this.m_perp.y-H*this.m_perp.x;A=this.m_invMassA;D=this.m_invMassB;L=this.m_invIA;K=this.m_invIB;this.m_K.col1.x=A+D+L*this.m_s1*this.m_s1+K*this.m_s2*this.m_s2;this.m_K.col1.y=L*this.m_s1*this.m_a1+K*this.m_s2*this.m_a2;this.m_K.col2.x=this.m_K.col1.y;this.m_K.col2.y=A+D+L*this.m_a1*this.m_a1+K*this.m_a2*this.m_a2;if(this.m_enableLimit){F=this.m_axis.x*F+this.m_axis.y*B;if(t.Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*AE.b2_linearSlop){this.m_limitState=x.e_equalLimits}else{if(F<=this.m_lowerTranslation){if(this.m_limitState!=x.e_atLowerLimit){this.m_limitState=x.e_atLowerLimit;this.m_impulse.y=0}}else{if(F>=this.m_upperTranslation){if(this.m_limitState!=x.e_atUpperLimit){this.m_limitState=x.e_atUpperLimit;this.m_impulse.y=0}}else{this.m_limitState=x.e_inactiveLimit;this.m_impulse.y=0}}}}else{this.m_limitState=x.e_inactiveLimit}if(this.m_enableMotor==false){this.m_motorImpulse=0}if(I.warmStarting){this.m_impulse.x*=I.dtRatio;this.m_impulse.y*=I.dtRatio;this.m_motorImpulse*=I.dtRatio;I=this.m_impulse.x*this.m_perp.x+(this.m_motorImpulse+this.m_impulse.y)*this.m_axis.x;F=this.m_impulse.x*this.m_perp.y+(this.m_motorImpulse+this.m_impulse.y)*this.m_axis.y;B=this.m_impulse.x*this.m_s1+(this.m_motorImpulse+this.m_impulse.y)*this.m_a1;A=this.m_impulse.x*this.m_s2+(this.m_motorImpulse+this.m_impulse.y)*this.m_a2;G.m_linearVelocity.x-=this.m_invMassA*I;G.m_linearVelocity.y-=this.m_invMassA*F;G.m_angularVelocity-=this.m_invIA*B;E.m_linearVelocity.x+=this.m_invMassB*I;E.m_linearVelocity.y+=this.m_invMassB*F;E.m_angularVelocity+=this.m_invIB*A}else{this.m_impulse.SetZero();this.m_motorImpulse=0}};AK.prototype.SolveVelocityConstraints=function(I){var G=this.m_bodyA,E=this.m_bodyB,F=G.m_linearVelocity,B=G.m_angularVelocity,A=E.m_linearVelocity,D=E.m_angularVelocity,M=0,K=0,H=0,L=0;if(this.m_enableMotor&&this.m_limitState!=x.e_equalLimits){L=this.m_motorMass*(this.m_motorSpeed-(this.m_axis.x*(A.x-F.x)+this.m_axis.y*(A.y-F.y)+this.m_a2*D-this.m_a1*B));M=this.m_motorImpulse;K=I.dt*this.m_maxMotorForce;this.m_motorImpulse=t.Clamp(this.m_motorImpulse+L,-K,K);L=this.m_motorImpulse-M;M=L*this.m_axis.x;K=L*this.m_axis.y;H=L*this.m_a1;L=L*this.m_a2;F.x-=this.m_invMassA*M;F.y-=this.m_invMassA*K;B-=this.m_invIA*H;A.x+=this.m_invMassB*M;A.y+=this.m_invMassB*K;D+=this.m_invIB*L}K=this.m_perp.x*(A.x-F.x)+this.m_perp.y*(A.y-F.y)+this.m_s2*D-this.m_s1*B;if(this.m_enableLimit&&this.m_limitState!=x.e_inactiveLimit){H=this.m_axis.x*(A.x-F.x)+this.m_axis.y*(A.y-F.y)+this.m_a2*D-this.m_a1*B;M=this.m_impulse.Copy();I=this.m_K.Solve(new AB,-K,-H);this.m_impulse.Add(I);if(this.m_limitState==x.e_atLowerLimit){this.m_impulse.y=t.Max(this.m_impulse.y,0)}else{if(this.m_limitState==x.e_atUpperLimit){this.m_impulse.y=t.Min(this.m_impulse.y,0)}}K=-K-(this.m_impulse.y-M.y)*this.m_K.col2.x;H=0;H=this.m_K.col1.x!=0?K/this.m_K.col1.x+M.x:M.x;this.m_impulse.x=H;I.x=this.m_impulse.x-M.x;I.y=this.m_impulse.y-M.y;M=I.x*this.m_perp.x+I.y*this.m_axis.x;K=I.x*this.m_perp.y+I.y*this.m_axis.y;H=I.x*this.m_s1+I.y*this.m_a1;L=I.x*this.m_s2+I.y*this.m_a2}else{I=0;I=this.m_K.col1.x!=0?-K/this.m_K.col1.x:0;this.m_impulse.x+=I;M=I*this.m_perp.x;K=I*this.m_perp.y;H=I*this.m_s1;L=I*this.m_s2}F.x-=this.m_invMassA*M;F.y-=this.m_invMassA*K;B-=this.m_invIA*H;A.x+=this.m_invMassB*M;A.y+=this.m_invMassB*K;D+=this.m_invIB*L;G.m_linearVelocity.SetV(F);G.m_angularVelocity=B;E.m_linearVelocity.SetV(A);E.m_angularVelocity=D};AK.prototype.SolvePositionConstraints=function(){var N=this.m_bodyA,I=this.m_bodyB,G=N.m_sweep.c,H=N.m_sweep.a,D=I.m_sweep.c,B=I.m_sweep.a,E,R=0,O=0,K=0,Q=0,M=E=0,L=0;O=false;var F=0,A=AC.FromAngle(H);K=AC.FromAngle(B);E=A;L=this.m_localAnchor1.x-this.m_localCenterA.x;var U=this.m_localAnchor1.y-this.m_localCenterA.y;R=E.col1.x*L+E.col2.x*U;U=E.col1.y*L+E.col2.y*U;L=R;E=K;K=this.m_localAnchor2.x-this.m_localCenterB.x;Q=this.m_localAnchor2.y-this.m_localCenterB.y;R=E.col1.x*K+E.col2.x*Q;Q=E.col1.y*K+E.col2.y*Q;K=R;E=D.x+K-G.x-L;R=D.y+Q-G.y-U;if(this.m_enableLimit){this.m_axis=t.MulMV(A,this.m_localXAxis1);this.m_a1=(E+L)*this.m_axis.y-(R+U)*this.m_axis.x;this.m_a2=K*this.m_axis.y-Q*this.m_axis.x;var S=this.m_axis.x*E+this.m_axis.y*R;if(t.Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*AE.b2_linearSlop){F=t.Clamp(S,-AE.b2_maxLinearCorrection,AE.b2_maxLinearCorrection);M=t.Abs(S);O=true}else{if(S<=this.m_lowerTranslation){F=t.Clamp(S-this.m_lowerTranslation+AE.b2_linearSlop,-AE.b2_maxLinearCorrection,0);M=this.m_lowerTranslation-S;O=true}else{if(S>=this.m_upperTranslation){F=t.Clamp(S-this.m_upperTranslation+AE.b2_linearSlop,0,AE.b2_maxLinearCorrection);M=S-this.m_upperTranslation;O=true}}}}this.m_perp=t.MulMV(A,this.m_localYAxis1);this.m_s1=(E+L)*this.m_perp.y-(R+U)*this.m_perp.x;this.m_s2=K*this.m_perp.y-Q*this.m_perp.x;A=new AB;U=this.m_perp.x*E+this.m_perp.y*R;M=t.Max(M,t.Abs(U));L=0;if(O){O=this.m_invMassA;K=this.m_invMassB;Q=this.m_invIA;E=this.m_invIB;this.m_K.col1.x=O+K+Q*this.m_s1*this.m_s1+E*this.m_s2*this.m_s2;this.m_K.col1.y=Q*this.m_s1*this.m_a1+E*this.m_s2*this.m_a2;this.m_K.col2.x=this.m_K.col1.y;this.m_K.col2.y=O+K+Q*this.m_a1*this.m_a1+E*this.m_a2*this.m_a2;this.m_K.Solve(A,-U,-F)}else{O=this.m_invMassA;K=this.m_invMassB;Q=this.m_invIA;E=this.m_invIB;F=O+K+Q*this.m_s1*this.m_s1+E*this.m_s2*this.m_s2;O=0;O=F!=0?-U/F:0;A.x=O;A.y=0}F=A.x*this.m_perp.x+A.y*this.m_axis.x;O=A.x*this.m_perp.y+A.y*this.m_axis.y;U=A.x*this.m_s1+A.y*this.m_a1;A=A.x*this.m_s2+A.y*this.m_a2;G.x-=this.m_invMassA*F;G.y-=this.m_invMassA*O;H-=this.m_invIA*U;D.x+=this.m_invMassB*F;D.y+=this.m_invMassB*O;B+=this.m_invIB*A;N.m_sweep.a=H;I.m_sweep.a=B;N.SynchronizeTransform();I.SynchronizeTransform();return M<=AE.b2_linearSlop&&L<=AE.b2_angularSlop};Box2D.inherit(n,Box2D.Dynamics.Joints.b2JointDef);n.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;n.b2LineJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new AB;this.localAnchorB=new AB;this.localAxisA=new AB};n.prototype.b2LineJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_lineJoint;this.localAxisA.Set(1,0);this.enableLimit=false;this.upperTranslation=this.lowerTranslation=0;this.enableMotor=false;this.motorSpeed=this.maxMotorForce=0};n.prototype.Initialize=function(E,D,A,B){this.bodyA=E;this.bodyB=D;this.localAnchorA=this.bodyA.GetLocalPoint(A);this.localAnchorB=this.bodyB.GetLocalPoint(A);this.localAxisA=this.bodyA.GetLocalVector(B)};Box2D.inherit(AD,Box2D.Dynamics.Joints.b2Joint);AD.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;AD.b2MouseJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.K=new AC;this.K1=new AC;this.K2=new AC;this.m_localAnchor=new AB;this.m_target=new AB;this.m_impulse=new AB;this.m_mass=new AC;this.m_C=new AB};AD.prototype.GetAnchorA=function(){return this.m_target};AD.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor)};AD.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*this.m_impulse.x,A*this.m_impulse.y)};AD.prototype.GetReactionTorque=function(){return 0};AD.prototype.GetTarget=function(){return this.m_target};AD.prototype.SetTarget=function(A){this.m_bodyB.IsAwake()==false&&this.m_bodyB.SetAwake(true);this.m_target=A};AD.prototype.GetMaxForce=function(){return this.m_maxForce};AD.prototype.SetMaxForce=function(A){if(A===undefined){A=0}this.m_maxForce=A};AD.prototype.GetFrequency=function(){return this.m_frequencyHz};AD.prototype.SetFrequency=function(A){if(A===undefined){A=0}this.m_frequencyHz=A};AD.prototype.GetDampingRatio=function(){return this.m_dampingRatio};AD.prototype.SetDampingRatio=function(A){if(A===undefined){A=0}this.m_dampingRatio=A};AD.prototype.b2MouseJoint=function(E){this.__super.b2Joint.call(this,E);this.m_target.SetV(E.target);var D=this.m_target.x-this.m_bodyB.m_xf.position.x,A=this.m_target.y-this.m_bodyB.m_xf.position.y,B=this.m_bodyB.m_xf.R;this.m_localAnchor.x=D*B.col1.x+A*B.col1.y;this.m_localAnchor.y=D*B.col2.x+A*B.col2.y;this.m_maxForce=E.maxForce;this.m_impulse.SetZero();this.m_frequencyHz=E.frequencyHz;this.m_dampingRatio=E.dampingRatio;this.m_gamma=this.m_beta=0};AD.prototype.InitVelocityConstraints=function(G){var D=this.m_bodyB,A=D.GetMass(),B=2*Math.PI*this.m_frequencyHz,F=A*B*B;this.m_gamma=G.dt*(2*A*this.m_dampingRatio*B+G.dt*F);this.m_gamma=this.m_gamma!=0?1/this.m_gamma:0;this.m_beta=G.dt*F*this.m_gamma;F=D.m_xf.R;A=this.m_localAnchor.x-D.m_sweep.localCenter.x;B=this.m_localAnchor.y-D.m_sweep.localCenter.y;var E=F.col1.x*A+F.col2.x*B;B=F.col1.y*A+F.col2.y*B;A=E;F=D.m_invMass;E=D.m_invI;this.K1.col1.x=F;this.K1.col2.x=0;this.K1.col1.y=0;this.K1.col2.y=F;this.K2.col1.x=E*B*B;this.K2.col2.x=-E*A*B;this.K2.col1.y=-E*A*B;this.K2.col2.y=E*A*A;this.K.SetM(this.K1);this.K.AddM(this.K2);this.K.col1.x+=this.m_gamma;this.K.col2.y+=this.m_gamma;this.K.GetInverse(this.m_mass);this.m_C.x=D.m_sweep.c.x+A-this.m_target.x;this.m_C.y=D.m_sweep.c.y+B-this.m_target.y;D.m_angularVelocity*=0.98;this.m_impulse.x*=G.dtRatio;this.m_impulse.y*=G.dtRatio;D.m_linearVelocity.x+=F*this.m_impulse.x;D.m_linearVelocity.y+=F*this.m_impulse.y;D.m_angularVelocity+=E*(A*this.m_impulse.y-B*this.m_impulse.x)};AD.prototype.SolveVelocityConstraints=function(H){var E=this.m_bodyB,B,D=0,G=0;B=E.m_xf.R;var F=this.m_localAnchor.x-E.m_sweep.localCenter.x,I=this.m_localAnchor.y-E.m_sweep.localCenter.y;D=B.col1.x*F+B.col2.x*I;I=B.col1.y*F+B.col2.y*I;F=D;D=E.m_linearVelocity.x+-E.m_angularVelocity*I;var A=E.m_linearVelocity.y+E.m_angularVelocity*F;B=this.m_mass;D=D+this.m_beta*this.m_C.x+this.m_gamma*this.m_impulse.x;G=A+this.m_beta*this.m_C.y+this.m_gamma*this.m_impulse.y;A=-(B.col1.x*D+B.col2.x*G);G=-(B.col1.y*D+B.col2.y*G);B=this.m_impulse.x;D=this.m_impulse.y;this.m_impulse.x+=A;this.m_impulse.y+=G;H=H.dt*this.m_maxForce;this.m_impulse.LengthSquared()>H*H&&this.m_impulse.Multiply(H/this.m_impulse.Length());A=this.m_impulse.x-B;G=this.m_impulse.y-D;E.m_linearVelocity.x+=E.m_invMass*A;E.m_linearVelocity.y+=E.m_invMass*G;E.m_angularVelocity+=E.m_invI*(F*G-I*A)};AD.prototype.SolvePositionConstraints=function(){return true};Box2D.inherit(AG,Box2D.Dynamics.Joints.b2JointDef);AG.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;AG.b2MouseJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.target=new AB};AG.prototype.b2MouseJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_mouseJoint;this.maxForce=0;this.frequencyHz=5;this.dampingRatio=0.7};Box2D.inherit(AA,Box2D.Dynamics.Joints.b2Joint);AA.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;AA.b2PrismaticJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchor1=new AB;this.m_localAnchor2=new AB;this.m_localXAxis1=new AB;this.m_localYAxis1=new AB;this.m_axis=new AB;this.m_perp=new AB;this.m_K=new o;this.m_impulse=new AI};AA.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};AA.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};AA.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*(this.m_impulse.x*this.m_perp.x+(this.m_motorImpulse+this.m_impulse.z)*this.m_axis.x),A*(this.m_impulse.x*this.m_perp.y+(this.m_motorImpulse+this.m_impulse.z)*this.m_axis.y))};AA.prototype.GetReactionTorque=function(A){if(A===undefined){A=0}return A*this.m_impulse.y};AA.prototype.GetJointTranslation=function(){var E=this.m_bodyA,D=this.m_bodyB,A=E.GetWorldPoint(this.m_localAnchor1),B=D.GetWorldPoint(this.m_localAnchor2);D=B.x-A.x;A=B.y-A.y;E=E.GetWorldVector(this.m_localXAxis1);return E.x*D+E.y*A};AA.prototype.GetJointSpeed=function(){var I=this.m_bodyA,G=this.m_bodyB,E;E=I.m_xf.R;var F=this.m_localAnchor1.x-I.m_sweep.localCenter.x,B=this.m_localAnchor1.y-I.m_sweep.localCenter.y,A=E.col1.x*F+E.col2.x*B;B=E.col1.y*F+E.col2.y*B;F=A;E=G.m_xf.R;var D=this.m_localAnchor2.x-G.m_sweep.localCenter.x,M=this.m_localAnchor2.y-G.m_sweep.localCenter.y;A=E.col1.x*D+E.col2.x*M;M=E.col1.y*D+E.col2.y*M;D=A;E=G.m_sweep.c.x+D-(I.m_sweep.c.x+F);A=G.m_sweep.c.y+M-(I.m_sweep.c.y+B);var K=I.GetWorldVector(this.m_localXAxis1),H=I.m_linearVelocity,L=G.m_linearVelocity;I=I.m_angularVelocity;G=G.m_angularVelocity;return E*-I*K.y+A*I*K.x+(K.x*(L.x+-G*M-H.x- -I*B)+K.y*(L.y+G*D-H.y-I*F))};AA.prototype.IsLimitEnabled=function(){return this.m_enableLimit};AA.prototype.EnableLimit=function(A){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_enableLimit=A};AA.prototype.GetLowerLimit=function(){return this.m_lowerTranslation};AA.prototype.GetUpperLimit=function(){return this.m_upperTranslation};AA.prototype.SetLimits=function(B,A){if(B===undefined){B=0}if(A===undefined){A=0}this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_lowerTranslation=B;this.m_upperTranslation=A};AA.prototype.IsMotorEnabled=function(){return this.m_enableMotor};AA.prototype.EnableMotor=function(A){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_enableMotor=A};AA.prototype.SetMotorSpeed=function(A){if(A===undefined){A=0}this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_motorSpeed=A};AA.prototype.GetMotorSpeed=function(){return this.m_motorSpeed};AA.prototype.SetMaxMotorForce=function(A){if(A===undefined){A=0}this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_maxMotorForce=A};AA.prototype.GetMotorForce=function(){return this.m_motorImpulse};AA.prototype.b2PrismaticJoint=function(A){this.__super.b2Joint.call(this,A);this.m_localAnchor1.SetV(A.localAnchorA);this.m_localAnchor2.SetV(A.localAnchorB);this.m_localXAxis1.SetV(A.localAxisA);this.m_localYAxis1.x=-this.m_localXAxis1.y;this.m_localYAxis1.y=this.m_localXAxis1.x;this.m_refAngle=A.referenceAngle;this.m_impulse.SetZero();this.m_motorImpulse=this.m_motorMass=0;this.m_lowerTranslation=A.lowerTranslation;this.m_upperTranslation=A.upperTranslation;this.m_maxMotorForce=A.maxMotorForce;this.m_motorSpeed=A.motorSpeed;this.m_enableLimit=A.enableLimit;this.m_enableMotor=A.enableMotor;this.m_limitState=x.e_inactiveLimit;this.m_axis.SetZero();this.m_perp.SetZero()};AA.prototype.InitVelocityConstraints=function(I){var G=this.m_bodyA,E=this.m_bodyB,F,B=0;this.m_localCenterA.SetV(G.GetLocalCenter());this.m_localCenterB.SetV(E.GetLocalCenter());var A=G.GetTransform();E.GetTransform();F=G.m_xf.R;var D=this.m_localAnchor1.x-this.m_localCenterA.x,L=this.m_localAnchor1.y-this.m_localCenterA.y;B=F.col1.x*D+F.col2.x*L;L=F.col1.y*D+F.col2.y*L;D=B;F=E.m_xf.R;var K=this.m_localAnchor2.x-this.m_localCenterB.x,H=this.m_localAnchor2.y-this.m_localCenterB.y;B=F.col1.x*K+F.col2.x*H;H=F.col1.y*K+F.col2.y*H;K=B;F=E.m_sweep.c.x+K-G.m_sweep.c.x-D;B=E.m_sweep.c.y+H-G.m_sweep.c.y-L;this.m_invMassA=G.m_invMass;this.m_invMassB=E.m_invMass;this.m_invIA=G.m_invI;this.m_invIB=E.m_invI;this.m_axis.SetV(t.MulMV(A.R,this.m_localXAxis1));this.m_a1=(F+D)*this.m_axis.y-(B+L)*this.m_axis.x;this.m_a2=K*this.m_axis.y-H*this.m_axis.x;this.m_motorMass=this.m_invMassA+this.m_invMassB+this.m_invIA*this.m_a1*this.m_a1+this.m_invIB*this.m_a2*this.m_a2;if(this.m_motorMass>Number.MIN_VALUE){this.m_motorMass=1/this.m_motorMass}this.m_perp.SetV(t.MulMV(A.R,this.m_localYAxis1));this.m_s1=(F+D)*this.m_perp.y-(B+L)*this.m_perp.x;this.m_s2=K*this.m_perp.y-H*this.m_perp.x;A=this.m_invMassA;D=this.m_invMassB;L=this.m_invIA;K=this.m_invIB;this.m_K.col1.x=A+D+L*this.m_s1*this.m_s1+K*this.m_s2*this.m_s2;this.m_K.col1.y=L*this.m_s1+K*this.m_s2;this.m_K.col1.z=L*this.m_s1*this.m_a1+K*this.m_s2*this.m_a2;this.m_K.col2.x=this.m_K.col1.y;this.m_K.col2.y=L+K;this.m_K.col2.z=L*this.m_a1+K*this.m_a2;this.m_K.col3.x=this.m_K.col1.z;this.m_K.col3.y=this.m_K.col2.z;this.m_K.col3.z=A+D+L*this.m_a1*this.m_a1+K*this.m_a2*this.m_a2;if(this.m_enableLimit){F=this.m_axis.x*F+this.m_axis.y*B;if(t.Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*AE.b2_linearSlop){this.m_limitState=x.e_equalLimits}else{if(F<=this.m_lowerTranslation){if(this.m_limitState!=x.e_atLowerLimit){this.m_limitState=x.e_atLowerLimit;this.m_impulse.z=0}}else{if(F>=this.m_upperTranslation){if(this.m_limitState!=x.e_atUpperLimit){this.m_limitState=x.e_atUpperLimit;this.m_impulse.z=0}}else{this.m_limitState=x.e_inactiveLimit;this.m_impulse.z=0}}}}else{this.m_limitState=x.e_inactiveLimit}if(this.m_enableMotor==false){this.m_motorImpulse=0}if(I.warmStarting){this.m_impulse.x*=I.dtRatio;this.m_impulse.y*=I.dtRatio;this.m_motorImpulse*=I.dtRatio;I=this.m_impulse.x*this.m_perp.x+(this.m_motorImpulse+this.m_impulse.z)*this.m_axis.x;F=this.m_impulse.x*this.m_perp.y+(this.m_motorImpulse+this.m_impulse.z)*this.m_axis.y;B=this.m_impulse.x*this.m_s1+this.m_impulse.y+(this.m_motorImpulse+this.m_impulse.z)*this.m_a1;A=this.m_impulse.x*this.m_s2+this.m_impulse.y+(this.m_motorImpulse+this.m_impulse.z)*this.m_a2;G.m_linearVelocity.x-=this.m_invMassA*I;G.m_linearVelocity.y-=this.m_invMassA*F;G.m_angularVelocity-=this.m_invIA*B;E.m_linearVelocity.x+=this.m_invMassB*I;E.m_linearVelocity.y+=this.m_invMassB*F;E.m_angularVelocity+=this.m_invIB*A}else{this.m_impulse.SetZero();this.m_motorImpulse=0}};AA.prototype.SolveVelocityConstraints=function(I){var G=this.m_bodyA,E=this.m_bodyB,F=G.m_linearVelocity,B=G.m_angularVelocity,A=E.m_linearVelocity,D=E.m_angularVelocity,M=0,K=0,H=0,L=0;if(this.m_enableMotor&&this.m_limitState!=x.e_equalLimits){L=this.m_motorMass*(this.m_motorSpeed-(this.m_axis.x*(A.x-F.x)+this.m_axis.y*(A.y-F.y)+this.m_a2*D-this.m_a1*B));M=this.m_motorImpulse;I=I.dt*this.m_maxMotorForce;this.m_motorImpulse=t.Clamp(this.m_motorImpulse+L,-I,I);L=this.m_motorImpulse-M;M=L*this.m_axis.x;K=L*this.m_axis.y;H=L*this.m_a1;L=L*this.m_a2;F.x-=this.m_invMassA*M;F.y-=this.m_invMassA*K;B-=this.m_invIA*H;A.x+=this.m_invMassB*M;A.y+=this.m_invMassB*K;D+=this.m_invIB*L}H=this.m_perp.x*(A.x-F.x)+this.m_perp.y*(A.y-F.y)+this.m_s2*D-this.m_s1*B;K=D-B;if(this.m_enableLimit&&this.m_limitState!=x.e_inactiveLimit){I=this.m_axis.x*(A.x-F.x)+this.m_axis.y*(A.y-F.y)+this.m_a2*D-this.m_a1*B;M=this.m_impulse.Copy();I=this.m_K.Solve33(new AI,-H,-K,-I);this.m_impulse.Add(I);if(this.m_limitState==x.e_atLowerLimit){this.m_impulse.z=t.Max(this.m_impulse.z,0)}else{if(this.m_limitState==x.e_atUpperLimit){this.m_impulse.z=t.Min(this.m_impulse.z,0)}}H=-H-(this.m_impulse.z-M.z)*this.m_K.col3.x;K=-K-(this.m_impulse.z-M.z)*this.m_K.col3.y;K=this.m_K.Solve22(new AB,H,K);K.x+=M.x;K.y+=M.y;this.m_impulse.x=K.x;this.m_impulse.y=K.y;I.x=this.m_impulse.x-M.x;I.y=this.m_impulse.y-M.y;I.z=this.m_impulse.z-M.z;M=I.x*this.m_perp.x+I.z*this.m_axis.x;K=I.x*this.m_perp.y+I.z*this.m_axis.y;H=I.x*this.m_s1+I.y+I.z*this.m_a1;L=I.x*this.m_s2+I.y+I.z*this.m_a2}else{I=this.m_K.Solve22(new AB,-H,-K);this.m_impulse.x+=I.x;this.m_impulse.y+=I.y;M=I.x*this.m_perp.x;K=I.x*this.m_perp.y;H=I.x*this.m_s1+I.y;L=I.x*this.m_s2+I.y}F.x-=this.m_invMassA*M;F.y-=this.m_invMassA*K;B-=this.m_invIA*H;A.x+=this.m_invMassB*M;A.y+=this.m_invMassB*K;D+=this.m_invIB*L;G.m_linearVelocity.SetV(F);G.m_angularVelocity=B;E.m_linearVelocity.SetV(A);E.m_angularVelocity=D};AA.prototype.SolvePositionConstraints=function(){var N=this.m_bodyA,I=this.m_bodyB,G=N.m_sweep.c,H=N.m_sweep.a,D=I.m_sweep.c,B=I.m_sweep.a,E,R=0,O=0,K=0,Q=R=E=0,M=0;O=false;var L=0,F=AC.FromAngle(H),A=AC.FromAngle(B);E=F;M=this.m_localAnchor1.x-this.m_localCenterA.x;var U=this.m_localAnchor1.y-this.m_localCenterA.y;R=E.col1.x*M+E.col2.x*U;U=E.col1.y*M+E.col2.y*U;M=R;E=A;A=this.m_localAnchor2.x-this.m_localCenterB.x;K=this.m_localAnchor2.y-this.m_localCenterB.y;R=E.col1.x*A+E.col2.x*K;K=E.col1.y*A+E.col2.y*K;A=R;E=D.x+A-G.x-M;R=D.y+K-G.y-U;if(this.m_enableLimit){this.m_axis=t.MulMV(F,this.m_localXAxis1);this.m_a1=(E+M)*this.m_axis.y-(R+U)*this.m_axis.x;this.m_a2=A*this.m_axis.y-K*this.m_axis.x;var S=this.m_axis.x*E+this.m_axis.y*R;if(t.Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*AE.b2_linearSlop){L=t.Clamp(S,-AE.b2_maxLinearCorrection,AE.b2_maxLinearCorrection);Q=t.Abs(S);O=true}else{if(S<=this.m_lowerTranslation){L=t.Clamp(S-this.m_lowerTranslation+AE.b2_linearSlop,-AE.b2_maxLinearCorrection,0);Q=this.m_lowerTranslation-S;O=true}else{if(S>=this.m_upperTranslation){L=t.Clamp(S-this.m_upperTranslation+AE.b2_linearSlop,0,AE.b2_maxLinearCorrection);Q=S-this.m_upperTranslation;O=true}}}}this.m_perp=t.MulMV(F,this.m_localYAxis1);this.m_s1=(E+M)*this.m_perp.y-(R+U)*this.m_perp.x;this.m_s2=A*this.m_perp.y-K*this.m_perp.x;F=new AI;U=this.m_perp.x*E+this.m_perp.y*R;A=B-H-this.m_refAngle;Q=t.Max(Q,t.Abs(U));M=t.Abs(A);if(O){O=this.m_invMassA;K=this.m_invMassB;E=this.m_invIA;R=this.m_invIB;this.m_K.col1.x=O+K+E*this.m_s1*this.m_s1+R*this.m_s2*this.m_s2;this.m_K.col1.y=E*this.m_s1+R*this.m_s2;this.m_K.col1.z=E*this.m_s1*this.m_a1+R*this.m_s2*this.m_a2;this.m_K.col2.x=this.m_K.col1.y;this.m_K.col2.y=E+R;this.m_K.col2.z=E*this.m_a1+R*this.m_a2;this.m_K.col3.x=this.m_K.col1.z;this.m_K.col3.y=this.m_K.col2.z;this.m_K.col3.z=O+K+E*this.m_a1*this.m_a1+R*this.m_a2*this.m_a2;this.m_K.Solve33(F,-U,-A,-L)}else{O=this.m_invMassA;K=this.m_invMassB;E=this.m_invIA;R=this.m_invIB;L=E*this.m_s1+R*this.m_s2;S=E+R;this.m_K.col1.Set(O+K+E*this.m_s1*this.m_s1+R*this.m_s2*this.m_s2,L,0);this.m_K.col2.Set(L,S,0);L=this.m_K.Solve22(new AB,-U,-A);F.x=L.x;F.y=L.y;F.z=0}L=F.x*this.m_perp.x+F.z*this.m_axis.x;O=F.x*this.m_perp.y+F.z*this.m_axis.y;U=F.x*this.m_s1+F.y+F.z*this.m_a1;F=F.x*this.m_s2+F.y+F.z*this.m_a2;G.x-=this.m_invMassA*L;G.y-=this.m_invMassA*O;H-=this.m_invIA*U;D.x+=this.m_invMassB*L;D.y+=this.m_invMassB*O;B+=this.m_invIB*F;N.m_sweep.a=H;I.m_sweep.a=B;N.SynchronizeTransform();I.SynchronizeTransform();return Q<=AE.b2_linearSlop&&M<=AE.b2_angularSlop};Box2D.inherit(g,Box2D.Dynamics.Joints.b2JointDef);g.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;g.b2PrismaticJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new AB;this.localAnchorB=new AB;this.localAxisA=new AB};g.prototype.b2PrismaticJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_prismaticJoint;this.localAxisA.Set(1,0);this.referenceAngle=0;this.enableLimit=false;this.upperTranslation=this.lowerTranslation=0;this.enableMotor=false;this.motorSpeed=this.maxMotorForce=0};g.prototype.Initialize=function(E,D,A,B){this.bodyA=E;this.bodyB=D;this.localAnchorA=this.bodyA.GetLocalPoint(A);this.localAnchorB=this.bodyB.GetLocalPoint(A);this.localAxisA=this.bodyA.GetLocalVector(B);this.referenceAngle=this.bodyB.GetAngle()-this.bodyA.GetAngle()};Box2D.inherit(AF,Box2D.Dynamics.Joints.b2Joint);AF.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;AF.b2PulleyJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_groundAnchor1=new AB;this.m_groundAnchor2=new AB;this.m_localAnchor1=new AB;this.m_localAnchor2=new AB;this.m_u1=new AB;this.m_u2=new AB};AF.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};AF.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};AF.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*this.m_impulse*this.m_u2.x,A*this.m_impulse*this.m_u2.y)};AF.prototype.GetReactionTorque=function(){return 0};AF.prototype.GetGroundAnchorA=function(){var A=this.m_ground.m_xf.position.Copy();A.Add(this.m_groundAnchor1);return A};AF.prototype.GetGroundAnchorB=function(){var A=this.m_ground.m_xf.position.Copy();A.Add(this.m_groundAnchor2);return A};AF.prototype.GetLength1=function(){var B=this.m_bodyA.GetWorldPoint(this.m_localAnchor1),A=B.x-(this.m_ground.m_xf.position.x+this.m_groundAnchor1.x);B=B.y-(this.m_ground.m_xf.position.y+this.m_groundAnchor1.y);return Math.sqrt(A*A+B*B)};AF.prototype.GetLength2=function(){var B=this.m_bodyB.GetWorldPoint(this.m_localAnchor2),A=B.x-(this.m_ground.m_xf.position.x+this.m_groundAnchor2.x);B=B.y-(this.m_ground.m_xf.position.y+this.m_groundAnchor2.y);return Math.sqrt(A*A+B*B)};AF.prototype.GetRatio=function(){return this.m_ratio};AF.prototype.b2PulleyJoint=function(A){this.__super.b2Joint.call(this,A);this.m_ground=this.m_bodyA.m_world.m_groundBody;this.m_groundAnchor1.x=A.groundAnchorA.x-this.m_ground.m_xf.position.x;this.m_groundAnchor1.y=A.groundAnchorA.y-this.m_ground.m_xf.position.y;this.m_groundAnchor2.x=A.groundAnchorB.x-this.m_ground.m_xf.position.x;this.m_groundAnchor2.y=A.groundAnchorB.y-this.m_ground.m_xf.position.y;this.m_localAnchor1.SetV(A.localAnchorA);this.m_localAnchor2.SetV(A.localAnchorB);this.m_ratio=A.ratio;this.m_constant=A.lengthA+this.m_ratio*A.lengthB;this.m_maxLength1=t.Min(A.maxLengthA,this.m_constant-this.m_ratio*AF.b2_minPulleyLength);this.m_maxLength2=t.Min(A.maxLengthB,(this.m_constant-AF.b2_minPulleyLength)/this.m_ratio);this.m_limitImpulse2=this.m_limitImpulse1=this.m_impulse=0};AF.prototype.InitVelocityConstraints=function(I){var G=this.m_bodyA,E=this.m_bodyB,F;F=G.m_xf.R;var B=this.m_localAnchor1.x-G.m_sweep.localCenter.x,A=this.m_localAnchor1.y-G.m_sweep.localCenter.y,D=F.col1.x*B+F.col2.x*A;A=F.col1.y*B+F.col2.y*A;B=D;F=E.m_xf.R;var M=this.m_localAnchor2.x-E.m_sweep.localCenter.x,K=this.m_localAnchor2.y-E.m_sweep.localCenter.y;D=F.col1.x*M+F.col2.x*K;K=F.col1.y*M+F.col2.y*K;M=D;F=E.m_sweep.c.x+M;D=E.m_sweep.c.y+K;var H=this.m_ground.m_xf.position.x+this.m_groundAnchor2.x,L=this.m_ground.m_xf.position.y+this.m_groundAnchor2.y;this.m_u1.Set(G.m_sweep.c.x+B-(this.m_ground.m_xf.position.x+this.m_groundAnchor1.x),G.m_sweep.c.y+A-(this.m_ground.m_xf.position.y+this.m_groundAnchor1.y));this.m_u2.Set(F-H,D-L);F=this.m_u1.Length();D=this.m_u2.Length();F>AE.b2_linearSlop?this.m_u1.Multiply(1/F):this.m_u1.SetZero();D>AE.b2_linearSlop?this.m_u2.Multiply(1/D):this.m_u2.SetZero();if(this.m_constant-F-this.m_ratio*D>0){this.m_state=x.e_inactiveLimit;this.m_impulse=0}else{this.m_state=x.e_atUpperLimit}if(F<this.m_maxLength1){this.m_limitState1=x.e_inactiveLimit;this.m_limitImpulse1=0}else{this.m_limitState1=x.e_atUpperLimit}if(D<this.m_maxLength2){this.m_limitState2=x.e_inactiveLimit;this.m_limitImpulse2=0}else{this.m_limitState2=x.e_atUpperLimit}F=B*this.m_u1.y-A*this.m_u1.x;D=M*this.m_u2.y-K*this.m_u2.x;this.m_limitMass1=G.m_invMass+G.m_invI*F*F;this.m_limitMass2=E.m_invMass+E.m_invI*D*D;this.m_pulleyMass=this.m_limitMass1+this.m_ratio*this.m_ratio*this.m_limitMass2;this.m_limitMass1=1/this.m_limitMass1;this.m_limitMass2=1/this.m_limitMass2;this.m_pulleyMass=1/this.m_pulleyMass;if(I.warmStarting){this.m_impulse*=I.dtRatio;this.m_limitImpulse1*=I.dtRatio;this.m_limitImpulse2*=I.dtRatio;I=(-this.m_impulse-this.m_limitImpulse1)*this.m_u1.x;F=(-this.m_impulse-this.m_limitImpulse1)*this.m_u1.y;D=(-this.m_ratio*this.m_impulse-this.m_limitImpulse2)*this.m_u2.x;H=(-this.m_ratio*this.m_impulse-this.m_limitImpulse2)*this.m_u2.y;G.m_linearVelocity.x+=G.m_invMass*I;G.m_linearVelocity.y+=G.m_invMass*F;G.m_angularVelocity+=G.m_invI*(B*F-A*I);E.m_linearVelocity.x+=E.m_invMass*D;E.m_linearVelocity.y+=E.m_invMass*H;E.m_angularVelocity+=E.m_invI*(M*H-K*D)}else{this.m_limitImpulse2=this.m_limitImpulse1=this.m_impulse=0}};AF.prototype.SolveVelocityConstraints=function(){var I=this.m_bodyA,G=this.m_bodyB,E;E=I.m_xf.R;var F=this.m_localAnchor1.x-I.m_sweep.localCenter.x,B=this.m_localAnchor1.y-I.m_sweep.localCenter.y,A=E.col1.x*F+E.col2.x*B;B=E.col1.y*F+E.col2.y*B;F=A;E=G.m_xf.R;var D=this.m_localAnchor2.x-G.m_sweep.localCenter.x,L=this.m_localAnchor2.y-G.m_sweep.localCenter.y;A=E.col1.x*D+E.col2.x*L;L=E.col1.y*D+E.col2.y*L;D=A;var K=A=E=0,H=0;E=H=E=H=K=A=E=0;if(this.m_state==x.e_atUpperLimit){E=I.m_linearVelocity.x+-I.m_angularVelocity*B;A=I.m_linearVelocity.y+I.m_angularVelocity*F;K=G.m_linearVelocity.x+-G.m_angularVelocity*L;H=G.m_linearVelocity.y+G.m_angularVelocity*D;E=-(this.m_u1.x*E+this.m_u1.y*A)-this.m_ratio*(this.m_u2.x*K+this.m_u2.y*H);H=this.m_pulleyMass*-E;E=this.m_impulse;this.m_impulse=t.Max(0,this.m_impulse+H);H=this.m_impulse-E;E=-H*this.m_u1.x;A=-H*this.m_u1.y;K=-this.m_ratio*H*this.m_u2.x;H=-this.m_ratio*H*this.m_u2.y;I.m_linearVelocity.x+=I.m_invMass*E;I.m_linearVelocity.y+=I.m_invMass*A;I.m_angularVelocity+=I.m_invI*(F*A-B*E);G.m_linearVelocity.x+=G.m_invMass*K;G.m_linearVelocity.y+=G.m_invMass*H;G.m_angularVelocity+=G.m_invI*(D*H-L*K)}if(this.m_limitState1==x.e_atUpperLimit){E=I.m_linearVelocity.x+-I.m_angularVelocity*B;A=I.m_linearVelocity.y+I.m_angularVelocity*F;E=-(this.m_u1.x*E+this.m_u1.y*A);H=-this.m_limitMass1*E;E=this.m_limitImpulse1;this.m_limitImpulse1=t.Max(0,this.m_limitImpulse1+H);H=this.m_limitImpulse1-E;E=-H*this.m_u1.x;A=-H*this.m_u1.y;I.m_linearVelocity.x+=I.m_invMass*E;I.m_linearVelocity.y+=I.m_invMass*A;I.m_angularVelocity+=I.m_invI*(F*A-B*E)}if(this.m_limitState2==x.e_atUpperLimit){K=G.m_linearVelocity.x+-G.m_angularVelocity*L;H=G.m_linearVelocity.y+G.m_angularVelocity*D;E=-(this.m_u2.x*K+this.m_u2.y*H);H=-this.m_limitMass2*E;E=this.m_limitImpulse2;this.m_limitImpulse2=t.Max(0,this.m_limitImpulse2+H);H=this.m_limitImpulse2-E;K=-H*this.m_u2.x;H=-H*this.m_u2.y;G.m_linearVelocity.x+=G.m_invMass*K;G.m_linearVelocity.y+=G.m_invMass*H;G.m_angularVelocity+=G.m_invI*(D*H-L*K)}};AF.prototype.SolvePositionConstraints=function(){var N=this.m_bodyA,I=this.m_bodyB,G,H=this.m_ground.m_xf.position.x+this.m_groundAnchor1.x,D=this.m_ground.m_xf.position.y+this.m_groundAnchor1.y,B=this.m_ground.m_xf.position.x+this.m_groundAnchor2.x,E=this.m_ground.m_xf.position.y+this.m_groundAnchor2.y,R=0,O=0,K=0,Q=0,M=G=0,L=0,F=0,A=M=F=G=M=G=0;if(this.m_state==x.e_atUpperLimit){G=N.m_xf.R;R=this.m_localAnchor1.x-N.m_sweep.localCenter.x;O=this.m_localAnchor1.y-N.m_sweep.localCenter.y;M=G.col1.x*R+G.col2.x*O;O=G.col1.y*R+G.col2.y*O;R=M;G=I.m_xf.R;K=this.m_localAnchor2.x-I.m_sweep.localCenter.x;Q=this.m_localAnchor2.y-I.m_sweep.localCenter.y;M=G.col1.x*K+G.col2.x*Q;Q=G.col1.y*K+G.col2.y*Q;K=M;G=N.m_sweep.c.x+R;M=N.m_sweep.c.y+O;L=I.m_sweep.c.x+K;F=I.m_sweep.c.y+Q;this.m_u1.Set(G-H,M-D);this.m_u2.Set(L-B,F-E);G=this.m_u1.Length();M=this.m_u2.Length();G>AE.b2_linearSlop?this.m_u1.Multiply(1/G):this.m_u1.SetZero();M>AE.b2_linearSlop?this.m_u2.Multiply(1/M):this.m_u2.SetZero();G=this.m_constant-G-this.m_ratio*M;A=t.Max(A,-G);G=t.Clamp(G+AE.b2_linearSlop,-AE.b2_maxLinearCorrection,0);F=-this.m_pulleyMass*G;G=-F*this.m_u1.x;M=-F*this.m_u1.y;L=-this.m_ratio*F*this.m_u2.x;F=-this.m_ratio*F*this.m_u2.y;N.m_sweep.c.x+=N.m_invMass*G;N.m_sweep.c.y+=N.m_invMass*M;N.m_sweep.a+=N.m_invI*(R*M-O*G);I.m_sweep.c.x+=I.m_invMass*L;I.m_sweep.c.y+=I.m_invMass*F;I.m_sweep.a+=I.m_invI*(K*F-Q*L);N.SynchronizeTransform();I.SynchronizeTransform()}if(this.m_limitState1==x.e_atUpperLimit){G=N.m_xf.R;R=this.m_localAnchor1.x-N.m_sweep.localCenter.x;O=this.m_localAnchor1.y-N.m_sweep.localCenter.y;M=G.col1.x*R+G.col2.x*O;O=G.col1.y*R+G.col2.y*O;R=M;G=N.m_sweep.c.x+R;M=N.m_sweep.c.y+O;this.m_u1.Set(G-H,M-D);G=this.m_u1.Length();if(G>AE.b2_linearSlop){this.m_u1.x*=1/G;this.m_u1.y*=1/G}else{this.m_u1.SetZero()}G=this.m_maxLength1-G;A=t.Max(A,-G);G=t.Clamp(G+AE.b2_linearSlop,-AE.b2_maxLinearCorrection,0);F=-this.m_limitMass1*G;G=-F*this.m_u1.x;M=-F*this.m_u1.y;N.m_sweep.c.x+=N.m_invMass*G;N.m_sweep.c.y+=N.m_invMass*M;N.m_sweep.a+=N.m_invI*(R*M-O*G);N.SynchronizeTransform()}if(this.m_limitState2==x.e_atUpperLimit){G=I.m_xf.R;K=this.m_localAnchor2.x-I.m_sweep.localCenter.x;Q=this.m_localAnchor2.y-I.m_sweep.localCenter.y;M=G.col1.x*K+G.col2.x*Q;Q=G.col1.y*K+G.col2.y*Q;K=M;L=I.m_sweep.c.x+K;F=I.m_sweep.c.y+Q;this.m_u2.Set(L-B,F-E);M=this.m_u2.Length();if(M>AE.b2_linearSlop){this.m_u2.x*=1/M;this.m_u2.y*=1/M}else{this.m_u2.SetZero()}G=this.m_maxLength2-M;A=t.Max(A,-G);G=t.Clamp(G+AE.b2_linearSlop,-AE.b2_maxLinearCorrection,0);F=-this.m_limitMass2*G;L=-F*this.m_u2.x;F=-F*this.m_u2.y;I.m_sweep.c.x+=I.m_invMass*L;I.m_sweep.c.y+=I.m_invMass*F;I.m_sweep.a+=I.m_invI*(K*F-Q*L);I.SynchronizeTransform()}return A<AE.b2_linearSlop};Box2D.postDefs.push(function(){Box2D.Dynamics.Joints.b2PulleyJoint.b2_minPulleyLength=2});Box2D.inherit(e,Box2D.Dynamics.Joints.b2JointDef);e.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;e.b2PulleyJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.groundAnchorA=new AB;this.groundAnchorB=new AB;this.localAnchorA=new AB;this.localAnchorB=new AB};e.prototype.b2PulleyJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_pulleyJoint;this.groundAnchorA.Set(-1,1);this.groundAnchorB.Set(1,1);this.localAnchorA.Set(-1,0);this.localAnchorB.Set(1,0);this.maxLengthB=this.lengthB=this.maxLengthA=this.lengthA=0;this.ratio=1;this.collideConnected=true};e.prototype.Initialize=function(G,D,A,B,F,E,H){if(H===undefined){H=0}this.bodyA=G;this.bodyB=D;this.groundAnchorA.SetV(A);this.groundAnchorB.SetV(B);this.localAnchorA=this.bodyA.GetLocalPoint(F);this.localAnchorB=this.bodyB.GetLocalPoint(E);G=F.x-A.x;A=F.y-A.y;this.lengthA=Math.sqrt(G*G+A*A);A=E.x-B.x;B=E.y-B.y;this.lengthB=Math.sqrt(A*A+B*B);this.ratio=H;H=this.lengthA+this.ratio*this.lengthB;this.maxLengthA=H-this.ratio*AF.b2_minPulleyLength;this.maxLengthB=(H-AF.b2_minPulleyLength)/this.ratio};Box2D.inherit(h,Box2D.Dynamics.Joints.b2Joint);h.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;h.b2RevoluteJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.K=new AC;this.K1=new AC;this.K2=new AC;this.K3=new AC;this.impulse3=new AI;this.impulse2=new AB;this.reduced=new AB;this.m_localAnchor1=new AB;this.m_localAnchor2=new AB;this.m_impulse=new AI;this.m_mass=new o};h.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};h.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};h.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*this.m_impulse.x,A*this.m_impulse.y)};h.prototype.GetReactionTorque=function(A){if(A===undefined){A=0}return A*this.m_impulse.z};h.prototype.GetJointAngle=function(){return this.m_bodyB.m_sweep.a-this.m_bodyA.m_sweep.a-this.m_referenceAngle};h.prototype.GetJointSpeed=function(){return this.m_bodyB.m_angularVelocity-this.m_bodyA.m_angularVelocity};h.prototype.IsLimitEnabled=function(){return this.m_enableLimit};h.prototype.EnableLimit=function(A){this.m_enableLimit=A};h.prototype.GetLowerLimit=function(){return this.m_lowerAngle};h.prototype.GetUpperLimit=function(){return this.m_upperAngle};h.prototype.SetLimits=function(B,A){if(B===undefined){B=0}if(A===undefined){A=0}this.m_lowerAngle=B;this.m_upperAngle=A};h.prototype.IsMotorEnabled=function(){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);return this.m_enableMotor};h.prototype.EnableMotor=function(A){this.m_enableMotor=A};h.prototype.SetMotorSpeed=function(A){if(A===undefined){A=0}this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_motorSpeed=A};h.prototype.GetMotorSpeed=function(){return this.m_motorSpeed};h.prototype.SetMaxMotorTorque=function(A){if(A===undefined){A=0}this.m_maxMotorTorque=A};h.prototype.GetMotorTorque=function(){return this.m_maxMotorTorque};h.prototype.b2RevoluteJoint=function(A){this.__super.b2Joint.call(this,A);this.m_localAnchor1.SetV(A.localAnchorA);this.m_localAnchor2.SetV(A.localAnchorB);this.m_referenceAngle=A.referenceAngle;this.m_impulse.SetZero();this.m_motorImpulse=0;this.m_lowerAngle=A.lowerAngle;this.m_upperAngle=A.upperAngle;this.m_maxMotorTorque=A.maxMotorTorque;this.m_motorSpeed=A.motorSpeed;this.m_enableLimit=A.enableLimit;this.m_enableMotor=A.enableMotor;this.m_limitState=x.e_inactiveLimit};h.prototype.InitVelocityConstraints=function(K){var G=this.m_bodyA,E=this.m_bodyB,F,B=0;F=G.m_xf.R;var A=this.m_localAnchor1.x-G.m_sweep.localCenter.x,D=this.m_localAnchor1.y-G.m_sweep.localCenter.y;B=F.col1.x*A+F.col2.x*D;D=F.col1.y*A+F.col2.y*D;A=B;F=E.m_xf.R;var N=this.m_localAnchor2.x-E.m_sweep.localCenter.x,L=this.m_localAnchor2.y-E.m_sweep.localCenter.y;B=F.col1.x*N+F.col2.x*L;L=F.col1.y*N+F.col2.y*L;N=B;F=G.m_invMass;B=E.m_invMass;var H=G.m_invI,M=E.m_invI;this.m_mass.col1.x=F+B+D*D*H+L*L*M;this.m_mass.col2.x=-D*A*H-L*N*M;this.m_mass.col3.x=-D*H-L*M;this.m_mass.col1.y=this.m_mass.col2.x;this.m_mass.col2.y=F+B+A*A*H+N*N*M;this.m_mass.col3.y=A*H+N*M;this.m_mass.col1.z=this.m_mass.col3.x;this.m_mass.col2.z=this.m_mass.col3.y;this.m_mass.col3.z=H+M;this.m_motorMass=1/(H+M);if(this.m_enableMotor==false){this.m_motorImpulse=0}if(this.m_enableLimit){var I=E.m_sweep.a-G.m_sweep.a-this.m_referenceAngle;if(t.Abs(this.m_upperAngle-this.m_lowerAngle)<2*AE.b2_angularSlop){this.m_limitState=x.e_equalLimits}else{if(I<=this.m_lowerAngle){if(this.m_limitState!=x.e_atLowerLimit){this.m_impulse.z=0}this.m_limitState=x.e_atLowerLimit}else{if(I>=this.m_upperAngle){if(this.m_limitState!=x.e_atUpperLimit){this.m_impulse.z=0}this.m_limitState=x.e_atUpperLimit}else{this.m_limitState=x.e_inactiveLimit;this.m_impulse.z=0}}}}else{this.m_limitState=x.e_inactiveLimit}if(K.warmStarting){this.m_impulse.x*=K.dtRatio;this.m_impulse.y*=K.dtRatio;this.m_motorImpulse*=K.dtRatio;K=this.m_impulse.x;I=this.m_impulse.y;G.m_linearVelocity.x-=F*K;G.m_linearVelocity.y-=F*I;G.m_angularVelocity-=H*(A*I-D*K+this.m_motorImpulse+this.m_impulse.z);E.m_linearVelocity.x+=B*K;E.m_linearVelocity.y+=B*I;E.m_angularVelocity+=M*(N*I-L*K+this.m_motorImpulse+this.m_impulse.z)}else{this.m_impulse.SetZero();this.m_motorImpulse=0}};h.prototype.SolveVelocityConstraints=function(N){var I=this.m_bodyA,G=this.m_bodyB,H=0,D=H=0,B=0,E=0,R=0,O=I.m_linearVelocity,K=I.m_angularVelocity,Q=G.m_linearVelocity,M=G.m_angularVelocity,L=I.m_invMass,F=G.m_invMass,A=I.m_invI,U=G.m_invI;if(this.m_enableMotor&&this.m_limitState!=x.e_equalLimits){D=this.m_motorMass*-(M-K-this.m_motorSpeed);B=this.m_motorImpulse;E=N.dt*this.m_maxMotorTorque;this.m_motorImpulse=t.Clamp(this.m_motorImpulse+D,-E,E);D=this.m_motorImpulse-B;K-=A*D;M+=U*D}if(this.m_enableLimit&&this.m_limitState!=x.e_inactiveLimit){N=I.m_xf.R;D=this.m_localAnchor1.x-I.m_sweep.localCenter.x;B=this.m_localAnchor1.y-I.m_sweep.localCenter.y;H=N.col1.x*D+N.col2.x*B;B=N.col1.y*D+N.col2.y*B;D=H;N=G.m_xf.R;E=this.m_localAnchor2.x-G.m_sweep.localCenter.x;R=this.m_localAnchor2.y-G.m_sweep.localCenter.y;H=N.col1.x*E+N.col2.x*R;R=N.col1.y*E+N.col2.y*R;E=H;N=Q.x+-M*R-O.x- -K*B;var S=Q.y+M*E-O.y-K*D;this.m_mass.Solve33(this.impulse3,-N,-S,-(M-K));if(this.m_limitState==x.e_equalLimits){this.m_impulse.Add(this.impulse3)}else{if(this.m_limitState==x.e_atLowerLimit){H=this.m_impulse.z+this.impulse3.z;if(H<0){this.m_mass.Solve22(this.reduced,-N,-S);this.impulse3.x=this.reduced.x;this.impulse3.y=this.reduced.y;this.impulse3.z=-this.m_impulse.z;this.m_impulse.x+=this.reduced.x;this.m_impulse.y+=this.reduced.y;this.m_impulse.z=0}}else{if(this.m_limitState==x.e_atUpperLimit){H=this.m_impulse.z+this.impulse3.z;if(H>0){this.m_mass.Solve22(this.reduced,-N,-S);this.impulse3.x=this.reduced.x;this.impulse3.y=this.reduced.y;this.impulse3.z=-this.m_impulse.z;this.m_impulse.x+=this.reduced.x;this.m_impulse.y+=this.reduced.y;this.m_impulse.z=0}}}}O.x-=L*this.impulse3.x;O.y-=L*this.impulse3.y;K-=A*(D*this.impulse3.y-B*this.impulse3.x+this.impulse3.z);Q.x+=F*this.impulse3.x;Q.y+=F*this.impulse3.y;M+=U*(E*this.impulse3.y-R*this.impulse3.x+this.impulse3.z)}else{N=I.m_xf.R;D=this.m_localAnchor1.x-I.m_sweep.localCenter.x;B=this.m_localAnchor1.y-I.m_sweep.localCenter.y;H=N.col1.x*D+N.col2.x*B;B=N.col1.y*D+N.col2.y*B;D=H;N=G.m_xf.R;E=this.m_localAnchor2.x-G.m_sweep.localCenter.x;R=this.m_localAnchor2.y-G.m_sweep.localCenter.y;H=N.col1.x*E+N.col2.x*R;R=N.col1.y*E+N.col2.y*R;E=H;this.m_mass.Solve22(this.impulse2,-(Q.x+-M*R-O.x- -K*B),-(Q.y+M*E-O.y-K*D));this.m_impulse.x+=this.impulse2.x;this.m_impulse.y+=this.impulse2.y;O.x-=L*this.impulse2.x;O.y-=L*this.impulse2.y;K-=A*(D*this.impulse2.y-B*this.impulse2.x);Q.x+=F*this.impulse2.x;Q.y+=F*this.impulse2.y;M+=U*(E*this.impulse2.y-R*this.impulse2.x)}I.m_linearVelocity.SetV(O);I.m_angularVelocity=K;G.m_linearVelocity.SetV(Q);G.m_angularVelocity=M};h.prototype.SolvePositionConstraints=function(){var N=0,I,G=this.m_bodyA,H=this.m_bodyB,D=0,B=I=0,E=0,R=0;if(this.m_enableLimit&&this.m_limitState!=x.e_inactiveLimit){N=H.m_sweep.a-G.m_sweep.a-this.m_referenceAngle;var O=0;if(this.m_limitState==x.e_equalLimits){N=t.Clamp(N-this.m_lowerAngle,-AE.b2_maxAngularCorrection,AE.b2_maxAngularCorrection);O=-this.m_motorMass*N;D=t.Abs(N)}else{if(this.m_limitState==x.e_atLowerLimit){N=N-this.m_lowerAngle;D=-N;N=t.Clamp(N+AE.b2_angularSlop,-AE.b2_maxAngularCorrection,0);O=-this.m_motorMass*N}else{if(this.m_limitState==x.e_atUpperLimit){D=N=N-this.m_upperAngle;N=t.Clamp(N-AE.b2_angularSlop,0,AE.b2_maxAngularCorrection);O=-this.m_motorMass*N}}}G.m_sweep.a-=G.m_invI*O;H.m_sweep.a+=H.m_invI*O;G.SynchronizeTransform();H.SynchronizeTransform()}I=G.m_xf.R;O=this.m_localAnchor1.x-G.m_sweep.localCenter.x;N=this.m_localAnchor1.y-G.m_sweep.localCenter.y;B=I.col1.x*O+I.col2.x*N;N=I.col1.y*O+I.col2.y*N;O=B;I=H.m_xf.R;var K=this.m_localAnchor2.x-H.m_sweep.localCenter.x,Q=this.m_localAnchor2.y-H.m_sweep.localCenter.y;B=I.col1.x*K+I.col2.x*Q;Q=I.col1.y*K+I.col2.y*Q;K=B;E=H.m_sweep.c.x+K-G.m_sweep.c.x-O;R=H.m_sweep.c.y+Q-G.m_sweep.c.y-N;var M=E*E+R*R;I=Math.sqrt(M);B=G.m_invMass;var L=H.m_invMass,F=G.m_invI,A=H.m_invI,S=10*AE.b2_linearSlop;if(M>S*S){M=1/(B+L);E=M*-E;R=M*-R;G.m_sweep.c.x-=0.5*B*E;G.m_sweep.c.y-=0.5*B*R;H.m_sweep.c.x+=0.5*L*E;H.m_sweep.c.y+=0.5*L*R;E=H.m_sweep.c.x+K-G.m_sweep.c.x-O;R=H.m_sweep.c.y+Q-G.m_sweep.c.y-N}this.K1.col1.x=B+L;this.K1.col2.x=0;this.K1.col1.y=0;this.K1.col2.y=B+L;this.K2.col1.x=F*N*N;this.K2.col2.x=-F*O*N;this.K2.col1.y=-F*O*N;this.K2.col2.y=F*O*O;this.K3.col1.x=A*Q*Q;this.K3.col2.x=-A*K*Q;this.K3.col1.y=-A*K*Q;this.K3.col2.y=A*K*K;this.K.SetM(this.K1);this.K.AddM(this.K2);this.K.AddM(this.K3);this.K.Solve(h.tImpulse,-E,-R);E=h.tImpulse.x;R=h.tImpulse.y;G.m_sweep.c.x-=G.m_invMass*E;G.m_sweep.c.y-=G.m_invMass*R;G.m_sweep.a-=G.m_invI*(O*R-N*E);H.m_sweep.c.x+=H.m_invMass*E;H.m_sweep.c.y+=H.m_invMass*R;H.m_sweep.a+=H.m_invI*(K*R-Q*E);G.SynchronizeTransform();H.SynchronizeTransform();return I<=AE.b2_linearSlop&&D<=AE.b2_angularSlop};Box2D.postDefs.push(function(){Box2D.Dynamics.Joints.b2RevoluteJoint.tImpulse=new AB});Box2D.inherit(b,Box2D.Dynamics.Joints.b2JointDef);b.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;b.b2RevoluteJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new AB;this.localAnchorB=new AB};b.prototype.b2RevoluteJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_revoluteJoint;this.localAnchorA.Set(0,0);this.localAnchorB.Set(0,0);this.motorSpeed=this.maxMotorTorque=this.upperAngle=this.lowerAngle=this.referenceAngle=0;this.enableMotor=this.enableLimit=false};b.prototype.Initialize=function(D,B,A){this.bodyA=D;this.bodyB=B;this.localAnchorA=this.bodyA.GetLocalPoint(A);this.localAnchorB=this.bodyB.GetLocalPoint(A);this.referenceAngle=this.bodyB.GetAngle()-this.bodyA.GetAngle()};Box2D.inherit(AL,Box2D.Dynamics.Joints.b2Joint);AL.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;AL.b2WeldJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchorA=new AB;this.m_localAnchorB=new AB;this.m_impulse=new AI;this.m_mass=new o};AL.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchorA)};AL.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchorB)};AL.prototype.GetReactionForce=function(A){if(A===undefined){A=0}return new AB(A*this.m_impulse.x,A*this.m_impulse.y)};AL.prototype.GetReactionTorque=function(A){if(A===undefined){A=0}return A*this.m_impulse.z};AL.prototype.b2WeldJoint=function(A){this.__super.b2Joint.call(this,A);this.m_localAnchorA.SetV(A.localAnchorA);this.m_localAnchorB.SetV(A.localAnchorB);this.m_referenceAngle=A.referenceAngle;this.m_impulse.SetZero();this.m_mass=new o};AL.prototype.InitVelocityConstraints=function(I){var G,E=0,F=this.m_bodyA,B=this.m_bodyB;G=F.m_xf.R;var A=this.m_localAnchorA.x-F.m_sweep.localCenter.x,D=this.m_localAnchorA.y-F.m_sweep.localCenter.y;E=G.col1.x*A+G.col2.x*D;D=G.col1.y*A+G.col2.y*D;A=E;G=B.m_xf.R;var M=this.m_localAnchorB.x-B.m_sweep.localCenter.x,K=this.m_localAnchorB.y-B.m_sweep.localCenter.y;E=G.col1.x*M+G.col2.x*K;K=G.col1.y*M+G.col2.y*K;M=E;G=F.m_invMass;E=B.m_invMass;var H=F.m_invI,L=B.m_invI;this.m_mass.col1.x=G+E+D*D*H+K*K*L;this.m_mass.col2.x=-D*A*H-K*M*L;this.m_mass.col3.x=-D*H-K*L;this.m_mass.col1.y=this.m_mass.col2.x;this.m_mass.col2.y=G+E+A*A*H+M*M*L;this.m_mass.col3.y=A*H+M*L;this.m_mass.col1.z=this.m_mass.col3.x;this.m_mass.col2.z=this.m_mass.col3.y;this.m_mass.col3.z=H+L;if(I.warmStarting){this.m_impulse.x*=I.dtRatio;this.m_impulse.y*=I.dtRatio;this.m_impulse.z*=I.dtRatio;F.m_linearVelocity.x-=G*this.m_impulse.x;F.m_linearVelocity.y-=G*this.m_impulse.y;F.m_angularVelocity-=H*(A*this.m_impulse.y-D*this.m_impulse.x+this.m_impulse.z);B.m_linearVelocity.x+=E*this.m_impulse.x;B.m_linearVelocity.y+=E*this.m_impulse.y;B.m_angularVelocity+=L*(M*this.m_impulse.y-K*this.m_impulse.x+this.m_impulse.z)}else{this.m_impulse.SetZero()}};AL.prototype.SolveVelocityConstraints=function(){var R,M=0,K=this.m_bodyA,L=this.m_bodyB,G=K.m_linearVelocity,F=K.m_angularVelocity,H=L.m_linearVelocity,V=L.m_angularVelocity,S=K.m_invMass,N=L.m_invMass,U=K.m_invI,Q=L.m_invI;R=K.m_xf.R;var O=this.m_localAnchorA.x-K.m_sweep.localCenter.x,I=this.m_localAnchorA.y-K.m_sweep.localCenter.y;M=R.col1.x*O+R.col2.x*I;I=R.col1.y*O+R.col2.y*I;O=M;R=L.m_xf.R;var E=this.m_localAnchorB.x-L.m_sweep.localCenter.x,D=this.m_localAnchorB.y-L.m_sweep.localCenter.y;M=R.col1.x*E+R.col2.x*D;D=R.col1.y*E+R.col2.y*D;E=M;R=H.x-V*D-G.x+F*I;M=H.y+V*E-G.y-F*O;var A=V-F,B=new AI;this.m_mass.Solve33(B,-R,-M,-A);this.m_impulse.Add(B);G.x-=S*B.x;G.y-=S*B.y;F-=U*(O*B.y-I*B.x+B.z);H.x+=N*B.x;H.y+=N*B.y;V+=Q*(E*B.y-D*B.x+B.z);K.m_angularVelocity=F;L.m_angularVelocity=V};AL.prototype.SolvePositionConstraints=function(){var N,I=0,G=this.m_bodyA,H=this.m_bodyB;N=G.m_xf.R;var D=this.m_localAnchorA.x-G.m_sweep.localCenter.x,B=this.m_localAnchorA.y-G.m_sweep.localCenter.y;I=N.col1.x*D+N.col2.x*B;B=N.col1.y*D+N.col2.y*B;D=I;N=H.m_xf.R;var E=this.m_localAnchorB.x-H.m_sweep.localCenter.x,R=this.m_localAnchorB.y-H.m_sweep.localCenter.y;I=N.col1.x*E+N.col2.x*R;R=N.col1.y*E+N.col2.y*R;E=I;N=G.m_invMass;I=H.m_invMass;var O=G.m_invI,K=H.m_invI,Q=H.m_sweep.c.x+E-G.m_sweep.c.x-D,M=H.m_sweep.c.y+R-G.m_sweep.c.y-B,L=H.m_sweep.a-G.m_sweep.a-this.m_referenceAngle,F=10*AE.b2_linearSlop,A=Math.sqrt(Q*Q+M*M),S=t.Abs(L);if(A>F){O*=1;K*=1}this.m_mass.col1.x=N+I+B*B*O+R*R*K;this.m_mass.col2.x=-B*D*O-R*E*K;this.m_mass.col3.x=-B*O-R*K;this.m_mass.col1.y=this.m_mass.col2.x;this.m_mass.col2.y=N+I+D*D*O+E*E*K;this.m_mass.col3.y=D*O+E*K;this.m_mass.col1.z=this.m_mass.col3.x;this.m_mass.col2.z=this.m_mass.col3.y;this.m_mass.col3.z=O+K;F=new AI;this.m_mass.Solve33(F,-Q,-M,-L);G.m_sweep.c.x-=N*F.x;G.m_sweep.c.y-=N*F.y;G.m_sweep.a-=O*(D*F.y-B*F.x+F.z);H.m_sweep.c.x+=I*F.x;H.m_sweep.c.y+=I*F.y;H.m_sweep.a+=K*(E*F.y-R*F.x+F.z);G.SynchronizeTransform();H.SynchronizeTransform();return A<=AE.b2_linearSlop&&S<=AE.b2_angularSlop};Box2D.inherit(C,Box2D.Dynamics.Joints.b2JointDef);C.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;C.b2WeldJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new AB;this.localAnchorB=new AB};C.prototype.b2WeldJointDef=function(){this.__super.b2JointDef.call(this);this.type=x.e_weldJoint;this.referenceAngle=0};C.prototype.Initialize=function(D,B,A){this.bodyA=D;this.bodyB=B;this.localAnchorA.SetV(this.bodyA.GetLocalPoint(A));this.localAnchorB.SetV(this.bodyB.GetLocalPoint(A));this.referenceAngle=this.bodyB.GetAngle()-this.bodyA.GetAngle()}})();(function(){var A=Box2D.Dynamics.b2DebugDraw;A.b2DebugDraw=function(){this.m_xformScale=this.m_fillAlpha=this.m_alpha=this.m_lineThickness=this.m_drawScale=1;var B=this;this.m_sprite={graphics:{clear:function(){B.m_ctx.clearRect(0,0,B.m_ctx.canvas.width,B.m_ctx.canvas.height)}}}};A.prototype._color=function(C,B){return"rgba("+((C&16711680)>>16)+","+((C&65280)>>8)+","+(C&255)+","+B+")"};A.prototype.b2DebugDraw=function(){this.m_drawFlags=0};A.prototype.SetFlags=function(B){if(B===undefined){B=0}this.m_drawFlags=B};A.prototype.GetFlags=function(){return this.m_drawFlags};A.prototype.AppendFlags=function(B){if(B===undefined){B=0}this.m_drawFlags|=B};A.prototype.ClearFlags=function(B){if(B===undefined){B=0}this.m_drawFlags&=~B};A.prototype.SetSprite=function(B){this.m_ctx=B};A.prototype.GetSprite=function(){return this.m_ctx};A.prototype.SetDrawScale=function(B){if(B===undefined){B=0}this.m_drawScale=B};A.prototype.GetDrawScale=function(){return this.m_drawScale};A.prototype.SetLineThickness=function(B){if(B===undefined){B=0}this.m_lineThickness=B;this.m_ctx.strokeWidth=B};A.prototype.GetLineThickness=function(){return this.m_lineThickness};A.prototype.SetAlpha=function(B){if(B===undefined){B=0}this.m_alpha=B};A.prototype.GetAlpha=function(){return this.m_alpha};A.prototype.SetFillAlpha=function(B){if(B===undefined){B=0}this.m_fillAlpha=B};A.prototype.GetFillAlpha=function(){return this.m_fillAlpha};A.prototype.SetXFormScale=function(B){if(B===undefined){B=0}this.m_xformScale=B};A.prototype.GetXFormScale=function(){return this.m_xformScale};A.prototype.DrawPolygon=function(E,D,F){if(D){var C=this.m_ctx,B=this.m_drawScale;C.beginPath();C.strokeStyle=this._color(F.color,this.m_alpha);C.moveTo(E[0].x*B,E[0].y*B);for(F=1;F<D;F++){C.lineTo(E[F].x*B,E[F].y*B)}C.lineTo(E[0].x*B,E[0].y*B);C.closePath();C.stroke()}};A.prototype.DrawSolidPolygon=function(E,D,F){if(D){var C=this.m_ctx,B=this.m_drawScale;C.beginPath();C.strokeStyle=this._color(F.color,this.m_alpha);C.fillStyle=this._color(F.color,this.m_fillAlpha);C.moveTo(E[0].x*B,E[0].y*B);for(F=1;F<D;F++){C.lineTo(E[F].x*B,E[F].y*B)}C.lineTo(E[0].x*B,E[0].y*B);C.closePath();C.fill();C.stroke()}};A.prototype.DrawCircle=function(E,D,F){if(D){var C=this.m_ctx,B=this.m_drawScale;C.beginPath();C.strokeStyle=this._color(F.color,this.m_alpha);C.arc(E.x*B,E.y*B,D*B,0,Math.PI*2,true);C.closePath();C.stroke()}};A.prototype.DrawSolidCircle=function(H,E,L,D){if(E){var C=this.m_ctx,F=this.m_drawScale,I=H.x*F,J=H.y*F;C.moveTo(0,0);C.beginPath();C.strokeStyle=this._color(D.color,this.m_alpha);C.fillStyle=this._color(D.color,this.m_fillAlpha);C.arc(I,J,E*F,0,Math.PI*2,true);C.moveTo(I,J);C.lineTo((H.x+L.x*E)*F,(H.y+L.y*E)*F);C.closePath();C.fill();C.stroke()}};A.prototype.DrawSegment=function(E,D,F){var C=this.m_ctx,B=this.m_drawScale;C.strokeStyle=this._color(F.color,this.m_alpha);C.beginPath();C.moveTo(E.x*B,E.y*B);C.lineTo(D.x*B,D.y*B);C.closePath();C.stroke()};A.prototype.DrawTransform=function(C){var B=this.m_ctx,D=this.m_drawScale;B.beginPath();B.strokeStyle=this._color(16711680,this.m_alpha);B.moveTo(C.position.x*D,C.position.y*D);B.lineTo((C.position.x+this.m_xformScale*C.R.col1.x)*D,(C.position.y+this.m_xformScale*C.R.col1.y)*D);B.strokeStyle=this._color(65280,this.m_alpha);B.moveTo(C.position.x*D,C.position.y*D);B.lineTo((C.position.x+this.m_xformScale*C.R.col2.x)*D,(C.position.y+this.m_xformScale*C.R.col2.y)*D);B.closePath();B.stroke()}})();var i;for(i=0;i<Box2D.postDefs.length;++i){Box2D.postDefs[i]()}delete Box2D.postDefs;(function(B){B.fn.vs=function(){};B.fn._vs={};B.fn._vs.token={};B.fn._vs.draw={};B.fn._vs.stream={};B.fn._vs.chart={};B.fn._vs.phy={};B.fn._vs.decay={};B.fn._vs.flocculate={};B.fn._vs.strata={};B.fn._vs.aggregate={};var A=function(E,O){this.token=B.fn._vs.token;this.draw=B.fn._vs.draw;this.stream=B.fn._vs.stream;this.chart=B.fn._vs.chart;this.phy=B.fn._vs.phy;this.decay=B.fn._vs.decay;this.flocculate=B.fn._vs.flocculate;this.strata=B.fn._vs.strata;this.requestAnimFrame;this.mouse={};this.mouse.x=0;this.mouse.y=0;this.mouse.isMouseDragging=false;this.mouse.isMouseDown=false;this.mouse.selectedBody=null;this.dataFlow=[];this.chartPhySetup={};this.tokens=[];this.world=null;this.ctx=null;var D=B(E);var M=this;var L=[];var N;var C;var H={x:0,y:0,width:290.5,height:300.5,DOMelement:null,chart:{x:undefined,y:undefined,width:undefined,height:undefined,colorRange:d3.scale.category10(),scale:d3.scale,type:"StackedAreaChart",spacer:5,column:3,wallColor:"rgba(230,230,230,0)",label:true,radius:10},data:{model:[{label:"Column A"},{label:"Column B"},{label:"Column C"},],strata:[[{initValue:100,label:"Strata 1 col A"}],[{initValue:20,label:"Strata 1 col B"}],[{initValue:175,label:"Strata 2 col C"}]],token:[{timestamp:1,category:1,value:1,userdata:{},callback:{}}],tokenPast:0,stream:{provider:"generator",refresh:10000/8,now:0},},sedimentation:{token:{size:{original:4,minimum:2},visible:true},incoming:{strategy:1,point:[{x:50,y:0},{x:100,y:0},{x:150,y:0}],target:[{x:50,y:0},{x:100,y:0},{x:150,y:0}]},granulate:{visible:false},flocculate:{number:1,action:"buffer",strategy:"Size",bufferSize:5,bufferTime:1000,bufferHeight:50,bufferFrameRate:25,buffer:[]},suspension:{height:null,incomming:"top",decay:{power:1.001},refresh:200},accumulation:{height:null},aggregation:{height:0,maxData:0,invertStrata:false},},options:{refresh:1000/25,panel:false,scale:30,layout:false,canvasFirst:true}};this.now=function(){return(new Date().getTime())};this.globalDecay=function(P){if(typeof(P)=="undefined"){return this.settings.sedimentation.suspension.decay.power}else{return this.settings.sedimentation.suspension.decay.power=P}};this.getWorld=function(){return this.world};this.chartUpdate=function(P,R){var Q={cat:P,y:R};this.chart[this.settings.chart.type](M,"update",Q)};this.flocculateTokens=function(P){return this.flocculate.update(M,P)};this.flocculateAll=function(){return this.flocculate.all(M)};this.addToken=function(P){return this.token.addToken(M,P)};this.selectAll=function(P,Q){return this.token.selectAll(M,P,Q)};this.select=function(P,Q){return this.token.select(M,P,Q)};this.updateAll=function(P){var Q=this.chart.updateAll(M,key,value);return Q};this.update=function(P,Q){var R=this.chart.update(M,P,Q);return R};function J(S,R){var Q={};for(var P in S){Q[P]=S[P]}for(var P in R){Q[P]=R[P]}return Q}J(H,O);if(O.data!=undefined){H.data=O.data}this.settings=B.extend(true,H,O);this.settings.DOMelement=E;if(typeof(this.settings.chart.width)=="undefined"){this.settings.chart.width=this.settings.width}if(typeof(this.settings.chart.x)=="undefined"){this.settings.chart.x=0}if(typeof(this.settings.chart.y)=="undefined"){this.settings.chart.y=0}if(typeof(this.settings.chart.height)=="undefined"){this.settings.chart.height=this.settings.height}if(typeof(this.settings.stream)=="undefined"){this.settings.stream={}}if(typeof(this.settings.stream.now)=="undefined"){this.settings.stream.now=0}if(typeof(this.settings.stream.provider)=="undefined"){this.settings.stream.provider="generator"}if(typeof(this.settings.stream.refresh)=="undefined"){this.settings.stream.refresh=1000}if(typeof(this.settings.data.tokenPast)=="undefined"){this.settings.data.tokenPast=0}if(typeof(this.settings.data.tokens)=="undefined"){this.settings.data.tokens=[]}if(typeof(this.settings.data.strata)!="undefined"&&this.settings.data.strata.length!=0){if(typeof(this.settings.sedimentation.aggregation)=="undefined"){this.settings.sedimentation.aggregation={}}if(typeof(this.settings.sedimentation.aggregation.height)=="undefined"){this.settings.sedimentation.aggregation.height=this.settings.chart.height/2}if(typeof(this.settings.sedimentation.aggregation.maxData)=="undefined"){this.settings.sedimentation.aggregation.maxData=10}}this.init=function(){this.requestAnimFrame=(function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(W,V){window.setTimeout(W,1000/60)}})();this.world=new this.phy.b2World(new this.phy.b2Vec2(0,0),true);var Q=E.appendChild(document.createElement("div"));Q.id="box_sediviz_"+I();Q.width=this.settings.width;Q.height=this.settings.height;this.settings.DOMelement=Q;C=Q.appendChild(document.createElement("canvas"));C.id="canvas";C.width=this.settings.width;C.height=this.settings.height;C.style.position="absolute";this.ctx=C.getContext("2d");this.chart[this.settings.chart.type](M,"init");this.stream.init(M);this.flocculate.init(M);this.stream.update(M);this.token.init(M);this.strata.init(this);window.setInterval(function(){M.update(M)},M.settings.options.refresh/2);window.setInterval(function(){M.draw.update(M)},M.settings.options.refresh);window.setInterval(function(){M.decay.update(M)},M.settings.sedimentation.suspension.refresh);M.strata.update(M);this.getBodyAtMouse=function(b){var V=b.mouse.x/b.settings.options.scale;var Z=b.mouse.y/b.settings.options.scale;var Y=new b.phy.b2Vec2(V,Z);var W=new b.phy.b2AABB();var X=0.001;W.lowerBound.Set(V-X,Z-X);W.upperBound.Set(V+X,Z+X);b.mouse.selectedToken=null;b.world.QueryAABB(function(e){return T(e,b,Y)},W);return b.mouse.selectedToken};function T(W,X,V){X.mouse.selectedToken=W;if(W.GetBody().GetType()!=X.phy.b2Body.b2_staticBody){if(W.GetShape().TestPoint(W.GetBody().GetTransform(),V)){X.mouse.selectedToken=W;return false}}return true}this.handleMouseMove=function(V,W){canvasPosition=F(W.settings.DOMelement);W.mouse.x=(V.clientX-(canvasPosition.offsetLeft-this.getScrollPosition()[0]));W.mouse.y=(V.clientY-(canvasPosition.offsetTop-this.getScrollPosition()[1]))};this.getScrollPosition=function(){return Array((document.documentElement&&document.documentElement.scrollLeft)||window.pageXOffset||M.pageXOffset||document.body.scrollLeft,(document.documentElement&&document.documentElement.scrollTop)||window.pageYOffset||M.pageYOffset||document.body.scrollTop)};document.addEventListener("mousemove",function(V){S(V,M)});document.addEventListener("mouseup",function(V){U(V,M)});document.addEventListener("mousedown",function(V){R(V,M)});function P(Y,b){var W=b.getBodyAtMouse(b);if(W!=null){if(typeof(W.m_userData)!="undefined"){if(typeof(W.m_userData.callback)!="undefined"){if(typeof(W.m_userData.callback.mouseover)=="function"){var V=b.select("ID",W.m_userData.ID);W.m_userData.callback.mouseover(V)}if(typeof(W.m_userData.callback.mouseout)=="function"){var V=b.select("ID",W.m_userData.ID);var Z;var X=function(){var f=Z;var h=V;var e=b;var g=W;return function(){var k=e.getBodyAtMouse(e);var l=false;if(k!=null){if(typeof(k.m_userData)!="undefined"){if(k.m_userData.ID==h.attr("ID")){l=false}else{l=true}}else{l=true}}else{l=true}if(l){g.m_userData.callback.mouseout(h);clearInterval(Z)}}};Z=window.setInterval(X(),100)}}}}}function R(X,Y){Y.mouse.isMouseDown=true;Y.handleMouseMove(X,Y);var W=Y.getBodyAtMouse(Y);if(W!=null){if(typeof(W.m_userData)!="undefined"){if(typeof(W.m_userData.callback)!="undefined"){if(typeof(W.m_userData.callback.onclick)=="function"){var V=Y.select("ID",W.m_userData.ID);W.m_userData.callback.onclick(V)}}}}}function U(V,W){W.mouse.isMouseDown=false}function S(V,W){if(W.mouse.isMouseDown){W.mouse.isMouseDragging=true;W.mouse.x=V.clientX;W.mouse.y=V.clientY}else{W.handleMouseMove(V,W);P("move",W)}}};this.mouse.update=function(Q){if(isMouseDown&&(!mouseJoint)){var P=getBodyAtMouse();if(P){var R=new b2MouseJointDef();R.bodyA=world.GetGroundBody();R.bodyB=P;R.target.Set(mouseX,mouseY);R.collideConnected=true;R.maxForce=300*P.GetMass();mouseJoint=world.CreateJoint(R);P.SetAwake(true)}}if(mouseJoint){if(isMouseDown){mouseJoint.SetTarget(new b2Vec2(mouseX,mouseY))}else{world.DestroyJoint(mouseJoint);mouseJoint=null}}};this.update=function(P){this.world.Step(1/60,10,10);this.world.DrawDebugData();this.world.ClearForces()};var G=function(){ctx.fillStyle="rgb(200,0,0)";this.ctx.font="14pt Calibri,Geneva,Arial";this.ctx.fillText("Canvas ready for Visual Sedimentation ",10,20);window.setInterval(B.fn.vs.draw.refresh(ctx,world,this.settings),this.settings.options.refresh);console.log("draw Init ")};var F=function(R){var Q=R.offsetTop;var P=R.offsetLeft;while(R=R.offsetParent){Q+=R.offsetTop;P+=R.offsetLeft}return{offsetLeft:P,offsetTop:Q}};var I=function(){var P=function(){return Math.floor(Math.random()*65536).toString(16)};return(P()+P()+"-"+P()+"-"+P()+"-"+P()+"-"+P()+P()+P())};function K(Q){if(null==Q||"object"!=typeof Q){return Q}var R=Q.constructor();for(var P in Q){if(Q.hasOwnProperty(P)){R[P]=Q[P]}}return R}this.utile={};this.utile.GUID=I;this.utile.clone=K;this.settings=B.extend(this.settings,{}||{});this.init()};B.fn.vs=function(C){if(!arguments.length){var C={}}return this.each(function(){var D=B(this);if(D.data("VisualSedimentation")){return}var E=new A(this,C);D.data("visualSedimentation",E)})}})($);(function(A){A.fn._vs.phy={b2Vec2:Box2D.Common.Math.b2Vec2,b2AABB:Box2D.Collision.b2AABB,b2BodyDef:Box2D.Dynamics.b2BodyDef,b2Body:Box2D.Dynamics.b2Body,b2FixtureDef:Box2D.Dynamics.b2FixtureDef,b2Fixture:Box2D.Dynamics.b2Fixture,b2World:Box2D.Dynamics.b2World,b2MassData:Box2D.Collision.Shapes.b2MassData,b2PolygonShape:Box2D.Collision.Shapes.b2PolygonShape,b2CircleShape:Box2D.Collision.Shapes.b2CircleShape,b2DebugDraw:Box2D.Dynamics.b2DebugDraw,b2MouseJointDef:Box2D.Dynamics.Joints.b2MouseJointDef,b2Shape:Box2D.Collision.Shapes.b2Shape,b2DistanceJointDef:Box2D.Dynamics.Joints.b2DistanceJointDef,b2RevoluteJointDef:Box2D.Dynamics.Joints.b2RevoluteJointDef,b2Joint:Box2D.Dynamics.Joints.b2Joint,b2PrismaticJointDef:Box2D.Dynamics.Joints.b2PrismaticJointDef,b2ContactListener:Box2D.Dynamics.b2ContactListener,b2Settings:Box2D.Common.b2Settings}})($);(function(A){A.fn.vs.chart={}})($);(function(A){A.fn._vs.draw={settings:{draw:{trail:1,showLayout:false}},update:function(D){if(this.settings.draw.trail==1){D.ctx.clearRect(0,0,D.ctx.canvas.clientWidth,D.ctx.canvas.clientHeight)}else{debugDrawChart(0,0,ctx.canvas.clientWidth,ctx.canvas.clientHeight,"rgba(255,255,255,"+this.settings.draw.trail+")",ctx)}for(var B=D.world.GetBodyList();B;B=B.GetNext()){for(var C=B.GetFixtureList();C!=null;C=C.GetNext()){this.drawShape(D,C)}}if(this.settings.draw.showLayout==true){this.debugDrawChart(chart.position.x,chart.position.y,chart.position.width,chart.position.height,"rgba(255,0,0,0.2)",ctx)}},debugDrawChart:function(B,G,D,F,E,C){C.save();C.translate(0,0);C.fillStyle=E;C.beginPath();C.rect(B,G,D,F);C.closePath();C.strokeStyle="#000";C.lineWidth=0.5;C.stroke();C.restore()},showTexture:function(C,B){if(typeof(C.m_userData.texture)!=="undefined"&&typeof(C.m_userData.texture.pattern)!=="undefined"){B.fillStyle=C.m_userData.texture.pattern;B.fill()}},drawShape:function(K,F){var Q=F.GetBody();var R=Q.GetPosition();var P=Q.GetAngle();var D=9;var C=10;var S=K.settings.options.scale;F.m_userData.x=Q.GetWorldCenter().x*S;F.m_userData.y=Q.GetWorldCenter().y*S;if(typeof(F)!="undefined"){switch(F.GetType()){case 0:switch(F.m_userData){case null:K.ctx.fillStyle="rgba(255,0,0,1)";break;default:K.ctx.fillStyle=F.m_userData.fillStyle;break}var B=F.m_shape.m_radius;if(K.settings.sedimentation.token.visible==true){K.ctx.save();K.ctx.translate(R.x*S,R.y*S);K.ctx.rotate(P);K.ctx.beginPath();var O=(B/C*D)*S;if(typeof(F.m_userData.strokeStyle)!="undefined"){K.ctx.strokeStyle=F.m_userData.strokeStyle}else{K.ctx.strokeStyle="rgba(0,0,0,0)"}if(typeof(F.m_userData.lineWidth)!="undefined"){K.ctx.lineWidth=F.m_userData.lineWidth}else{K.ctx.lineWidth=0}K.ctx.arc(0,0,O,0,Math.PI*2,true);K.ctx.closePath();if(K.settings.options.layout==true){K.ctx.strokeStyle="#000";K.ctx.lineWidth=0.5;K.ctx.stroke()}else{K.ctx.fill();K.ctx.stroke();this.showTexture(F,K.ctx)}K.ctx.restore()}break;case 1:switch(F.m_userData){case null:K.ctx.fillStyle="rgba(255,0,0,1)";break;default:K.ctx.fillStyle=F.m_userData.fillStyle;break}var I=F.m_shape.m_vertices[0].x*S;var G=F.m_shape.m_vertices[0].y*S;var J=R.x*S-F.m_shape.m_vertices[0].x*S;var H=R.y*S-F.m_shape.m_vertices[0].y*S;K.ctx.save();K.ctx.translate(R.x*S,R.y*S);K.ctx.rotate(P);K.ctx.beginPath();if(typeof(F.m_userData.strokeStyle)!="undefined"){K.ctx.strokeStyle=F.m_userData.strokeStyle}else{K.ctx.strokeStyle=F.m_userData.fillStyle}if(typeof(F.m_userData.lineWidth)!="undefined"){K.ctx.lineWidth=F.m_userData.lineWidth}else{K.ctx.lineWidth=0}for(var N=0;N<F.m_shape.m_vertices.length;N++){var M=F.m_shape.m_vertices;K.ctx.moveTo((M[0].x)*S,(M[0].y)*S);for(var L=1;L<M.length;L++){K.ctx.lineTo((M[L].x)*S,(M[L].y)*S)}K.ctx.lineTo((M[0].x)*S,(M[0].y)*S)}K.ctx.closePath();K.ctx.fill();this.showTexture(F,K.ctx);if(K.settings.options.layout==true){K.ctx.lineWidth=0.25;K.ctx.strokeStyle="rgb(0,0,0)";K.ctx.stroke()}else{K.ctx.stroke()}K.ctx.restore();break;case 2:break;K.ctx.fillStyle="rgb(0,0,0)"}}if(typeof(F.m_userData.callback)!="undefined"){if(typeof(F.m_userData.callback.draw)=="function"){var E=K.select("ID",F.m_userData.ID);F.m_userData.callback.draw(E)}}}}})($);(function(A){A.fn._vs.token={colorRange:function(){},init:function(B){this.colorRange=B.settings.chart.colorRange},ID:function(B){B.settings.data.tokenPast+=1;return B.settings.data.tokenPast},selectAll:function(G,D,F){var B=[];var E=false;B.flocculate=function(){var H=[];B.forEach(function(I){q=I.flocculate();H.push(q)});return H};B.attr=function(H,J,K){var I=[];B.forEach(function(L){q=L.attr(H,J,K);I.push(q)});return I};B.b2dObj=function(H,J,K){var I=[];B.forEach(function(L){q=L.myobj;I.push(q)});return I};if(typeof(F)=="undefined"&&typeof(D)=="undefined"){E=true}for(var C=G.tokens.length-1;C>=0;C--){if(G.tokens[C].attr(D)==F||E==true){B.push(G.tokens[C])}}return B},select:function(E,C,D){result=[];if(typeof(D)=="undefined"&&typeof(C)=="undefined"){return E.tokens}else{for(var B=E.tokens.length-1;B>=0;B--){if(E.tokens[B].attr(C)==D){result.push(E.tokens[B]);break}}}if(typeof(result[0])=="undefined"){return false}else{return result[0]}},addToken:function(H,G){var C={x:50,y:50,t:null,category:1,state:0,size:10,fillStyle:"###",strokeStyle:"rgba(0,0,0,0)",lineWidth:0,texture:undefined,shape:{type:"round"},userdata:{},callback:{},phy:{density:10,friction:0,restitution:0},targets:[],elbow:{}};var B=null;var D=null;var F={};F.toString=function(){return"Token ID="+this.setting.ID};if(typeof(G)=="undefined"){F.setting=C;F.setting.ID=this.ID(H)}else{F.setting=G;if(typeof(F.setting.phy)=="undefined"){F.setting.phy=C.phy}if(typeof(F.setting.t)=="undefined"){F.setting.t=H.settings.stream.now}if(typeof(F.setting.x)=="undefined"){F.setting.x=H.settings.sedimentation.incoming.point[G.category].x+(Math.random()*2)}if(typeof(F.setting.y)=="undefined"){F.setting.y=H.settings.sedimentation.incoming.point[G.category].y+(Math.random()*2)}if(typeof(F.setting.size)=="undefined"){F.setting.size=H.settings.sedimentation.token.size.original}if(typeof(F.setting.targets)=="undefined"){F.setting.targets=[]}F.setting.ID=F.setting.ID=this.ID(H);if(typeof(F.setting.state)=="undefined"){F.setting.state=0}if(typeof(F.setting.shape)=="undefined"){F.setting.shape=C.shape}}F.myobj=this.create(H,F.setting);F.flocculate=function(){H.tokens.indexOf(this);H.flocculate.destroyIt(H,this);return this};F.attr=function(I,J,K){if(typeof(J)=="undefined"){if(typeof(this[I])!="undefined"){return this[I]()}else{return this.myobj.m_userData[I]}}else{if(typeof(this[I])!="undefined"){this[I](J,K)}else{this.myobj.m_userData[I]=J}}return this};F.callback=function(I,J){if(!arguments.length){return this.myobj.m_userData.callback}if(typeof(this.myobj.m_userData.callback[I])=="function"){return this.myobj.m_userData.callback[I](J)}else{return function(K){console.log("callback undefined")}}};F.size=function(I){if(this.myobj!=null&&this.attr("state")<2){if(!arguments.length){return this.myobj.m_shape.m_radius*this.myobj.m_userData.scale}this.myobj.m_shape.m_radius=I/this.myobj.m_userData.scale}};F.b2dObj=function(){if(this.myobj!=null&&this.attr("state")<2){return this.myobj}};F.texture=function(J){if(!arguments.length){return this.myobj.m_userData.texture.img.src}console.log("texture",J);var I={};I.img=new Image();I.img.onload=function(){I.pattern=document.createElement("canvas").getContext("2d").createPattern(I.img,"repeat")};I.img.src=J;this.myobj.m_userData.texture=I};H.tokens.push(F);H.decay.tokens.push(F);if(typeof(this.myobj.m_userData.callback)!="undefined"){if(typeof(this.myobj.m_userData.callback.suspension)=="function"){var E=H.select("ID",F.setting.ID);this.myobj.m_userData.callback.suspension(E)}}return F},create:function(I,D){D.scale=scale=I.settings.options.scale;var H=D.x/scale+(Math.random()*0.1);var E=D.y/scale+(Math.random()*0.1);var G=new Box2D.Dynamics.b2FixtureDef;G.density=0.1;G.friction=0;G.restitution=0;if(D.shape.type=="round"){G.shape=new Box2D.Collision.Shapes.b2CircleShape(D.size/scale)}else{if(D.shape.type=="polygons"){G=this.setPolygons(I,D,G)}else{if(D.shape.type=="box"){G.shape=new Box2D.Collision.Shapes.b2PolygonShape;G.shape.SetAsBox(D.shape.width/scale,D.shape.height/scale)}}}var C=new Box2D.Dynamics.b2BodyDef;C.type=Box2D.Dynamics.b2Body.b2_dynamicBody;C.position.x=D.x/scale;C.position.y=D.y/scale;this.myobj=I.world.CreateBody(C).CreateFixture(G);if(typeof(D.texture)!="undefined"){var B=D.texture;B.img=new Image();B.img.onload=function(){B.pattern=document.createElement("canvas").getContext("2d").createPattern(B.img,"repeat")};B.img.src=B.src}if(typeof(D.impulse)!="undefined"){this.applyImpulse(this.myobj,D.impulse.angle,D.impulse.power)}if(typeof(D.fillStyle)=="undefined"){D.fillStyle=this.colorRange(D.category)}if(typeof(D.lineWidth)=="undefined"){D.lineWidth=0}if(typeof(D.type)=="undefined"){D.type="token"}if(typeof(D.callback)=="undefined"){D.callback={}}this.myobj.m_userData=D;this.myobj.attr=this.attr;this.myobj.m_userData.mouse={};this.myobj.m_userData.mouse.over=false;this.myobj.m_userData.mouse.down=false;this.myobj.m_userData.mouse.dragging=false;this.myobj.m_userData.mouse.statebefore=false;this.myobj.m_userData.state=1;if(D.targets.length==0&&I.settings.chart.type=="CircleLayout"){D.targets[0]={x:I.settings.sedimentation.incoming.target[D.category].x,y:I.settings.sedimentation.incoming.target[D.category].y}}if(D.targets.length>0){var F=new I.phy.b2MouseJointDef();F.bodyA=I.world.GetGroundBody();F.bodyB=this.myobj.GetBody();F.target.Set(H,E);F.collideConnected=true;F.maxForce=50*this.myobj.GetBody().GetMass();mouseJoint=I.world.CreateJoint(F);mouseJoint.SetTarget(new I.phy.b2Vec2(D.targets[0].x/scale,D.targets[0].y/scale))}return this.myobj},applyImpulse:function(D,E,C){var B=D.GetBody();B.ApplyImpulse(new Box2D.Common.Math.b2Vec2(Math.cos(E*(Math.PI/180))*C,Math.sin(E*(Math.PI/180))*C),B.GetWorldCenter())},setPolygons:function(F,D,E){E.shape=new Box2D.Collision.Shapes.b2PolygonShape;if(D.shape.points==null){D.shape.points=[{x:-1,y:-1},{x:1,y:-1},{x:-1,y:-1},{x:1,y:-1}]}for(var C=0;C<D.shape.points.length;C++){var B=new Box2D.Common.Math.b2Vec2();B.Set(D.shape.points[C].x/scale,D.shape.points[C].y/scale);D.shape.points[C]=B}E.shape.SetAsArray(D.shape.points,D.shape.points.length);return E},createDataBarBall:function(I,B,H,E,F){var G=new Box2D.Dynamics.b2FixtureDef;G.density=10;G.friction=0.5;G.restitution=0.2;G.shape=new Box2D.Collision.Shapes.b2CircleShape(E/I.settings.options.scale);var D=new Box2D.Dynamics.b2BodyDef;D.type=Box2D.Dynamics.b2Body.b2_dynamicBody;D.position.x=B/I.settings.options.scale;D.position.y=H/I.settings.options.scale;var C=I.world.CreateBody(D).CreateFixture(G);C.m_userData={type:"BarChartBall",familyID:"family",fillColor:this.colorRange(F)};return C},createBox:function(I,K,J,D,L,F,C,G){if(typeof(G)=="undefined"){G=true}var B=new b2FixtureDef;if(!G){B.density=100}B.friction=0.6;B.restitution=0.3;var E=new b2BodyDef;E.type=b2Body.b2_staticBody;E.angle=F;B.shape=new b2PolygonShape;B.shape.SetAsBox(D/scale,L/scale);E.position.Set(K/scale,J/scale);var H=I.CreateBody(E).CreateFixture(B);H.m_userData={type:"Wall",fillColor:C};console.log(H.m_userData);return H},createBoxPie:function(I,E,K,J,D,L,G,C){var F=new b2BodyDef;F.type=Box2D.Dynamics.b2Body.b2_dynamicBody;var B=new Box2D.Dynamics.b2FixtureDef;B.shape=new b2PolygonShape;B.shape.SetAsBox(D/scale,L/scale);B.density=1000000;B.friction=0.5;B.restitution=0.2;F.position.Set(K/scale,J/scale);F.angle=0;var H=I.CreateBody(F).CreateFixture(B);H.m_userData={type:"Wall",fillColor:C};return H},createBox0D:function(H,C,I,F,B,G){if(typeof(G)=="undefined"){G=true}var E=new b2BoxDef();E.restitution=-0.6;E.friction=0.3;if(!G){E.density=0.01}E.extents.Set(F,B);var D=new b2BodyDef();D.AddShape(E);D.position.Set(C,I);return H.CreateBody(D)},createHiddenBox:function(G,I,H,B,J,D){if(typeof(D)=="undefined"){D=true}var E=new b2BoxDef();E.restitution=0.6;E.friction=0.3;if(!D){E.density=1}E.extents.Set(B,J);var C=new b2BodyDef();C.AddShape(E);C.position.Set(I,H);var F=G.CreateBody(C);F.m_shapeList.visibility="hidden";console.log(F);return F},createBigBall:function(E,B,G){var F=new Box2D.Dynamics.b2FixtureDef;F.density=1000000;F.friction=0.5;F.restitution=0.2;F.shape=new Box2D.Collision.Shapes.b2CircleShape(20/30);var D=new Box2D.Dynamics.b2BodyDef;D.type=Box2D.Dynamics.b2Body.b2_dynamicBody;D.position.x=B;D.position.y=G;var C=E.CreateBody(D).CreateFixture(F);return C},createPieBox:function(G,J,I,C,K,L,D,M){M=A.extend(true,{density:10000000,friction:1,restitution:0.2,linearDamping:0,angularDamping:0,gravityScale:0,type:b2Body.b2_dynamicBody},M);var B=new b2BodyDef();var E=new b2FixtureDef;E.density=M.density;E.friction=M.friction;E.restitution=M.restitution;E.shape=new b2PolygonShape();E.shape.SetAsBox(C/scale,K/scale);B.position.Set(J/scale,I/scale);B.linearDamping=M.linearDamping;B.angularDamping=M.angularDamping;B.angle=L;B.type=M.type;var H=G.CreateBody(B);var F=H.CreateFixture(E);F.m_userData={type:"box",familyID:null,fillColor:D};return H},createDataBallTarget:function(H,L,I,M,K,N,F){var G=M/scale+(Math.random()*0.1);var C=K/scale+(Math.random()*0.1);var B=new Box2D.Dynamics.b2FixtureDef;B.density=0.1;B.friction=0;B.restitution=0;B.shape=new Box2D.Collision.Shapes.b2CircleShape(N/scale);var D=new Box2D.Dynamics.b2BodyDef;D.type=Box2D.Dynamics.b2Body.b2_dynamicBody;D.position.x=G;D.position.y=C;var E=H.CreateBody(D).CreateFixture(B);var J=new b2MouseJointDef();J.bodyA=H.GetGroundBody();J.bodyB=E.GetBody();J.target.Set(G,C);J.collideConnected=true;J.maxForce=50*E.GetBody().GetMass();mouseJoint=H.CreateJoint(J);mouseJoint.SetTarget(new b2Vec2(L/scale,I/scale));E.m_userData={type:"PieBall",familyID:F,fillColor:colorScale(F)};categorys[F].value+=1;categorys[F].joins.push(mouseJoint);return E},createDataBallPie:function(H,I,M,K,N,F){console.log(I);var G=categorys[F].incomingPoint.x/scale+(Math.random()*2/scale);var C=categorys[F].incomingPoint.y/scale;var B=new Box2D.Dynamics.b2FixtureDef;B.density=0.1;B.friction=0;B.restitution=0;B.shape=new Box2D.Collision.Shapes.b2CircleShape(N/scale);var D=new Box2D.Dynamics.b2BodyDef;D.type=Box2D.Dynamics.b2Body.b2_dynamicBody;D.position.x=G;D.position.y=C;var L=H.CreateBody(D);L.m_userData={type:"PieBall",familyID:F,fillColor:categorys[F].color};listBodies.push(L);var E=L.CreateFixture(B);var J=new b2MouseJointDef();J.bodyA=H.GetGroundBody();J.bodyB=E.GetBody();J.target.Set(G,C);J.collideConnected=true;J.maxForce=100*E.GetBody().GetMass();mouseJoint=H.CreateJoint(J);mouseJoint.SetTarget(new b2Vec2(I.position.x/scale,I.position.y/scale));E.m_userData={type:"PieBall",familyID:F,fillColor:colorScale(F)};categorys[F].value+=1;return E},createDataBall:function(H,B,G,E){var F=new Box2D.Dynamics.b2FixtureDef;F.density=1;F.friction=0.5;F.restitution=0.2;F.shape=new Box2D.Collision.Shapes.b2CircleShape(E/H.settings.options.scale);var D=new Box2D.Dynamics.b2BodyDef;D.type=Box2D.Dynamics.b2Body.b2_dynamicBody;D.position.x=B;D.position.y=G;var C=H.world.CreateBody(D).CreateFixture(F);C.m_userData={type:"PieBall",familyID:"family",fillColor:"rgb(200,0,0)"};return C},}})($);(function(A){A.fn._vs.stream={i:null,buffer:[],speed:10000/6,strategy:null,type:null,init:function(B){this.speed=B.settings.data.stream.refresh;type=B.settings.data.stream.provider},push:function(C){console.log(C);for(var B=C.length-1;B>=0;B--){buffer.push(C)}},update:function(C){if(type=="generator"){for(var B=0;B<C.settings.data.model.length;B++){C.dataFlow[B]=setInterval((function(D,E){return function(){E.settings.data.stream.now++;var F=E.chart[E.settings.chart.type](E,"token",D);E.addToken(F)}})(B,C),this.speed)}}else{if(type=="tokens"){C.dataFlow[0]=setInterval((function(D,E){return function(){E.settings.data.stream.now++;for(var F=0;F<E.settings.data.tokens.length;F++){if(E.settings.data.tokens[F].t==E.settings.data.stream.now){E.addToken(E.settings.data.tokens[F])}}}})(B,C),this.speed)}else{}}},generator:function(C,B){},test:function(B){B.tokens.push(B.token.createDataBarBall(B,(B.settings.sedimentation.incoming[i].x+(Math.random()*2)),(B.settings.sedimentation.incoming[i].y+(Math.random()*1)),B.settings.sedimentation.token.size,i))},setSpeed:function(D,C){speedFlow=C;for(var B=0;B<categorys.length;B++){window.clearInterval(dataFlow[B])}window.clearInterval(decayFlow);dataFlow(categorys)}}})($);(function(A){A.fn._vs.decay={tokens:[],update:function(G){var D=1;var J=G.settings.sedimentation.suspension.height;var K=G.settings.height;var H=G.settings.sedimentation.token.size/4;var B=G.settings.sedimentation.suspension.decay.power;var E=G.settings.options.scale;var F=G.settings.sedimentation.token.size.minimum;if(B==null){var B=0}for(var I=0;I<this.tokens.length;I++){var C=this.tokens[I].attr("size");if(B!=0){this.tokens[I].attr("size",C/B)}if(C<=F){if(G.settings.sedimentation.flocculate.strategy!=null){G.flocculate.destroyIt(G,this.tokens[I]);G.strata.update(G)}}}}}})($);(function(A){A.fn._vs.flocculate={buffer:[],init:function(C){for(var B=0;B<C.settings.data.model.length;B++){this.buffer[B]=[]}},addtobuffer:function(C,B){c=B.attr("category");bufferSize=C.settings.sedimentation.flocculate.bufferSize;this.buffer[c].push(B);C.decay.tokens.splice(C.decay.tokens.indexOf(B),1);B.attr("callback","bufferFlocculation",B);if(this.buffer[c].length>bufferSize){this.update(C,c,bufferSize)}},destroyIt:function(D,C){C.attr("callback","flocculation",C);C.attr("state",2);var B=D.world.DestroyBody(C.myobj.GetBody());return B},update:function(E,D,B){if(E.settings.sedimentation.flocculate.number==1){while(this.buffer[D].length>B){var C=this.buffer[D].shift();this.destroyIt(E,C)}}else{while(this.buffer[D].length>E.settings.sedimentation.flocculate.number){var C=this.buffer[D].shift();this.destroyIt(E,C)}}},disapear:function(C,B){window.setInterval(function(){B.update(self)},self.settings.options.refresh/2)},all:function(C){for(var B=C.decay.tokens-1;B>=0;B--){this.update(C,B,C.tokens.length)}},strategy:function(){if(flocullateBuffer.length>0){if(chart.flocullate.strategy=="Size"&&flocullateBuffer.length>=chart.flocullate.bufferSize){flocullateByArray(flocullateBuffer)}else{if(chart.flocullate.strategy=="Time"){}else{if(chart.flocullate.strategy=="Height"){}}}}}}})($);(function(A){A.fn._vs.aggregate={defaultSettings:{},strata_layers:function(H,G,B,D){var F=d3.scale.linear().domain([1,B-2]).range([Math.PI/2,2*Math.PI-Math.PI/2]);var C=d3.scale.pow().exponent(10).domain([0,B]).range([0,1]);return d3.range(G).map(function(I){var J=5*Math.random();return d3.range(B).map(function(L){if(H.settings.sedimentation.aggregation.strataType=="sin"){if(I==1){return 20}var K=5+J*5*Math.sin(F(L))+(I*50);if(K<0){return -K}else{return K}}else{if(H.settings.sedimentation.aggregation.strataType=="log"){return I+1}else{if(typeof(D)=="undefined"){D=0}return H.settings.data.strata[D][I].value}}}).map(E)});function E(J,I){return{x:I,y:Math.max(0,J)}}},init:function(L){if(typeof(L.settings.data.strata)=="undefined"||L.settings.data.strata.length==0||L.settings.data.strata[0].length==0){return}var M=L.token.colorRange;if(L.settings.chart.type=="StackedAreaChart"){var E=L.settings.chart.width/L.settings.data.model.length,O=L.settings.sedimentation.aggregation.height;var G=d3.select("#"+L.settings.DOMelement.id).append("div").attr("class","vis").style("z-index",10).append("svg").attr("width",L.settings.width).attr("height",L.settings.height).append("g").attr("transform","translate("+L.settings.chart.x+","+L.settings.chart.y+")");var Q=G.selectAll("g.gcol").data(L.settings.data.strata,function(V){return[V]}).enter().append("g").attr("transform",function(W,V){return"translate("+(V*E)+", "+(L.settings.chart.height-L.settings.sedimentation.aggregation.height)+")"}).attr("class",function(W,V){return"gcol col_"+V});var U=L.settings.data.strata.map(function(V){return{value:V[0].value}});var R=L.settings.data.strata[0].length,S=20;smx=S-1,smy=0;var D=0;var T=d3.svg.area().x(function(V){return L.settings.chart.spacer+V.x*(E-2*L.settings.chart.spacer)/smx}).y0(function(V){return(O-V.y0*D)}).y1(function(V){return(O-(V.y+V.y0)*D)});var K=[];var B=Q.selectAll("gpath").data(function(X,V){var W=d3.layout.stack().offset("expand")(L.aggregate.strata_layers(L,X.length,S,V));smy=d3.max(W,function(Y){return d3.max(Y,function(Z){return Z.y0+Z.y})});W.map(function(Y){Y.map(function(Z){Z.col=V;return Z})});return W}).enter().append("g").attr("class","gpath");B.append("path").attr("d",function(W,V){D=L.settings.chart.height-L.chart.getPosition(L)[W[0].col].y;return T(W)}).style("fill",function(W,V){if(L.settings.data.strata[W[0].col][V].texture!=null){return"url(#RectanglePattern_"+W[0].col+"_"+V+")"}else{return d3.rgb(M(W[0].col)).darker(L.settings.data.strata[W[0].col].length/2-(V+1)/2)}}).attr("class",function(W,V){return"layer"}).attr("class",function(W,V){return"col_"+W[0].col+" layer_"+V});var C=E/1;var I=C;for(var F=0;F<L.settings.data.strata.length;F++){for(var J=0;J<L.settings.data.strata[F].length;J++){if(L.settings.data.strata[F][J].texture!=null){var P=G.append("pattern").attr("id","RectanglePattern_"+F+"_"+J).attr("height",I).attr("width",C).attr("patternTransform","translate(0, 0) scale("+L.settings.data.strata[F][J].texture.size+", "+L.settings.data.strata[F][J].texture.size+") rotate(0)").attr("patternUnits","userSpaceOnUse");P.append("image").attr("x",0).attr("y",0).attr("height",I).attr("width",C).attr("xlink:href",function(){return L.settings.data.strata[F][J].texture.url})}}}}else{if(L.settings.chart.type=="CircleLayout"){var H=d3.select("#"+L.settings.DOMelement.id).append("div").attr("class","vis").attr("width",L.settings.width).attr("height",L.settings.height).append("svg").attr("width",L.settings.width).attr("height",L.settings.height);if(typeof(L.settings.chart.treeLayout)!="undefined"){for(var N=0;N<L.settings.data.model.length;N++){var U=L.settings.data.strata[N];var M=function(V){return L.token.colorRange(N)};L.aggregate.create_pie_chart(L,U,H,U[0].value,M,((N+1/2))*L.settings.chart.width/(L.settings.data.model.length)+L.settings.chart.x,L.settings.chart.y+L.settings.chart.height/6)}}else{var U=L.settings.data.strata.map(function(V){return{value:V[0].value}});console.log(L.settings.data.strata,U);var M=L.token.colorRange;L.aggregate.create_pie_chart(L,U,H,L.settings.chart.radius,M,L.settings.chart.x+L.settings.chart.width/2,L.settings.chart.y+L.settings.chart.height/2)}}}},create_pie_chart:function(O,T,K,J,P,N,M){var H=O.settings.width/O.settings.data.model.length,R=O.settings.sedimentation.aggregation.height;var G=d3.scale.linear().domain([0,O.settings.data.strata.length-1]).range([0,O.settings.width]);var F=d3.scale.linear().domain([0,d3.max(T,function(U){return U.value})]).rangeRound([0,R]);var C=O.settings.width,B=O.settings.height,I=O.settings.sedimentation.aggregation.height;labelr=J+30,donut=d3.layout.pie().sort(null),arc=d3.svg.arc().innerRadius(0).outerRadius(J);var L=Math.random();K.append("g.arcs_"+L).attr("class","arcs_"+L);var E=K.selectAll(".arcs").data(donut(T.map(function(V,U){return V.value}))).enter().append("svg:g").attr("transform","translate("+N+","+M+")");var D=0;var S=d3.svg.area().x(function(U){return O.settings.chart.spacer+U.x*(H-2*O.settings.chart.spacer)/smx}).y0(function(U){return(R-U.y0*D)}).y1(function(U){return(R-(U.y+U.y0)*D)});var Q=E.append("path").attr("fill",function(V,U){return P(U)}).attr("d",function(V,U){return arc(V)}).each(function(U){this._current=U})},update:function(K){if(typeof(K.settings.data.strata)=="undefined"||K.settings.data.strata.length==0||K.settings.data.strata[0].length==0){return}var N=K.settings.chart.width/K.settings.data.model.length;var I=K.settings.sedimentation.aggregation.height;var M=d3.scale.linear().domain([0,K.settings.data.strata.length-1]).range([0,K.settings.width]);var H=K.settings.data.strata.map(function(P){return{value:P[0].value}});var O=K.settings.data.strata.map(function(R){for(var P=0,Q=0;P<R.length;P++){Q+=R[P].value}return Q});var L=d3.scale.linear().domain([0,d3.max(O)]).range([0,K.settings.sedimentation.aggregation.height]);var E=K.settings.data.strata[0].length,F=20;smx=F-1,smy=0;var G=0;var D=d3.svg.area().x(function(P){return K.settings.chart.spacer+P.x*(N-2*K.settings.chart.spacer)/smx}).y0(function(P){return(I-P.y0*G)}).y1(function(P){return(I-(P.y+P.y0)*G)});var C=d3.select("svg");var J=C.selectAll(".gcol");J.data(K.settings.data.strata,function(Q,P){return[Q]});var B=J.selectAll(".gpath").data(function(R,P){var Q=d3.layout.stack().offset("expand")(K.aggregate.strata_layers(K,R.length,F,P));smy=d3.max(Q,function(S){return d3.max(S,function(T){return T.y0+T.y})});Q.map(function(S){S.map(function(T){T.col=P;return T})});return Q});B.select("path").transition().duration(100).attr("d",function(Q,P){K.chartUpdate(P,-L(O[P])-(I-K.settings.chart.height));G=K.settings.chart.height-K.chart.getPosition(K)[Q[0].col].y;return D(Q)})}}})($);(function($){$.fn._vs.strata={stratas:[],init:function(_this){if(_this.settings.chart.type!="StackedAreaChart"){_this.strata.create_strata(_this);return}settings=_this.settings;if((typeof(settings.data.strata)!="function")&&(typeof(settings.data.strata)=="undefined"||settings.data.strata.length==0)){for(var i=0;i<settings.data.model.length;i++){var defaultStrata={label:settings.data.model[i].label+"_"+i,category:i,value:function(t,s){return 0},};_this.strata.stratas[i]=[defaultStrata]}_this.strata.create_strata(_this);return}if(typeof settings.data.strata!="function"){if(typeof(settings.data.strata=="object")&&typeof(settings.data.strata[0])!="undefined"&&(typeof settings.data.strata[0][0].value!="undefined")&&typeof(settings.data.strata[0][0].value=="string")){var NB_STRATA=settings.data.strata[0].length;for(var i=0;i<settings.data.model.length;i++){_this.strata.stratas[i]=[];for(var n=0;n<NB_STRATA;n++){(function(a,b){var t=null;if((typeof settings.data.strata[a]!="undefined")&&(typeof settings.data.strata[a][b]!="undefined")&&(typeof settings.data.strata[a][b].texture!="undefined")){t=settings.data.strata[a][b].texture}var defaultStrata={};defaultStrata={label:settings.data.model[i].label+"_"+a,category:a,texture:t,value:function(){r=eval("f="+settings.data.strata[a][b].value);return r()}};_this.strata.stratas[a].push(defaultStrata)})(i,n)}}_this.strata.create_strata(_this);return}if(typeof(settings.data.strata[0])!="undefined"&&typeof(settings.data.strata[0][0])!="undefined"&&typeof(settings.data.strata[0][0].initValue!="undefined")){for(var c=0;c<settings.data.model.length;c++){var defaultStrata={label:settings.data.model[c].label+"_"+c,category:i,value:function(t,s){if(t.selectAll("category",s)){return settings.data.strata[s][0].initValue+t.selectAll("category",s).attr("state").filter(function(d){if(d==2){return d}}).length}else{return settings.data.strata[s][0].initValue}},};_this.strata.stratas[c]=[defaultStrata]}_this.strata.create_strata(_this);return}else{if(settings.data.strata[0].length==0){for(var i=0;i<settings.data.model.length;i++){var defaultStrata={label:settings.data.model[i].label+"_"+i,category:i,value:function(t,s){if(t.selectAll("category",s)){return t.selectAll("category",s).attr("state").filter(function(d){if(d==2){return d}}).length}else{return 0}},};_this.strata.stratas[i]=[defaultStrata]}_this.strata.create_strata(_this);return}else{var NB_STRATA=settings.data.strata[0].length;settings.data.strata_param=settings.data.strata;function fstrata(){var a=Array();for(var s=0;s<mySettings.data.model.length;s++){a.push(fstratum(s))}return a}function fstratum(a){var b=Array(NB_STRATA);for(var r=0;r<b.length;r++){b[r]=Array()}if(typeof _this!="undefined"){var tokens=_this.selectAll("category",s).attr("state").filter(function(d){if(d==2){return d}}).length;for(var k=0;k<tokens.length;k++){var tk=tokens[k];for(var r=0;r<b.length;r++){if(tk<_this.settings.stream.now-2*(r)&&tk>=_this.settings.stream.now-2*(r+1)){b[b.length-r-1].push(tk)}}}}var res=Array();for(var j=0;j<NB_STRATA;j++){var val=b[j].length;(function(v){res.push({value:function(){return v},label:"Strata "+j,category:a})})(val)}return res}_this.settings.data.strata=function(){return fstrata()};_this.strata.stratas=_this.settings.data.strata();_this.strata.create_strata(_this);return}}}if((typeof settings.data.strata=="function")||settings.data.strata[0].length>0||_this.strata.stratas.length>0){if(typeof settings.data.strata=="function"||(settings.data.strata[0].length>0&&typeof(settings.data.strata[0])=="object")){if(typeof settings.data.strata=="function"){_this.strata.stratas=settings.data.strata()}else{if(typeof settings.data.strata[0].value=="function"){for(var i=0;i<settings.data.model.length;i++){var defaultStrata={label:settings.data.model[i].label+"_"+i,category:i,initValue:settings.data.model[i].value,value:function(t,s){return settings.data.strata[i]},};_this.strata.stratas[i]=[defaultStrata]}}else{for(var i=0;i<settings.data.model.length;i++){var defaultStrata={label:settings.data.model[i].label+"_"+i,category:i,initValue:settings.data.model[i].value,value:function(t,s){if(typeof(t.selectAll("category",s).length)=="undefined"){return this.initValue}if(t.selectAll("category",s)){return this.initValue+t.selectAll("category",s).attr("state").filter(function(d){if(d==2){return d}}).length}else{return 0}},};_this.strata.stratas[i]=[defaultStrata]}}}}_this.strata.create_strata(_this)}},selectAll:function(_this,key,value){result=[];result.attr=function(key,value,param){var r=[];result.forEach(function(i){q=i.attr(key,value,param);r.push(q)});return r};if(typeof(value)=="undefined"&&typeof(key)=="undefined"){return this.stratas}else{for(var i=_this.strata.stratas.length-1;i>=0;i--){if(_this.strata.stratas[i].attr(key)==value){result.push(_this.strata.stratas[i]);break}}}if(typeof(result[0])=="undefined"){return false}else{return result[0]}},add:function(_this,setting){var strata=function(){};strata.myobj=setting;strata.attr=function(key,value,param){if(typeof(value)=="undefined"){if(typeof(this[key])!="undefined"){return this[key]()}else{return this.myobj[key]}}else{if(typeof(this[key])!="undefined"){this[key](value,param)}else{this.myobj[key]=value}}return this};return strata},remove:function(_this,key,value){},strata_layers:function(_this,n,m,p){var sn=d3.scale.linear().domain([1,m-2]).range([Math.PI/2,2*Math.PI-Math.PI/2]);var logscale=d3.scale.pow().exponent(10).domain([0,m]).range([0,1]);return d3.range(n).map(function(i){var r=5*Math.random();return d3.range(m).map(function(j){if(_this.settings.sedimentation.aggregation.strataType=="sin"){if(i==1){return 20}var x=5+r*5*Math.sin(sn(j))+(i*50);if(x<0){return -x}else{return x}}else{if(_this.settings.sedimentation.aggregation.strataType=="log"){return i+1}else{if(typeof(p)=="undefined"){p=0}return _this.strata.stratas[p][i].value(_this,p)}}}).map(stream_index)});function stream_index(d,i){return{x:i,y:Math.max(0,d)}}},create_strata:function(_this){if(_this.settings.chart.type=="StackedAreaChart"){var w=_this.settings.chart.width/_this.settings.data.model.length,h=_this.settings.sedimentation.aggregation.height;var color=_this.token.colorRange;if(typeof _this.settings.options.canvasFirst!="undefined"&&_this.settings.options.canvasFirst==false){var vis=d3.select("#"+_this.settings.DOMelement.id).insert("div",":first-child").style("position","absolute").attr("class","vis").style("z-index",10).append("svg").attr("width",_this.settings.width).attr("height",_this.settings.height).append("g").attr("transform","translate("+_this.settings.chart.x+","+_this.settings.chart.y+")")}else{var vis=d3.select("#"+_this.settings.DOMelement.id).append("div").attr("class","vis").style("z-index",10).append("svg").attr("width",_this.settings.width).attr("height",_this.settings.height).append("g").attr("transform","translate("+_this.settings.chart.x+","+_this.settings.chart.y+")")}var sn=_this.strata.stratas[0].length,sm=20;smx=sm-1,smy=0;var sum_strata=_this.strata.stratas.map(function(d,i){for(var v=0,res=0;v<d.length;v++){res+=d[v].value(_this,i)}return res});var y=d3.scale.linear().domain([0,Math.max(d3.max(sum_strata),_this.settings.sedimentation.aggregation.maxData)]).range([0,_this.settings.sedimentation.aggregation.height]);var g=vis.selectAll("g.gcol").data(_this.strata.stratas,function(d){return[d]}).enter().append("g").attr("transform",function(d,i){var align=_this.settings.sedimentation.aggregation.height;if(_this.settings.sedimentation.aggregation.invertStrata){align=2*_this.settings.sedimentation.aggregation.height-y(sum_strata[i])}return"translate("+(i*w)+", "+(_this.settings.chart.height-align)+")"}).attr("class",function(d,i){return"gcol col_"+i});var gpath=g.selectAll(".gpath").data(function(d,i){var sd=d3.layout.stack().offset("expand")(_this.strata.strata_layers(_this,d.length,sm,i));smy=d3.max(sd,function(d){return d3.max(d,function(d){return d.y0+d.y})});sd.map(function(d){d.map(function(d){d.col=i;return d})});return sd}).enter().append("g").attr("class","gpath");var area=d3.svg.area().x(function(d){return _this.settings.chart.spacer+d.x*(w-2*_this.settings.chart.spacer)/smx}).y0(function(d){return(h-d.y0*d.offshit)}).y1(function(d){return(h-(d.y+d.y0)*d.offshit)});var pathlayer=gpath.append("path").attr("d",function(d,i){_this.chartUpdate(i,-y(sum_strata[i])-(h-_this.settings.chart.height));hh=0;d.map(function(dd){dd.offshit=hh;return dd});return area(d)});pathlayer.style("fill",function(d,i){if(_this.strata.stratas[d[0].col][i].texture!=null){return"url(#RectanglePattern_"+d[0].col+"_"+i+")"}else{return d3.rgb(color(d[0].col)).darker(_this.strata.stratas[d[0].col].length/2-(i+1)/2)}}).attr("class",function(d,i){return"gcol col_"+d[0].col+" layer_"+i});var patternWidth=w/1;var patternHeight=patternWidth;if(typeof _this.settings.data.strata!="undefined"){for(var s=0;s<_this.settings.data.strata.length;s++){for(var l=0;l<_this.settings.data.strata[s].length;l++){if(_this.settings.data.strata[s][l].texture!=null){var pattern=vis.append("pattern").attr("id","RectanglePattern_"+s+"_"+l).attr("height",patternHeight).attr("width",patternWidth).attr("patternTransform","translate(0, 0) scale("+_this.settings.data.strata[s][l].texture.size+", "+_this.settings.data.strata[s][l].texture.size+") rotate(0)").attr("patternUnits","userSpaceOnUse");pattern.append("image").attr("x",0).attr("y",0).attr("height",patternHeight).attr("width",patternWidth).attr("xlink:href",function(){return _this.settings.data.strata[s][l].texture.url})}}}}}else{if(_this.settings.chart.type=="CircleLayout"){var svg=d3.select("#"+_this.settings.DOMelement.id).append("div").attr("class","vis").attr("width",_this.settings.width).attr("height",_this.settings.height).append("svg").attr("width",_this.settings.width).attr("height",_this.settings.height);if(typeof(_this.settings.chart.treeLayout)!="undefined"){for(var i=0;i<_this.settings.data.model.length;i++){var data=_this.settings.data.strata[i];var color=function(s){return _this.token.colorRange(i)};_this.strata.create_pie_chart(_this,data,svg,data[0].value,color,((i+1/2))*_this.settings.chart.width/(_this.settings.data.model.length)+_this.settings.chart.x,_this.settings.chart.y+_this.settings.chart.height/6)}}else{var data=_this.settings.data.strata.map(function(d){return{value:d[0].value}});var color=_this.token.colorRange;_this.strata.create_pie_chart(_this,data,svg,_this.settings.chart.radius,color,_this.settings.chart.x+_this.settings.chart.width/2,_this.settings.chart.y+_this.settings.chart.height/2)}}}},create_pie_chart:function(_this,data,svg,r,color,posx,posy){var w=_this.settings.width/_this.settings.data.model.length,h=_this.settings.sedimentation.aggregation.height;var x=d3.scale.linear().domain([0,_this.settings.data.strata.length-1]).range([0,_this.settings.width]);var y=d3.scale.linear().domain([0,d3.max(data,function(d){return d.value})]).rangeRound([0,h]);var wp=_this.settings.width,hp=_this.settings.height,hhp=_this.settings.sedimentation.aggregation.height;labelr=r+30,donut=d3.layout.pie().sort(null),arc=d3.svg.arc().innerRadius(0).outerRadius(r);var id=Math.random();svg.append("g.arcs_"+id).attr("class","arcs_"+id);var garcs=svg.selectAll(".arcs").data(donut(data.map(function(d,i){return d.value}))).enter().append("svg:g").attr("transform","translate("+posx+","+posy+")");var hh=0;var area=d3.svg.area().x(function(d){return _this.settings.chart.spacer+d.x*(w-2*_this.settings.chart.spacer)/smx}).y0(function(d){return(h-d.y0*hh)}).y1(function(d){return(h-(d.y+d.y0)*hh)});var arcs=garcs.append("path").attr("fill",function(d,i){return color(i)}).attr("d",function(d,i){return arc(d)}).each(function(d){this._current=d})},update:function(_this){if(typeof(_this.strata.stratas)=="undefined"||_this.strata.stratas.length==0){return}if(typeof settings.data.strata=="function"){_this.strata.stratas=settings.data.strata()}var sn=_this.strata.stratas[0].length,sm=20;smx=sm-1,smy=0;var w=_this.settings.chart.width/_this.settings.data.model.length,h=_this.settings.sedimentation.aggregation.height;var color=_this.token.colorRange;var area=d3.svg.area().x(function(d){return _this.settings.chart.spacer+d.x*(w-2*_this.settings.chart.spacer)/smx}).y0(function(d){return(h-d.y0*d.offshit)}).y1(function(d){return(h-(d.y+d.y0)*d.offshit)});var sum_strata=_this.strata.stratas.map(function(d,i){for(var v=0,res=0;v<d.length;v++){res+=d[v].value(_this,i)}return res});var y=d3.scale.linear().domain([0,Math.max(d3.max(sum_strata),_this.settings.sedimentation.aggregation.maxData)]).range([0,_this.settings.sedimentation.aggregation.height]);var vis=d3.select("#"+_this.settings.DOMelement.id);var g=vis.selectAll("g.gcol");if(_this.settings.sedimentation.aggregation.invertStrata){g.transition().duration(100).attr("transform",function(d,i){var align=_this.settings.sedimentation.aggregation.height;align=2*_this.settings.sedimentation.aggregation.height-y(sum_strata[i]);return"translate("+(i*w)+", "+(_this.settings.chart.height-(2*_this.settings.sedimentation.aggregation.height-y(sum_strata[i])))+")"})}var gpath=g.selectAll("path").data(function(d,i){var sd=d3.layout.stack().offset("expand")(_this.strata.strata_layers(_this,d.length,sm,i));smy=d3.max(sd,function(d){return d3.max(d,function(d){return d.y0+d.y})});sd.map(function(d){d.map(function(d){d.col=i;return d})});return sd});if(_this.settings.chart.type=="StackedAreaChart"){var pathlayer=vis.selectAll("path").transition().duration(100).attr("d",function(d,i){if(!_this.settings.sedimentation.aggregation.invertStrata){_this.chartUpdate(i,-y(sum_strata[i])-(h-_this.settings.chart.height));hh=_this.settings.chart.height-_this.chart.getPosition(_this)[d[0].col].y}else{_this.chartUpdate(i,-2*h+_this.settings.chart.height);hh=y(sum_strata[d[0].col])}d.map(function(dd){dd.offshit=hh;return dd});return area(d)})}}}})($);(function(A){A.fn._vs.chart.StackedAreaChart=function(F,E,D){var C;this.init=function(G){gravity=new G.phy.b2Vec2(0.001,10);G.world.m_gravity=gravity;G.chartPhySetup={grounds:[],wall:[]};this.setupChartPhysics(G)};this.setupChartPhysics=function(L){var M=L.settings.chart.spacer;var O=(L.settings.chart.width/L.settings.data.model.length);var H=M;var P=L.settings.chart.height/2+L.settings.chart.y;var N=L.settings.chart.height-L.settings.sedimentation.aggregation.height;var I=0;for(var K=0;K<L.settings.data.model.length;K++){L.settings.data.model[K].value=0;if(typeof(L.settings.data.strata)!="undefined"){if(typeof(L.settings.data.strata[K])!="undefined"){for(var J=0;J<L.settings.data.strata[K].length;J++){L.settings.data.model[K].value+=L.settings.data.strata[K][J].value}}}I+=L.settings.data.model[K].value}for(var K=0;K<L.settings.data.model.length+1;K++){var G=L.settings.chart.x+(K*O);L.chartPhySetup.wall[K]=this.createMyChartBox(L,G,P,H,L.settings.chart.height/2,"wall",L.settings.chart.wallColor);if(K<L.settings.data.model.length){L.settings.sedimentation.incoming.point[K]={x:G+(O/2),y:L.settings.y}}if(K<L.settings.data.model.length){L.chartPhySetup.grounds[K]=this.createMyChartBox(L,G+(O/2),L.settings.chart.height+L.settings.chart.y+L.settings.sedimentation.aggregation.height,O/2,L.settings.chart.height,"lift","rgba(250,250,250,0)");this.update(L,{cat:K,y:L.settings.chart.height})}}};this.token=function(J,G){var I=G;var H={x:(J.settings.sedimentation.incoming.point[I].x+(Math.random()*2)),y:(J.settings.sedimentation.incoming.point[I].y+(Math.random()*1)),t:J.now(),size:J.settings.sedimentation.token.size.original,category:I,lineWidth:0,};return H};this.createMyChartBox=function(M,P,O,Q,L,N,J){var I=M.settings.options.scale;var G=new M.phy.b2FixtureDef;G.density=1;G.friction=0.5;G.restitution=0.2;var H=new M.phy.b2BodyDef;H.type=M.phy.b2Body.b2_staticBody;G.shape=new M.phy.b2PolygonShape;G.shape.SetAsBox(Q/I,L/I);H.position.Set(P/I,O/I);var K=M.world.CreateBody(H).CreateFixture(G);K.m_userData={type:N,fillStyle:J,w:Q,h:L,x:P,y:O};return K};this.update=function(K,J){var I={cat:0,y:0};if(K.chartPhySetup.grounds[J.cat]!=null){var H=K.chartPhySetup.grounds[J.cat].GetBody();var G=H.GetWorldCenter();G.y=(J.y+K.settings.chart.height+K.settings.chart.y+K.settings.sedimentation.aggregation.height)/K.settings.options.scale;H.SetPosition(G)}};this.getPositionOld=function(I){var G=[];for(var H=0;H<I.chartPhySetup.grounds.length;H++){myElement=I.chartPhySetup.grounds[H];myBody=myElement.GetBody();G.push({x:(myBody.GetWorldCenter().x*I.settings.options.scale),y:(myBody.GetWorldCenter().y*I.settings.options.scale),a:myBody.GetAngle(),w:myElement.m_userData.w,h:myElement.m_userData.h,r:myElement.m_userData.r,})}return G};this.getPosition=function(I){var G=[];for(var H=0;H<I.chartPhySetup.grounds.length;H++){myElement=I.chartPhySetup.grounds[H];myBody=myElement.GetBody();G.push({x:(myBody.GetWorldCenter().x*I.settings.options.scale),y:(myBody.GetWorldCenter().y*I.settings.options.scale)-I.settings.chart.height-I.settings.chart.y,a:myBody.GetAngle(),w:myElement.m_userData.w,h:myElement.m_userData.h,r:myElement.m_userData.r,})}return G};if(typeof(E)!=undefined){var B=this[E](F,D);if(typeof(B)!=undefined){return B}}}})($);(function(A){A.fn._vs.chart.CircleLayout=function(I,M,Q){var H;var K;var J;var G;var N=[];var E=0;var I;this.init=function(U,S){console.log("Circle Layout Init");this._this=U;gravity=new U.phy.b2Vec2(0,0);U.world.m_gravity=gravity;U.chartPhySetup={grounds:[],wall:[]};this.treeLayout=U.settings.chart.treeLayout;for(var T=0;T<U.settings.data.model.length;T++){U.settings.data.strata[T][0].value=U.settings.data.strata[T][0].initValue}for(var T=0;T<U.settings.data.model.length;T++){U.settings.data.model[T].value=0;for(var R=0;R<U.settings.data.strata[T].length;R++){U.settings.data.model[T].value+=U.settings.data.strata[T][R].value}N.push(U.settings.data.model[T].value);E+=U.settings.data.model[T].value}if(this.treeLayout){console.log("ici");this.setupBubbleChartPhysics(U)}else{this.setupPieChartPhysics(U)}};this.setupPieChartPhysics=function(X){console.log("w",X.settings.width);var S=X.settings.chart.radius;K=X.settings.chart.width/2+X.settings.chart.x;J=X.settings.chart.height/2+X.settings.chart.y;var V=O(K,J,S,X.settings.chart.wallColor);for(var U=0;U<X.settings.data.model.length;U++){X.settings.sedimentation.incoming.target[U]={x:K,y:J}}var R=[];var T=X.settings.chart.spacer;var W=0;console.log("tdv",E);if(E==0){for(var U=0;U<X.settings.data.length;U++){N[U]=1}E=N.length}for(var U=0;U<N.length;U++){v=N[U];a2=((v/2+W)/E)*360-90;W+=v;a=(W/E)*360-90;c=L(a2,S*5,K,J);console.log(c);X.settings.sedimentation.incoming.point[U]=c;X.chartPhySetup.grounds[U]=this.createBox(X,K,J,T,S,a,S,"wall",X.settings.chart.wallColor)}console.log("w",X.settings.chart.width)};this.update=function(Y,U){console.log("update");var T={cat:0,r:0};U.r-=90;var W=(U.r+90)*(Math.PI/180);var X=L(U.r,Y.settings.chart.radius,Y.settings.chart.width/2+Y.settings.chart.x,Y.settings.chart.height/2+Y.settings.chart.y);if(Y.chartPhySetup.grounds[U.cat]!=null){var S=Y.chartPhySetup.grounds[U.cat].GetBody();var R=S.GetWorldCenter();var V=S.GetAngle();R.y=X.y/Y.settings.options.scale;R.x=X.x/Y.settings.options.scale;V=W;S.SetPosition(R);S.SetAngle(V)}};this.token=function(U,R){var T=R;var S={x:(U.settings.sedimentation.incoming.point[T].x+(Math.random()*2)),y:(U.settings.sedimentation.incoming.point[T].y+(Math.random()*1)),t:U.now(),size:U.settings.sedimentation.token.size.original,category:T,phy:{density:10,friction:0,restitution:0},targets:[{x:U.settings.sedimentation.incoming.target[T].x,y:U.settings.sedimentation.incoming.target[T].y}]};return S};function L(T,S,X,U){j=T*Math.PI/180;var R=(Math.cos(j)*S)+X;var W=(Math.sin(j)*S)+U;var V={x:R,y:W};return V}function O(W,V,R,T){var Y=I.settings.options.scale;var X=new I.phy.b2FixtureDef;X.density=1;X.friction=0.5;X.restitution=0.2;var S=new I.phy.b2BodyDef;X.shape=new I.phy.b2CircleShape(R/Y);S.position.Set(W/Y,V/Y);var U=I.world.CreateBody(S).CreateFixture(X);U.m_userData={type:"wall",familyID:null,fillStyle:T,strokeStyle:T,r:R};return U}this.createBox=function(Z,k,f,l,Y,g,R,e,W){var V=Z.settings.options.scale;var S=new Z.phy.b2FixtureDef;var b=L(g,R,k,f);S.density=1;S.friction=0.5;S.restitution=0.2;var U=new Z.phy.b2BodyDef;var T=(g+90)*(Math.PI/180);U.angle=T;U.type=Z.phy.b2Body.b2_staticBody;S.shape=new Z.phy.b2PolygonShape;S.shape.SetAsBox(l/V,Y/V);U.position.Set(b.x/V,b.y/V);var X=Z.world.CreateBody(U).CreateFixture(S);X.m_userData={type:e,fillStyle:W,w:l,h:Y,r:R};return X};this.getPosition=function(T){var R=[];for(var S=0;S<T.chartPhySetup.grounds.length;S++){myElement=T.chartPhySetup.grounds[S];myBody=myElement.GetBody();R.push({x:(myBody.GetWorldCenter().x*T.settings.options.scale),y:(myBody.GetWorldCenter().y*T.settings.options.scale),a:myBody.GetAngle(),w:myElement.m_userData.w,h:myElement.m_userData.h,r:myElement.m_userData.r,})}return R};this.setupBubbleChartPhysics=function(Y){console.log("setupBubbleChartPhysics");var V=(Y.settings.chart.width/Y.settings.data.model.length);var T=Y.settings.chart.spacer;var S=Y.settings.chart.height/2+Y.settings.y+T;var W=0;var X=0;var R=Y.settings.chart.column;for(var U=0;U<Y.settings.data.model.length;U++){X=Y.settings.chart.x+(U%R*T)+(T/2);W=Y.settings.chart.y+Math.floor(U/R)*T+(T/2);Y.settings.sedimentation.incoming.target[U]={x:X,y:W};O[U]=C(X,W,Y.settings.chart.spacer,U);Y.settings.data.model[U].incomingPoint={x:X,y:W}}};function C(b,W,X,S){console.log("CreatMyBubblePivot",b,W,X,S);var U=I.settings.options.scale;var R=new I.phy.b2FixtureDef;var Z=d3.scale.category10();R.density=10000;R.friction=0;R.restitution=0;var V=new I.phy.b2BodyDef;R.shape=new I.phy.b2CircleShape(X*U);V.position.Set(b/U,W/U);var T=I.world.CreateBody(V);var Y=T.CreateFixture(R);console.log(S,Z(S));Y.m_userData={type:"BubblePivot",familyID:S,fillStyle:I.settings.chart.wallColor};console.log(S,Y);Y.m_shape.m_radius=I.settings.data.model[S].value/U;return Y}this.getPivotPosition=function(T){if(typeof(T)!="undefined"){return this.pivot}else{var R=[];for(var S=0;S<I.settings.data.model.length;S++){R.push(I.settings.data.model[S])}return R}};function D(S,U,T){var R=O[T].GetBody();R.SetPosition(new b2Vec2(S/scale,U/scale));I.settings.data.model[T].incomingPoint.x=S;I.settings.data.model[T].incomingPoint.y=U;setFlowSpeed(speedFlow)}function B(R,U,T){for(var S=0;S<categorys[T].joins.length;S++){categorys[T].joins[S].SetTarget(new b2Vec2(R/scale,U/scale))}}function F(R,S){O[S].m_shape.m_radius=R}if(typeof(M)!=undefined){var P=this[M](I,Q);if(typeof(P)!=undefined){return P}}}})($);
},{"jquery":11}],4:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (_, hashtags, models, moment, parseInt, tags, ua, undefined) {
buf.push("");
// iterate hashtags
;(function(){
  var $$obj = hashtags;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var item = $$obj[$index];

buf.push("<div class=\"grid-sizer\"> </div>");
if ( item instanceof models.InstagramItem	 )
{
buf.push("<div class=\"element\"><figure><div><img" + (jade.attr("src", item.get('images').low_resolution.url, true, false)) + "/></div><figcaption class=\"item-time\"><h4><a" + (jade.attr("href", (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ) ? "instagram://media?id="+item.get('id') : item.get('link'), true, false)) + (jade.attr("title", (item.get('caption')==null?"":item.get('text'))+" via "+item.get('user').username, true, false)) + " target=\"_blank\" class=\"insta\">" + (null == (jade_interp = moment.unix(parseInt(item.get('created_time'))).fromNoww()) ? "" : jade_interp) + "</a></h4></figcaption><figcaption class=\"item-meta\"><h3>" + (null == (jade_interp = (item.get('caption')!=null && item.get('tags').length < 7 ? item.get('tags').join(' ') + ' <br/><small> ' + item.get('caption').text + ' </small> ' : item.get('tags').join(' '))) ? "" : jade_interp) + "</h3><span>" + (jade.escape((jade_interp = item.get('user').username) == null ? '' : jade_interp)) + "</span><div><a" + (jade.attr("href", (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ) ? "instagram://media?id="+item.get('id') : item.get('link'), true, false)) + (jade.attr("title", (item.get('caption')==null?"":item.get('text'))+" via "+item.get('user').username, true, false)) + " target=\"_blank\">Take a Look</a></div></figcaption></figure></div>");
}
if ( item instanceof models.TwitterItem	 )
{
tags = _.map(item.get('entities').hashtags, function(h){ return h.text; })
buf.push("<div class=\"element\"><figure><div>");
if ( item.get('entities').media && item.get('entities').media[0] && item.get('entities').media[0].sizes.medium)
{
buf.push("<img" + (jade.attr("src", item.get('entities').media[0].media_url, true, false)) + "/>");
}
buf.push("<div class=\"tweet\">" + (jade.escape(null == (jade_interp = item.get('text')) ? "" : jade_interp)) + "</div></div><figcaption class=\"item-time\"><h4><a" + (jade.attr("href", (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ) ? "twitter://status?id="+item.get('id') : 'http://twitter.com/'+item.get('user').screen_name+'/status/'+item.get('id'), true, false)) + (jade.attr("title", (item.get('caption')==null?"":item.get('text'))+" via "+item.get('user').screen_name, true, false)) + " target=\"_blank\" class=\"twit\">" + (null == (jade_interp = moment(item.get('created_at')).fromNoww()) ? "" : jade_interp) + "</a></h4></figcaption><figcaption class=\"item-meta\"><h3>" + (null == (jade_interp = (item.get('caption')!=null && tags.length < 7 ? tags.join(' ') + ' <br/><small> ' + item.get('caption').text + ' </small> ' : tags.join(' '))) ? "" : jade_interp) + "</h3><span class=\"byline-twit\">@" + (jade.escape((jade_interp = item.get('user').screen_name) == null ? '' : jade_interp)) + "</span><div><a" + (jade.attr("href", (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ) ? "twitter://status?id="+item.get('id') : 'http://twitter.com/'+item.get('user').screen_name+'/status/'+item.get('id'), true, false)) + (jade.attr("title", (item.get('caption')==null?"":item.get('text'))+" via "+item.get('user').screen_name, true, false)) + " target=\"_blank\">Take a Look<!-- .created= moment(item.get('created_at')).format(\"dddd, MMMM Do YYYY, h:mm:ss a\") --></a></div></figcaption></figure></div>");
}
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var item = $$obj[$index];

buf.push("<div class=\"grid-sizer\"> </div>");
if ( item instanceof models.InstagramItem	 )
{
buf.push("<div class=\"element\"><figure><div><img" + (jade.attr("src", item.get('images').low_resolution.url, true, false)) + "/></div><figcaption class=\"item-time\"><h4><a" + (jade.attr("href", (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ) ? "instagram://media?id="+item.get('id') : item.get('link'), true, false)) + (jade.attr("title", (item.get('caption')==null?"":item.get('text'))+" via "+item.get('user').username, true, false)) + " target=\"_blank\" class=\"insta\">" + (null == (jade_interp = moment.unix(parseInt(item.get('created_time'))).fromNoww()) ? "" : jade_interp) + "</a></h4></figcaption><figcaption class=\"item-meta\"><h3>" + (null == (jade_interp = (item.get('caption')!=null && item.get('tags').length < 7 ? item.get('tags').join(' ') + ' <br/><small> ' + item.get('caption').text + ' </small> ' : item.get('tags').join(' '))) ? "" : jade_interp) + "</h3><span>" + (jade.escape((jade_interp = item.get('user').username) == null ? '' : jade_interp)) + "</span><div><a" + (jade.attr("href", (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ) ? "instagram://media?id="+item.get('id') : item.get('link'), true, false)) + (jade.attr("title", (item.get('caption')==null?"":item.get('text'))+" via "+item.get('user').username, true, false)) + " target=\"_blank\">Take a Look</a></div></figcaption></figure></div>");
}
if ( item instanceof models.TwitterItem	 )
{
tags = _.map(item.get('entities').hashtags, function(h){ return h.text; })
buf.push("<div class=\"element\"><figure><div>");
if ( item.get('entities').media && item.get('entities').media[0] && item.get('entities').media[0].sizes.medium)
{
buf.push("<img" + (jade.attr("src", item.get('entities').media[0].media_url, true, false)) + "/>");
}
buf.push("<div class=\"tweet\">" + (jade.escape(null == (jade_interp = item.get('text')) ? "" : jade_interp)) + "</div></div><figcaption class=\"item-time\"><h4><a" + (jade.attr("href", (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ) ? "twitter://status?id="+item.get('id') : 'http://twitter.com/'+item.get('user').screen_name+'/status/'+item.get('id'), true, false)) + (jade.attr("title", (item.get('caption')==null?"":item.get('text'))+" via "+item.get('user').screen_name, true, false)) + " target=\"_blank\" class=\"twit\">" + (null == (jade_interp = moment(item.get('created_at')).fromNoww()) ? "" : jade_interp) + "</a></h4></figcaption><figcaption class=\"item-meta\"><h3>" + (null == (jade_interp = (item.get('caption')!=null && tags.length < 7 ? tags.join(' ') + ' <br/><small> ' + item.get('caption').text + ' </small> ' : tags.join(' '))) ? "" : jade_interp) + "</h3><span class=\"byline-twit\">@" + (jade.escape((jade_interp = item.get('user').screen_name) == null ? '' : jade_interp)) + "</span><div><a" + (jade.attr("href", (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ) ? "twitter://status?id="+item.get('id') : 'http://twitter.com/'+item.get('user').screen_name+'/status/'+item.get('id'), true, false)) + (jade.attr("title", (item.get('caption')==null?"":item.get('text'))+" via "+item.get('user').screen_name, true, false)) + " target=\"_blank\">Take a Look<!-- .created= moment(item.get('created_at')).format(\"dddd, MMMM Do YYYY, h:mm:ss a\") --></a></div></figcaption></figure></div>");
}
    }

  }
}).call(this);
}.call(this,"_" in locals_for_with?locals_for_with._:typeof _!=="undefined"?_:undefined,"hashtags" in locals_for_with?locals_for_with.hashtags:typeof hashtags!=="undefined"?hashtags:undefined,"models" in locals_for_with?locals_for_with.models:typeof models!=="undefined"?models:undefined,"moment" in locals_for_with?locals_for_with.moment:typeof moment!=="undefined"?moment:undefined,"parseInt" in locals_for_with?locals_for_with.parseInt:typeof parseInt!=="undefined"?parseInt:undefined,"tags" in locals_for_with?locals_for_with.tags:typeof tags!=="undefined"?tags:undefined,"ua" in locals_for_with?locals_for_with.ua:typeof ua!=="undefined"?ua:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
},{"jade/runtime":10}],5:[function(require,module,exports){
//
// The javscript asset package for the "hashtags" app.
//
// It's a good pattern to organize your asset packages by a package per app.
// This generally means these javascript asset files are going to be quite
// small, often just a line of initialize code like this.
//

require('jquery')(require('../apps/hashtags/templates/lib/visualsedimentation.js'))
require('jquery')(require('../apps/hashtags/client.js').init)



},{"../apps/hashtags/client.js":1,"../apps/hashtags/templates/lib/visualsedimentation.js":3,"jquery":11}],6:[function(require,module,exports){
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
    var url = sd.IG_API_URL + '/tags/' + this.hashtag + '/media/recent?client_id=' + sd.IG_CLIENT_ID;
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

},{"../models/hashtag_item":7,"backbone":8,"sharify":13,"underscore":15}],7:[function(require,module,exports){
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
    var url = sd.IG_API_URL + '/media/' + this.get('uid') + '?client_id=' + sd.IG_CLIENT_ID;
    return url;
  }
});

module.exports = models;
},{"backbone":8,"sharify":13}],8:[function(require,module,exports){
//     Backbone.js 1.1.2

//     (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    factory(root, exports, _);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.1.2';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !options.wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model, options);
      }
      return singular ? models[0] : models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults({}, options, setOptions);
      if (options.parse) models = this.parse(models, options);
      var singular = !_.isArray(models);
      models = singular ? (models ? [models] : []) : _.clone(models);
      var i, l, id, model, attrs, existing, sort;
      var at = options.at;
      var targetModel = this.model;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};
      var add = options.add, merge = options.merge, remove = options.remove;
      var order = !sortable && add && remove ? [] : false;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        attrs = models[i] || {};
        if (attrs instanceof Model) {
          id = model = attrs;
        } else {
          id = attrs[targetModel.prototype.idAttribute || 'id'];
        }

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(id)) {
          if (remove) modelMap[existing.cid] = true;
          if (merge) {
            attrs = attrs === model ? model.attributes : attrs;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(attrs, options);
          if (!model) continue;
          toAdd.push(model);
          this._addReference(model, options);
        }

        // Do not add multiple models with the same `id`.
        model = existing || model;
        if (order && (model.isNew() || !modelMap[model.id])) order.push(model);
        modelMap[model.id] = true;
      }

      // Remove nonexistent models if appropriate.
      if (remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length || (order && order.length)) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          for (i = 0, l = toAdd.length; i < l; i++) {
            this.models.splice(at + i, 0, toAdd[i]);
          }
        } else {
          if (order) this.models.length = 0;
          var orderedModels = order || toAdd;
          for (i = 0, l = orderedModels.length; i < l; i++) {
            this.models.push(orderedModels[i]);
          }
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0, l = toAdd.length; i < l; i++) {
          (model = toAdd[i]).trigger('add', model, this, options);
        }
        if (sort || (order && order.length)) this.trigger('sort', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj] || this._byId[obj.id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) return attrs;
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      if (model.id != null) this._byId[model.id] = model;
      if (!model.collection) model.collection = this;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain', 'sample'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy', 'indexBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    options || (options = {});
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && noXhrPatch) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  var noXhrPatch =
    typeof window !== 'undefined' && !!window.ActiveXObject &&
      !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        router.execute(callback, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = decodeURI(this.location.pathname + this.location.search);
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        var frame = Backbone.$('<iframe src="javascript:0" tabindex="-1">');
        this.iframe = frame.hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + '#' + this.fragment);
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot() && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment);
        }

      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      fragment = this.fragment = this.getFragment(fragment);
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var url = this.root + (fragment = this.getFragment(fragment || ''));

      // Strip the hash for matching.
      fragment = fragment.replace(pathStripper, '');

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));

},{"underscore":15}],9:[function(require,module,exports){

},{}],10:[function(require,module,exports){
(function (global){
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jade=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return (Array.isArray(val) ? val.map(joinClasses) :
    (val && typeof val === 'object') ? Object.keys(val).filter(function (key) { return val[key]; }) :
    [val]).filter(nulls).join(' ');
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};


exports.style = function (val) {
  if (val && typeof val === 'object') {
    return Object.keys(val).map(function (style) {
      return style + ':' + val[style];
    }).join(';');
  } else {
    return val;
  }
};
/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if (key === 'style') {
    val = exports.style(val);
  }
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    if (JSON.stringify(val).indexOf('&') !== -1) {
      console.warn('Since Jade 2.0.0, ampersands (`&`) in data attributes ' +
                   'will be escaped to `&amp;`');
    };
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will eliminate the double quotes around dates in ' +
                   'ISO form after 2.0.0');
    }
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    if (val && typeof val.toISOString === 'function') {
      console.warn('Jade will stringify dates in ISO form after 2.0.0');
    }
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str = str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":2}],2:[function(require,module,exports){

},{}]},{},[1])(1)
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"fs":9}],11:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v2.1.3
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-12-18T15:11Z
 */

(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Support: Firefox 18+
// Can't be in strict mode, several libs including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
//

var arr = [];

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var support = {};



var
	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,

	version = "2.1.3",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android<4.1
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// Start with an empty selector
	selector: "",

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return just the one element from the set
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return all the elements in a clean array
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;
		ret.context = this.context;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {
		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		// adding 1 corrects loss of precision from parseFloat (#15100)
		return !jQuery.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
	},

	isPlainObject: function( obj ) {
		// Not plain objects:
		// - Any object or value whose internal [[Class]] property is not "[object Object]"
		// - DOM nodes
		// - window
		if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		if ( obj.constructor &&
				!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
			return false;
		}

		// If the function hasn't returned already, we're confident that
		// |obj| is a plain object, created by {} or constructed with new Object
		return true;
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}
		// Support: Android<4.0, iOS<6 (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call(obj) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		var script,
			indirect = eval;

		code = jQuery.trim( code );

		if ( code ) {
			// If the code includes a valid, prologue position
			// strict mode pragma, execute code by injecting a
			// script tag into the document.
			if ( code.indexOf("use strict") === 1 ) {
				script = document.createElement("script");
				script.text = code;
				document.head.appendChild( script ).parentNode.removeChild( script );
			} else {
			// Otherwise, avoid the DOM node creation, insertion
			// and removal by using an indirect global eval
				indirect( code );
			}
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Support: IE9-11+
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( args ) {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Support: Android<4.1
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {
	var length = obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	if ( obj.nodeType === 1 && length ) {
		return true;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.2.0-pre
 * http://sizzlejs.com/
 *
 * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-12-16
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// http://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + characterEncoding + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];
	nodeType = context.nodeType;

	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	if ( !seed && documentIsHTML ) {

		// Try to shortcut find operations when possible (e.g., not under DocumentFragment)
		if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType !== 1 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, parent,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;
	parent = doc.defaultView;

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", unloadHandler, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Support tests
	---------------------------------------------------------------------- */
	documentIsHTML = !isXML( doc );

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [ m ] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			docElem.appendChild( div ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\f]' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( div.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.2+, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.7+
			if ( !div.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibing-combinator selector` fails
			if ( !div.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is no seed and only one group
	if ( match.length === 1 ) {

		// Take a shortcut and set the context if the root selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				support.getById && context.nodeType === 9 && documentIsHTML &&
				Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;



var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) >= 0 ) !== not;
	});
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		}));
};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			len = this.length,
			ret = [],
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		// Needed because $( selector, context ) becomes $( context ).find( selector )
		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
		ret.selector = this.selector ? this.selector + " " + selector : selector;
		return ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},
	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
});


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

	init = jQuery.fn.init = function( selector, context ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[0] === "<" && selector[ selector.length - 1 ] === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Support: Blackberry 4.6
					// gEBID returns nodes no longer in the document (#6963)
					if ( elem && elem.parentNode ) {
						// Inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return typeof rootjQuery.ready !== "undefined" ?
				rootjQuery.ready( selector ) :
				// Execute immediately if ready is not present
				selector( jQuery );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,
	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.extend({
	dir: function( elem, dir, until ) {
		var matched = [],
			truncate = until !== undefined;

		while ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {
			if ( elem.nodeType === 1 ) {
				if ( truncate && jQuery( elem ).is( until ) ) {
					break;
				}
				matched.push( elem );
			}
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var matched = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				matched.push( n );
			}
		}

		return matched;
	}
});

jQuery.fn.extend({
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter(function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					matched.push( cur );
					break;
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.unique(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	while ( (cur = cur[dir]) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.unique( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
});
var rnotwhite = (/\S+/g);



// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( list && ( !fired || stack ) ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// Add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// If we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});


// The deferred used on DOM ready
var readyList;

jQuery.fn.ready = function( fn ) {
	// Add the callback
	jQuery.ready.promise().done( fn );

	return this;
};

jQuery.extend({
	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.triggerHandler ) {
			jQuery( document ).triggerHandler( "ready" );
			jQuery( document ).off( "ready" );
		}
	}
});

/**
 * The ready event handler and self cleanup method
 */
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed, false );
	window.removeEventListener( "load", completed, false );
	jQuery.ready();
}

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// We once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready );

		} else {

			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed, false );
		}
	}
	return readyList.promise( obj );
};

// Kick off the DOM ready check even if the user does not
jQuery.ready.promise();




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {
			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			len ? fn( elems[0], key ) : emptyGet;
};


/**
 * Determines whether an object can have data
 */
jQuery.acceptData = function( owner ) {
	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	/* jshint -W018 */
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};


function Data() {
	// Support: Android<4,
	// Old WebKit does not have Object.preventExtensions/freeze method,
	// return new empty object instead with no [[set]] accessor
	Object.defineProperty( this.cache = {}, 0, {
		get: function() {
			return {};
		}
	});

	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;
Data.accepts = jQuery.acceptData;

Data.prototype = {
	key: function( owner ) {
		// We can accept data for non-element nodes in modern browsers,
		// but we should not, see #8335.
		// Always return the key for a frozen object.
		if ( !Data.accepts( owner ) ) {
			return 0;
		}

		var descriptor = {},
			// Check if the owner object already has a cache key
			unlock = owner[ this.expando ];

		// If not, create one
		if ( !unlock ) {
			unlock = Data.uid++;

			// Secure it in a non-enumerable, non-writable property
			try {
				descriptor[ this.expando ] = { value: unlock };
				Object.defineProperties( owner, descriptor );

			// Support: Android<4
			// Fallback to a less secure definition
			} catch ( e ) {
				descriptor[ this.expando ] = unlock;
				jQuery.extend( owner, descriptor );
			}
		}

		// Ensure the cache object
		if ( !this.cache[ unlock ] ) {
			this.cache[ unlock ] = {};
		}

		return unlock;
	},
	set: function( owner, data, value ) {
		var prop,
			// There may be an unlock assigned to this node,
			// if there is no entry for this "owner", create one inline
			// and set the unlock as though an owner entry had always existed
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		// Handle: [ owner, key, value ] args
		if ( typeof data === "string" ) {
			cache[ data ] = value;

		// Handle: [ owner, { properties } ] args
		} else {
			// Fresh assignments by object are shallow copied
			if ( jQuery.isEmptyObject( cache ) ) {
				jQuery.extend( this.cache[ unlock ], data );
			// Otherwise, copy the properties one-by-one to the cache object
			} else {
				for ( prop in data ) {
					cache[ prop ] = data[ prop ];
				}
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		// Either a valid cache is found, or will be created.
		// New caches will be created and the unlock returned,
		// allowing direct access to the newly created
		// empty data object. A valid owner object must be provided.
		var cache = this.cache[ this.key( owner ) ];

		return key === undefined ?
			cache : cache[ key ];
	},
	access: function( owner, key, value ) {
		var stored;
		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				((key && typeof key === "string") && value === undefined) ) {

			stored = this.get( owner, key );

			return stored !== undefined ?
				stored : this.get( owner, jQuery.camelCase(key) );
		}

		// [*]When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i, name, camel,
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		if ( key === undefined ) {
			this.cache[ unlock ] = {};

		} else {
			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = key.concat( key.map( jQuery.camelCase ) );
			} else {
				camel = jQuery.camelCase( key );
				// Try the string as a key before any manipulation
				if ( key in cache ) {
					name = [ key, camel ];
				} else {
					// If a key with the spaces exists, use it.
					// Otherwise, create an array by matching non-whitespace
					name = camel;
					name = name in cache ?
						[ name ] : ( name.match( rnotwhite ) || [] );
				}
			}

			i = name.length;
			while ( i-- ) {
				delete cache[ name[ i ] ];
			}
		}
	},
	hasData: function( owner ) {
		return !jQuery.isEmptyObject(
			this.cache[ owner[ this.expando ] ] || {}
		);
	},
	discard: function( owner ) {
		if ( owner[ this.expando ] ) {
			delete this.cache[ owner[ this.expando ] ];
		}
	}
};
var data_priv = new Data();

var data_user = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /([A-Z])/g;

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			data_user.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend({
	hasData: function( elem ) {
		return data_user.hasData( elem ) || data_priv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return data_user.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		data_user.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to data_priv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return data_priv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		data_priv.remove( elem, name );
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = data_user.get( elem );

				if ( elem.nodeType === 1 && !data_priv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE11+
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice(5) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					data_priv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				data_user.set( this, key );
			});
		}

		return access( this, function( value ) {
			var data,
				camelKey = jQuery.camelCase( key );

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {
				// Attempt to get data from the cache
				// with the key as-is
				data = data_user.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to get data from the cache
				// with the key camelized
				data = data_user.get( elem, camelKey );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, camelKey, undefined );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each(function() {
				// First, attempt to store a copy or reference of any
				// data that might've been store with a camelCased key.
				var data = data_user.get( this, camelKey );

				// For HTML5 data-* attribute interop, we have to
				// store property names with dashes in a camelCase form.
				// This might not apply to all properties...*
				data_user.set( this, camelKey, value );

				// *... In the case of properties that might _actually_
				// have dashes, we need to also store a copy of that
				// unchanged property.
				if ( key.indexOf("-") !== -1 && data !== undefined ) {
					data_user.set( this, key, value );
				}
			});
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each(function() {
			data_user.remove( this, key );
		});
	}
});


jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = data_priv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = data_priv.access( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return data_priv.get( elem, key ) || data_priv.access( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				data_priv.remove( elem, [ type + "queue", key ] );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = data_priv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;

var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHidden = function( elem, el ) {
		// isHidden might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;
		return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
	};

var rcheckableType = (/^(?:checkbox|radio)$/i);



(function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Safari<=5.1
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Safari<=5.1, Android<4.2
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE<=11+
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
})();
var strundefined = typeof undefined;



support.focusinBubbles = "onfocusin" in window;


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.hasData( elem ) && data_priv.get( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;
			data_priv.remove( elem, "events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, j, ret, matched, handleObj,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
				// a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, matches, sel, handleObj,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: Cordova 2.5 (WebKit) (#13255)
		// All events should have a target; Cordova deviceready doesn't
		if ( !event.target ) {
			event.target = document;
		}

		// Support: Safari 6.0+, Chrome<28
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle, false );
	}
};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&
				// Support: Android<4.0
				src.returnValue === false ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && e.preventDefault ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && e.stopPropagation ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && e.stopImmediatePropagation ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
// Support: Chrome 15+
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// Support: Firefox, Chrome, Safari
// Create "bubbling" focus and blur events
if ( !support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				data_priv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					data_priv.remove( doc, fix );

				} else {
					data_priv.access( doc, fix, attaches );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});


var
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /^$|\/(?:java|ecma)script/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

	// We have to close these tags to support XHTML (#13200)
	wrapMap = {

		// Support: IE9
		option: [ 1, "<select multiple='multiple'>", "</select>" ],

		thead: [ 1, "<table>", "</table>" ],
		col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		_default: [ 0, "", "" ]
	};

// Support: IE9
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: 1.x compatibility
// Manipulating tables requires a tbody
function manipulationTarget( elem, content ) {
	return jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

		elem.getElementsByTagName("tbody")[0] ||
			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
		elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute("type");
	}

	return elem;
}

// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		data_priv.set(
			elems[ i ], "globalEval", !refElements || data_priv.get( refElements[ i ], "globalEval" )
		);
	}
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( data_priv.hasData( src ) ) {
		pdataOld = data_priv.access( src );
		pdataCur = data_priv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( data_user.hasData( src ) ) {
		udataOld = data_user.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		data_user.set( dest, udataCur );
	}
}

function getAll( context, tag ) {
	var ret = context.getElementsByTagName ? context.getElementsByTagName( tag || "*" ) :
			context.querySelectorAll ? context.querySelectorAll( tag || "*" ) :
			[];

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], ret ) :
		ret;
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	buildFragment: function( elems, context, scripts, selection ) {
		var elem, tmp, tag, wrap, contains, j,
			fragment = context.createDocumentFragment(),
			nodes = [],
			i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {
					// Support: QtWebKit, PhantomJS
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || fragment.appendChild( context.createElement("div") );

					// Deserialize a standard representation
					tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					tmp.innerHTML = wrap[ 1 ] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[ 2 ];

					// Descend through wrappers to the right content
					j = wrap[ 0 ];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Support: QtWebKit, PhantomJS
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge( nodes, tmp.childNodes );

					// Remember the top-level container
					tmp = fragment.firstChild;

					// Ensure the created nodes are orphaned (#12392)
					tmp.textContent = "";
				}
			}
		}

		// Remove wrapper from fragment
		fragment.textContent = "";

		i = 0;
		while ( (elem = nodes[ i++ ]) ) {

			// #4087 - If origin and destination elements are the same, and this is
			// that element, do not do anything
			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( fragment.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( (elem = tmp[ j++ ]) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		return fragment;
	},

	cleanData: function( elems ) {
		var data, elem, type, key,
			special = jQuery.event.special,
			i = 0;

		for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
			if ( jQuery.acceptData( elem ) ) {
				key = elem[ data_priv.expando ];

				if ( key && (data = data_priv.cache[ key ]) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}
					if ( data_priv.cache[ key ] ) {
						// Discard any remaining `private` data
						delete data_priv.cache[ key ];
					}
				}
			}
			// Discard any remaining `user` data
			delete data_user.cache[ elem[ data_user.expando ] ];
		}
	}
});

jQuery.fn.extend({
	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each(function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				});
		}, null, value, arguments.length );
	},

	append: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	remove: function( selector, keepData /* Internal Use Only */ ) {
		var elem,
			elems = selector ? jQuery.filter( selector, this ) : this,
			i = 0;

		for ( ; (elem = elems[i]) != null; i++ ) {
			if ( !keepData && elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem ) );
			}

			if ( elem.parentNode ) {
				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
					setGlobalEval( getAll( elem, "script" ) );
				}
				elem.parentNode.removeChild( elem );
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map(function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var arg = arguments[ 0 ];

		// Make the changes, replacing each context element with the new content
		this.domManip( arguments, function( elem ) {
			arg = this.parentNode;

			jQuery.cleanData( getAll( this ) );

			if ( arg ) {
				arg.replaceChild( elem, this );
			}
		});

		// Force removal if there was no new content (e.g., from empty arguments)
		return arg && (arg.length || arg.nodeType) ? this : this.remove();
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, callback ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var fragment, first, scripts, hasScripts, node, doc,
			i = 0,
			l = this.length,
			set = this,
			iNoClone = l - 1,
			value = args[ 0 ],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return this.each(function( index ) {
				var self = set.eq( index );
				if ( isFunction ) {
					args[ 0 ] = value.call( this, index, self.html() );
				}
				self.domManip( args, callback );
			});
		}

		if ( l ) {
			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {
							// Support: QtWebKit
							// jQuery.merge because push.apply(_, arraylike) throws
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( this[ i ], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!data_priv.access( node, "globalEval" ) && jQuery.contains( doc, node ) ) {

							if ( node.src ) {
								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
							}
						}
					}
				}
			}
		}

		return this;
	}
});

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: QtWebKit
			// .get() because push.apply(_, arraylike) throws
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});


var iframe,
	elemdisplay = {};

/**
 * Retrieve the actual display of a element
 * @param {String} name nodeName of the element
 * @param {Object} doc Document object
 */
// Called only from within defaultDisplay
function actualDisplay( name, doc ) {
	var style,
		elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),

		// getDefaultComputedStyle might be reliably used only on attached element
		display = window.getDefaultComputedStyle && ( style = window.getDefaultComputedStyle( elem[ 0 ] ) ) ?

			// Use of this method is a temporary fix (more like optimization) until something better comes along,
			// since it was removed from specification and supported only in FF
			style.display : jQuery.css( elem[ 0 ], "display" );

	// We don't have any data stored on the element,
	// so use "detach" method as fast way to get rid of the element
	elem.detach();

	return display;
}

/**
 * Try to determine the default display value of an element
 * @param {String} nodeName
 */
function defaultDisplay( nodeName ) {
	var doc = document,
		display = elemdisplay[ nodeName ];

	if ( !display ) {
		display = actualDisplay( nodeName, doc );

		// If the simple way fails, read from inside an iframe
		if ( display === "none" || !display ) {

			// Use the already-created iframe if possible
			iframe = (iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" )).appendTo( doc.documentElement );

			// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
			doc = iframe[ 0 ].contentDocument;

			// Support: IE
			doc.write();
			doc.close();

			display = actualDisplay( nodeName, doc );
			iframe.detach();
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return display;
}
var rmargin = (/^margin/);

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {
		// Support: IE<=11+, Firefox<=30+ (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		if ( elem.ownerDocument.defaultView.opener ) {
			return elem.ownerDocument.defaultView.getComputedStyle( elem, null );
		}

		return window.getComputedStyle( elem, null );
	};



function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,
		style = elem.style;

	computed = computed || getStyles( elem );

	// Support: IE9
	// getPropertyValue is only needed for .css('filter') (#12537)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];
	}

	if ( computed ) {

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// Support: iOS < 6
		// A tribute to the "awesome hack by Dean Edwards"
		// iOS < 6 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
		// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
		if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?
		// Support: IE
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {
	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {
				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return (this.get = hookFn).apply( this, arguments );
		}
	};
}


(function() {
	var pixelPositionVal, boxSizingReliableVal,
		docElem = document.documentElement,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	if ( !div.style ) {
		return;
	}

	// Support: IE9-11+
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;" +
		"position:absolute";
	container.appendChild( div );

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computePixelPositionAndBoxSizingReliable() {
		div.style.cssText =
			// Support: Firefox<29, Android 2.3
			// Vendor-prefix box-sizing
			"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" +
			"box-sizing:border-box;display:block;margin-top:1%;top:1%;" +
			"border:1px;padding:1px;width:4px;position:absolute";
		div.innerHTML = "";
		docElem.appendChild( container );

		var divStyle = window.getComputedStyle( div, null );
		pixelPositionVal = divStyle.top !== "1%";
		boxSizingReliableVal = divStyle.width === "4px";

		docElem.removeChild( container );
	}

	// Support: node.js jsdom
	// Don't assume that getComputedStyle is a property of the global object
	if ( window.getComputedStyle ) {
		jQuery.extend( support, {
			pixelPosition: function() {

				// This test is executed only once but we still do memoizing
				// since we can use the boxSizingReliable pre-computing.
				// No need to check if the test was already performed, though.
				computePixelPositionAndBoxSizingReliable();
				return pixelPositionVal;
			},
			boxSizingReliable: function() {
				if ( boxSizingReliableVal == null ) {
					computePixelPositionAndBoxSizingReliable();
				}
				return boxSizingReliableVal;
			},
			reliableMarginRight: function() {

				// Support: Android 2.3
				// Check if div with explicit width and no margin-right incorrectly
				// gets computed margin-right based on width of container. (#3333)
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// This support function is only executed once so no memoizing is needed.
				var ret,
					marginDiv = div.appendChild( document.createElement( "div" ) );

				// Reset CSS: box-sizing; display; margin; border; padding
				marginDiv.style.cssText = div.style.cssText =
					// Support: Firefox<29, Android 2.3
					// Vendor-prefix box-sizing
					"-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" +
					"box-sizing:content-box;display:block;margin:0;border:0;padding:0";
				marginDiv.style.marginRight = marginDiv.style.width = "0";
				div.style.width = "1px";
				docElem.appendChild( container );

				ret = !parseFloat( window.getComputedStyle( marginDiv, null ).marginRight );

				docElem.removeChild( container );
				div.removeChild( marginDiv );

				return ret;
			}
		});
	}
})();


// A method for quickly swapping in/out CSS properties to get correct calculations.
jQuery.swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var
	// Swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rnumsplit = new RegExp( "^(" + pnum + ")(.*)$", "i" ),
	rrelNum = new RegExp( "^([+-])=(" + pnum + ")", "i" ),

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];

// Return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// Shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// Check for vendor prefixed names
	var capName = name[0].toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// Both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// At this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {
			// At this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// At this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var valueIsBorderBox = true,
		val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		styles = getStyles( elem ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// Some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// Check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox &&
			( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// Use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

function showHide( elements, show ) {
	var display, elem, hidden,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		values[ index ] = data_priv.get( elem, "olddisplay" );
		display = elem.style.display;
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = data_priv.access( elem, "olddisplay", defaultDisplay(elem.nodeName) );
			}
		} else {
			hidden = isHidden( elem );

			if ( display !== "none" || !hidden ) {
				data_priv.set( elem, "olddisplay", hidden ? display : jQuery.css( elem, "display" ) );
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.extend({

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// Support: IE9-11+
			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
				style[ name ] = value;
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	}
});

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) && elem.offsetWidth === 0 ?
					jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					}) :
					getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var styles = extra && getStyles( elem );
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				) : 0
			);
		}
	};
});

// Support: Android 2.3
jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
	function( elem, computed ) {
		if ( computed ) {
			return jQuery.swap( elem, { "display": "inline-block" },
				curCSS, [ elem, "marginRight" ] );
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});

jQuery.fn.extend({
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each(function() {
			if ( isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE9
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	}
};

jQuery.fx = Tween.prototype.init;

// Back Compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value ),
				target = tween.cur(),
				parts = rfxnum.exec( value ),
				unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

				// Starting value computation is required for potential unit mismatches
				start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
					rfxnum.exec( jQuery.css( tween.elem, prop ) ),
				scale = 1,
				maxIterations = 20;

			if ( start && start[ 3 ] !== unit ) {
				// Trust units reported by jQuery.css
				unit = unit || start[ 3 ];

				// Make sure we update the tween properties later on
				parts = parts || [];

				// Iteratively approximate from a nonzero starting point
				start = +target || 1;

				do {
					// If previous iteration zeroed out, double until we get *something*.
					// Use string for doubling so we don't accidentally see scale as unchanged below
					scale = scale || ".5";

					// Adjust and apply
					start = start / scale;
					jQuery.style( tween.elem, prop, start + unit );

				// Update scale, tolerating zero or NaN from tween.cur(),
				// break the loop if scale is unchanged or perfect, or if we've just had enough
				} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
			}

			// Update tween properties
			if ( parts ) {
				start = tween.start = +start || +target || 0;
				tween.unit = unit;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[ 1 ] ?
					start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :
					+parts[ 2 ];
			}

			return tween;
		} ]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	});
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( (tween = collection[ index ].call( animation, prop, value )) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	/* jshint validthis: true */
	var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHidden( elem ),
		dataShow = data_priv.get( elem, "fxshow" );

	// Handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// Ensure the complete handler is called before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// Height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE9-10 do not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		display = jQuery.css( elem, "display" );

		// Test default display if display is currently "none"
		checkDisplay = display === "none" ?
			data_priv.get( elem, "olddisplay" ) || defaultDisplay( elem.nodeName ) : display;

		if ( checkDisplay === "inline" && jQuery.css( elem, "float" ) === "none" ) {
			style.display = "inline-block";
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always(function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		});
	}

	// show/hide pass
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );

		// Any non-fx value stops us from restoring the original display value
		} else {
			display = undefined;
		}
	}

	if ( !jQuery.isEmptyObject( orig ) ) {
		if ( dataShow ) {
			if ( "hidden" in dataShow ) {
				hidden = dataShow.hidden;
			}
		} else {
			dataShow = data_priv.access( elem, "fxshow", {} );
		}

		// Store state if its toggle - enables .stop().toggle() to "reverse"
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;

			data_priv.remove( elem, "fxshow" );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( prop in orig ) {
			tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}

	// If this is a noop like .hide().hide(), restore an overwritten display value
	} else if ( (display === "none" ? defaultDisplay( elem.nodeName ) : display) === "inline" ) {
		style.display = display;
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// Don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				// Support: Android 2.3
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || data_priv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = data_priv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each(function() {
			var index,
				data = data_priv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		});
	}
});

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;

jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = setTimeout( next, time );
		hooks.stop = function() {
			clearTimeout( timeout );
		};
	});
};


(function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: iOS<=5.1, Android<=4.2+
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE<=11+
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: Android<=2.3
	// Options inside disabled selects are incorrectly marked as disabled
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Support: IE<=11+
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
})();


var nodeHook, boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend({
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	}
});

jQuery.extend({
	attr: function( elem, name, value ) {
		var hooks, ret,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === strundefined ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );

			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {
			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( (name = attrNames[i++]) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {
					// Set corresponding property to false
					elem[ propName ] = false;
				}

				elem.removeAttribute( name );
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	}
});

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle;
		if ( !isXML ) {
			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ name ];
			attrHandle[ name ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				name.toLowerCase() :
				null;
			attrHandle[ name ] = handle;
		}
		return ret;
	};
});




var rfocusable = /^(?:input|select|textarea|button)$/i;

jQuery.fn.extend({
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each(function() {
			delete this[ jQuery.propFix[ name ] || name ];
		});
	}
});

jQuery.extend({
	propFix: {
		"for": "htmlFor",
		"class": "className"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
				ret :
				( elem[ name ] = value );

		} else {
			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
				ret :
				elem[ name ];
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				return elem.hasAttribute( "tabindex" ) || rfocusable.test( elem.nodeName ) || elem.href ?
					elem.tabIndex :
					-1;
			}
		}
	}
});

if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});




var rclass = /[\t\r\n\f]/g;

jQuery.fn.extend({
	addClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, this.className ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = arguments.length === 0 || typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, this.className ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// Toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					classNames = value.match( rnotwhite ) || [];

				while ( (className = classNames[ i++ ]) ) {
					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( type === strundefined || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					data_priv.set( this, "__className__", this.className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.className = this.className || value === false ? "" : data_priv.get( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	}
});




var rreturn = /\r/g;

jQuery.fn.extend({
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// Handle most common string cases
					ret.replace(rreturn, "") :
					// Handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :
					// Support: IE10-11+
					// option.text throws exceptions (#14686, #14858)
					jQuery.trim( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// IE6-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( support.optDisabled ? !option.disabled : option.getAttribute( "disabled" ) === null ) &&
							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];
					if ( (option.selected = jQuery.inArray( option.value, values ) >= 0) ) {
						optionSet = true;
					}
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
});

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});




// Return jQuery for attributes-only inclusion


jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}
});


var nonce = jQuery.now();

var rquery = (/\?/);



// Support: Android 2.3
// Workaround failure to string-cast null input
jQuery.parseJSON = function( data ) {
	return JSON.parse( data + "" );
};


// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, tmp;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE9
	try {
		tmp = new DOMParser();
		xml = tmp.parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Document location
	ajaxLocation = window.location.href,

	// Segment location into parts
	ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			while ( (dataType = dataTypes[i++]) ) {
				// Prepend if requested
				if ( dataType[0] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );

				// Otherwise append
				} else {
					(structure[ dataType ] = structure[ dataType ] || []).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		});
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

		// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s[ "throws" ] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: ajaxLocation,
		type: "GET",
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,
			// URL without anti-cache param
			cacheURL,
			// Response headers
			responseHeadersString,
			responseHeaders,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks("once memory"),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( (match = rheaders.exec( responseHeadersString )) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					var lname = name.toLowerCase();
					if ( !state ) {
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( state < 2 ) {
							for ( code in map ) {
								// Lazy-add the new callback in a way that preserves old ones
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						} else {
							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR ).complete = completeDeferred.add;
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" )
			.replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger("ajaxStart");
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		cacheURL = s.url;

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {
				s.url = rts.test( cacheURL ) ?

					// If there is already a '_' parameter, set its value
					cacheURL.replace( rts, "$1_=" + nonce++ ) :

					// Otherwise add one to the end
					cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
			}
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout(function() {
					jqXHR.abort("timeout");
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch ( e ) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader("etag");
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {
				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger("ajaxStop");
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// Shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		});
	};
});


jQuery._evalUrl = function( url ) {
	return jQuery.ajax({
		url: url,
		type: "GET",
		dataType: "script",
		async: false,
		global: false,
		"throws": true
	});
};


jQuery.fn.extend({
	wrapAll: function( html ) {
		var wrap;

		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapAll( html.call(this, i) );
			});
		}

		if ( this[ 0 ] ) {

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	}
});


jQuery.expr.filters.hidden = function( elem ) {
	// Support: Opera <= 12.12
	// Opera reports offsetWidths and offsetHeights less than zero on some elements
	return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
};
jQuery.expr.filters.visible = function( elem ) {
	return !jQuery.expr.filters.hidden( elem );
};




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function() {
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		})
		.map(function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});


jQuery.ajaxSettings.xhr = function() {
	try {
		return new XMLHttpRequest();
	} catch( e ) {}
};

var xhrId = 0,
	xhrCallbacks = {},
	xhrSuccessStatus = {
		// file protocol always yields status code 0, assume 200
		0: 200,
		// Support: IE9
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

// Support: IE9
// Open requests must be manually aborted on unload (#5280)
// See https://support.microsoft.com/kb/2856746 for more info
if ( window.attachEvent ) {
	window.attachEvent( "onunload", function() {
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]();
		}
	});
}

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport(function( options ) {
	var callback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr(),
					id = ++xhrId;

				xhr.open( options.type, options.url, options.async, options.username, options.password );

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers["X-Requested-With"] ) {
					headers["X-Requested-With"] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							delete xhrCallbacks[ id ];
							callback = xhr.onload = xhr.onerror = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {
								complete(
									// file: protocol always yields status 0; see #8605, #14207
									xhr.status,
									xhr.statusText
								);
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,
									// Support: IE9
									// Accessing binary-data responseText throws an exception
									// (#11426)
									typeof xhr.responseText === "string" ? {
										text: xhr.responseText
									} : undefined,
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				xhr.onerror = callback("error");

				// Create the abort callback
				callback = xhrCallbacks[ id ] = callback("abort");

				try {
					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {
					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {
	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery("<script>").prop({
					async: true,
					charset: s.scriptCharset,
					src: s.url
				}).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});




// data: string of html
// context (optional): If specified, the fragment will be created in this context, defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}
	context = context || document;

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[1] ) ];
	}

	parsed = jQuery.buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


// Keep a copy of the old load method
var _load = jQuery.fn.load;

/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	var selector, type, response,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = jQuery.trim( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		}).complete( callback && function( jqXHR, status ) {
			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
		});
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
});




jQuery.expr.filters.animated = function( elem ) {
	return jQuery.grep(jQuery.timers, function( fn ) {
		return elem === fn.elem;
	}).length;
};




var docElem = window.document.documentElement;

/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf("auto") > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend({
	offset: function( options ) {
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each(function( i ) {
					jQuery.offset.setOffset( this, options, i );
				});
		}

		var docElem, win,
			elem = this[ 0 ],
			box = { top: 0, left: 0 },
			doc = elem && elem.ownerDocument;

		if ( !doc ) {
			return;
		}

		docElem = doc.documentElement;

		// Make sure it's not a disconnected DOM node
		if ( !jQuery.contains( docElem, elem ) ) {
			return box;
		}

		// Support: BlackBerry 5, iOS 3 (original iPhone)
		// If we don't have gBCR, just use 0,0 rather than error
		if ( typeof elem.getBoundingClientRect !== strundefined ) {
			box = elem.getBoundingClientRect();
		}
		win = getWindow( doc );
		return {
			top: box.top + win.pageYOffset - docElem.clientTop,
			left: box.left + win.pageXOffset - docElem.clientLeft
		};
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {
			// Assume getBoundingClientRect is there when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {
			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || docElem;

			while ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position" ) === "static" ) ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || docElem;
		});
	}
});

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : window.pageXOffset,
					top ? val : window.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

// Support: Safari<7+, Chrome<37+
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://code.google.com/p/chromium/issues/detail?id=229280
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );
				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
});


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});


// The number of elements contained in the matched element set
jQuery.fn.size = function() {
	return this.length;
};

jQuery.fn.andSelf = jQuery.fn.addBack;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	});
}




var
	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === strundefined ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;

}));

},{}],12:[function(require,module,exports){
(function (global){
//! moment.js
//! version : 2.9.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {
    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = '2.9.0',
        // the global-scope this is NOT the global object in Node.js
        globalScope = (typeof global !== 'undefined' && (typeof window === 'undefined' || window === global.window)) ? global : this,
        oldGlobalMoment,
        round = Math.round,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for locale config files
        locales = {},

        // extra moment internal properties (plugins register props here)
        momentProperties = [],

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|x|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenOffsetMs = /[\+\-]?\d+/, // 1234567890123
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker '+10:00' > ['10', '00'] or '-1530' > ['-', '15', '30']
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // default relative time thresholds
        relativeTimeThresholds = {
            s: 45,  // seconds to minute
            m: 45,  // minutes to hour
            h: 22,  // hours to day
            d: 26,  // days to month
            M: 11   // months to year
        },

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.localeData().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.localeData().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.localeData().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.localeData().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.localeData().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ':' + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            x    : function () {
                return this.valueOf();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        deprecations = {},

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'],

        updateInProgress = false;

    // Pick the first defined of two or three arguments. dfl comes from
    // default.
    function dfl(a, b, c) {
        switch (arguments.length) {
            case 2: return a != null ? a : b;
            case 3: return a != null ? a : b != null ? b : c;
            default: throw new Error('Implement me');
        }
    }

    function hasOwnProp(a, b) {
        return hasOwnProperty.call(a, b);
    }

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function printMsg(msg) {
        if (moment.suppressDeprecationWarnings === false &&
                typeof console !== 'undefined' && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        return extend(function () {
            if (firstTime) {
                printMsg(msg);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            printMsg(msg);
            deprecations[name] = true;
        }
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.localeData().ordinal(func.call(this, a), period);
        };
    }

    function monthDiff(a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        return -(wholeMonthDiff + adjust);
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    function meridiemFixWrap(locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // thie is not supposed to happen
            return hour;
        }
    }

    /************************************
        Constructors
    ************************************/

    function Locale() {
    }

    // Moment prototype object
    function Moment(config, skipOverflow) {
        if (skipOverflow !== false) {
            checkOverflow(config);
        }
        copyConfig(this, config);
        this._d = new Date(+config._d);
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            moment.updateOffset(this);
            updateInProgress = false;
        }
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = moment.localeData();

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function copyConfig(to, from) {
        var i, prop, val;

        if (typeof from._isAMomentObject !== 'undefined') {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (typeof from._i !== 'undefined') {
            to._i = from._i;
        }
        if (typeof from._f !== 'undefined') {
            to._f = from._f;
        }
        if (typeof from._l !== 'undefined') {
            to._l = from._l;
        }
        if (typeof from._strict !== 'undefined') {
            to._strict = from._strict;
        }
        if (typeof from._tzm !== 'undefined') {
            to._tzm = from._tzm;
        }
        if (typeof from._isUTC !== 'undefined') {
            to._isUTC = from._isUTC;
        }
        if (typeof from._offset !== 'undefined') {
            to._offset = from._offset;
        }
        if (typeof from._pf !== 'undefined') {
            to._pf = from._pf;
        }
        if (typeof from._locale !== 'undefined') {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (typeof val !== 'undefined') {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        other = makeAs(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = moment.duration(val, period);
            addOrSubtractDurationFromMoment(this, dur, direction);
            return this;
        };
    }

    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return Object.prototype.toString.call(input) === '[object Date]' ||
            input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment._locale[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment._locale, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 24 ||
                    (m._a[HOUR] === 24 && (m._a[MINUTE] !== 0 ||
                                           m._a[SECOND] !== 0 ||
                                           m._a[MILLISECOND] !== 0)) ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0 &&
                    m._pf.bigHour === undefined;
            }
        }
        return m._isValid;
    }

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }

    function loadLocale(name) {
        var oldLocale = null;
        if (!locales[name] && hasModule) {
            try {
                oldLocale = moment.locale();
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we want to undo that for lazy loaded locales
                moment.locale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // Return a moment from input, that is local/utc/utcOffset equivalent to
    // model.
    function makeAs(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (moment.isMoment(input) || isDate(input) ?
                    +input : +moment(input)) - (+res);
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(+res._d + diff);
            moment.updateOffset(res, false);
            return res;
        } else {
            return moment(input).local();
        }
    }

    /************************************
        Locale
    ************************************/


    extend(Locale.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
            // Lenient ordinal parsing accepts just a number in addition to
            // number + (possibly) stuff coming from _ordinalParseLenient.
            this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + /\d{1,2}/.source);
        },

        _months : 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName, format, strict) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = moment.utc([2000, i]);
                if (strict && !this._longMonthsParse[i]) {
                    this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                    this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
                }
                if (!strict && !this._monthsParse[i]) {
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                    return i;
                } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                    return i;
                } else if (!strict && this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LTS : 'h:mm:ss A',
            LT : 'h:mm A',
            L : 'MM/DD/YYYY',
            LL : 'MMMM D, YYYY',
            LLL : 'MMMM D, YYYY LT',
            LLLL : 'dddd, MMMM D, YYYY LT'
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },


        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom, now) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom, [now]) : output;
        },

        _relativeTime : {
            future : 'in %s',
            past : '%s ago',
            s : 'a few seconds',
            m : 'a minute',
            mm : '%d minutes',
            h : 'an hour',
            hh : '%d hours',
            d : 'a day',
            dd : '%d days',
            M : 'a month',
            MM : '%d months',
            y : 'a year',
            yy : '%d years'
        },

        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },

        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace('%d', number);
        },
        _ordinal : '%d',
        _ordinalParse : /\d{1,2}/,

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        firstDayOfWeek : function () {
            return this._week.dow;
        },

        firstDayOfYear : function () {
            return this._week.doy;
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '';
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) {
                return parseTokenOneDigit;
            }
            /* falls through */
        case 'SS':
            if (strict) {
                return parseTokenTwoDigits;
            }
            /* falls through */
        case 'SSS':
            if (strict) {
                return parseTokenThreeDigits;
            }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return config._locale._meridiemParse;
        case 'x':
            return parseTokenOffsetMs;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return strict ? config._locale._ordinalParse : config._locale._ordinalParseLenient;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), 'i'));
            return a;
        }
    }

    function utcOffsetFromString(string) {
        string = string || '';
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? minutes : -minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = config._locale.monthsParse(input, token, config._strict);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(
                            input.match(/\d{1,2}/)[0], 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._meridiem = input;
            // config._isPm = config._locale.isPM(input);
            break;
        // HOUR
        case 'h' : // fall through to hh
        case 'hh' :
            config._pf.bigHour = true;
            /* falls through */
        case 'H' : // fall through to HH
        case 'HH' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX OFFSET (MILLISECONDS)
        case 'x':
            config._d = new Date(toInt(input));
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = utcOffsetFromString(input);
            break;
        // WEEKDAY - human
        case 'dd':
        case 'ddd':
        case 'dddd':
            a = config._locale.weekdaysParse(input);
            // if we didn't get a weekday name, mark the date as invalid
            if (a != null) {
                config._w = config._w || {};
                config._w['d'] = a;
            } else {
                config._pf.invalidWeekday = input;
            }
            break;
        // WEEK, WEEK DAY - numeric
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = toInt(input);
            }
            break;
        case 'gg':
        case 'GG':
            config._w = config._w || {};
            config._w[token] = moment.parseTwoDigitYear(input);
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
            week = dfl(w.W, 1);
            weekday = dfl(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
            week = dfl(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day || normalizedInput.date,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {
        if (config._f === moment.ISO_8601) {
            parseISO(config);
            return;
        }

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._pf.bigHour === true && config._a[HOUR] <= 12) {
            config._pf.bigHour = undefined;
        }
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR],
                config._meridiem);
        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function parseISO(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be 'T' or undefined
                    config._f = isoDates[i][0] + (match[6] || ' ');
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += 'Z';
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function makeDateFromString(config) {
        parseISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            moment.createFromInputFallback(config);
        }
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function makeDateFromInput(config) {
        var input = config._i, matched;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if ((matched = aspNetJsonRegex.exec(input)) !== null) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            dateFromConfig(config);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, locale) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = locale.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(posNegDuration, withoutSuffix, locale) {
        var duration = moment.duration(posNegDuration).abs(),
            seconds = round(duration.as('s')),
            minutes = round(duration.as('m')),
            hours = round(duration.as('h')),
            days = round(duration.as('d')),
            months = round(duration.as('M')),
            years = round(duration.as('y')),

            args = seconds < relativeTimeThresholds.s && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < relativeTimeThresholds.m && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < relativeTimeThresholds.h && ['hh', hours] ||
                days === 1 && ['d'] ||
                days < relativeTimeThresholds.d && ['dd', days] ||
                months === 1 && ['M'] ||
                months < relativeTimeThresholds.M && ['MM', months] ||
                years === 1 && ['y'] || ['yy', years];

        args[2] = withoutSuffix;
        args[3] = +posNegDuration > 0;
        args[4] = locale;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add(daysToDayOfWeek, 'd');
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f,
            res;

        config._locale = config._locale || moment.localeData(config._l);

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (moment.isMoment(input)) {
            return new Moment(input, true);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        res = new Moment(config);
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    moment = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = locale;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return moment();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    moment.min = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    };

    moment.max = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    };

    // creating with utc
    moment.utc = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso,
            diffRes;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' &&
                ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(moment(duration.from), moment(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // constant that refers to the ISO standard
    moment.ISO_8601 = function () {};

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function allows you to set a threshold for relative time strings
    moment.relativeTimeThreshold = function (threshold, limit) {
        if (relativeTimeThresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return relativeTimeThresholds[threshold];
        }
        relativeTimeThresholds[threshold] = limit;
        return true;
    };

    moment.lang = deprecate(
        'moment.lang is deprecated. Use moment.locale instead.',
        function (key, value) {
            return moment.locale(key, value);
        }
    );

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    moment.locale = function (key, values) {
        var data;
        if (key) {
            if (typeof(values) !== 'undefined') {
                data = moment.defineLocale(key, values);
            }
            else {
                data = moment.localeData(key);
            }

            if (data) {
                moment.duration._locale = moment._locale = data;
            }
        }

        return moment._locale._abbr;
    };

    moment.defineLocale = function (name, values) {
        if (values !== null) {
            values.abbr = name;
            if (!locales[name]) {
                locales[name] = new Locale();
            }
            locales[name].set(values);

            // backwards compat for now: also set the locale
            moment.locale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    };

    moment.langData = deprecate(
        'moment.langData is deprecated. Use moment.localeData instead.',
        function (key) {
            return moment.localeData(key);
        }
    );

    // returns locale data
    moment.localeData = function (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return moment._locale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null && hasOwnProp(obj, '_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    moment.isDate = isDate;

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d - ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                if ('function' === typeof Date.prototype.toISOString) {
                    // native implementation is ~50x faster, use it when we can
                    return this.toDate().toISOString();
                } else {
                    return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
                }
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {
            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function (keepLocalTime) {
            return this.utcOffset(0, keepLocalTime);
        },

        local : function (keepLocalTime) {
            if (this._isUTC) {
                this.utcOffset(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.subtract(this._dateUtcOffset(), 'm');
                }
            }
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.localeData().postformat(output);
        },

        add : createAdder(1, 'add'),

        subtract : createAdder(-1, 'subtract'),

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (that.utcOffset() - this.utcOffset()) * 6e4,
                anchor, diff, output, daysAdjust;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month' || units === 'quarter') {
                output = monthDiff(this, that);
                if (units === 'quarter') {
                    output = output / 3;
                } else if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = this - that;
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function (time) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're locat/utc/offset
            // or not.
            var now = time || moment(),
                sod = makeAs(now, this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.localeData().calendar(format, this, moment(now)));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.utcOffset() > this.clone().month(0).utcOffset() ||
                this.utcOffset() > this.clone().month(5).utcOffset());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.localeData());
                return this.add(input - day, 'd');
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf : function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond') {
                return this;
            }
            return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
        },

        isAfter: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this > +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return inputMs < +this.clone().startOf(units);
            }
        },

        isBefore: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this < +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return +this.clone().endOf(units) < inputMs;
            }
        },

        isBetween: function (from, to, units) {
            return this.isAfter(from, units) && this.isBefore(to, units);
        },

        isSame: function (input, units) {
            var inputMs;
            units = normalizeUnits(units || 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this === +input;
            } else {
                inputMs = +moment(input);
                return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
            }
        },

        min: deprecate(
                 'moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
                 function (other) {
                     other = moment.apply(null, arguments);
                     return other < this ? this : other;
                 }
         ),

        max: deprecate(
                'moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
                function (other) {
                    other = moment.apply(null, arguments);
                    return other > this ? this : other;
                }
        ),

        zone : deprecate(
                'moment().zone is deprecated, use moment().utcOffset instead. ' +
                'https://github.com/moment/moment/issues/1779',
                function (input, keepLocalTime) {
                    if (input != null) {
                        if (typeof input !== 'string') {
                            input = -input;
                        }

                        this.utcOffset(input, keepLocalTime);

                        return this;
                    } else {
                        return -this.utcOffset();
                    }
                }
        ),

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        utcOffset : function (input, keepLocalTime) {
            var offset = this._offset || 0,
                localAdjust;
            if (input != null) {
                if (typeof input === 'string') {
                    input = utcOffsetFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = this._dateUtcOffset();
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.add(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(input - offset, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }

                return this;
            } else {
                return this._isUTC ? offset : this._dateUtcOffset();
            }
        },

        isLocal : function () {
            return !this._isUTC;
        },

        isUtcOffset : function () {
            return this._isUTC;
        },

        isUtc : function () {
            return this._isUTC && this._offset === 0;
        },

        zoneAbbr : function () {
            return this._isUTC ? 'UTC' : '';
        },

        zoneName : function () {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        },

        parseZone : function () {
            if (this._tzm) {
                this.utcOffset(this._tzm);
            } else if (typeof this._i === 'string') {
                this.utcOffset(utcOffsetFromString(this._i));
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).utcOffset();
            }

            return (this.utcOffset() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        week : function (input) {
            var week = this.localeData().week(this);
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
            return input == null ? weekday : this.add(input - weekday, 'd');
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            var unit;
            if (typeof units === 'object') {
                for (unit in units) {
                    this.set(unit, units[unit]);
                }
            }
            else {
                units = normalizeUnits(units);
                if (typeof this[units] === 'function') {
                    this[units](value);
                }
            }
            return this;
        },

        // If passed a locale key, it will set the locale for this
        // instance.  Otherwise, it will return the locale configuration
        // variables for this instance.
        locale : function (key) {
            var newLocaleData;

            if (key === undefined) {
                return this._locale._abbr;
            } else {
                newLocaleData = moment.localeData(key);
                if (newLocaleData != null) {
                    this._locale = newLocaleData;
                }
                return this;
            }
        },

        lang : deprecate(
            'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
            function (key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            }
        ),

        localeData : function () {
            return this._locale;
        },

        _dateUtcOffset : function () {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return -Math.round(this._d.getTimezoneOffset() / 15) * 15;
        }

    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate('dates accessor is deprecated. Use date instead.', makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate('years accessor is deprecated. Use year instead.', makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    // alias isUtc for dev-friendliness
    moment.fn.isUTC = moment.fn.isUtc;

    /************************************
        Duration Prototype
    ************************************/


    function daysToYears (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        return days * 400 / 146097;
    }

    function yearsToDays (years) {
        // years * 365 + absRound(years / 4) -
        //     absRound(years / 100) + absRound(years / 400);
        return years * 146097 / 400;
    }

    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years = 0;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);

            // Accurately convert days to years, assume start from year 0.
            years = absRound(daysToYears(days));
            days -= absRound(yearsToDays(years));

            // 30 days to a month
            // TODO (iskren): Use anchor date (like 1st Jan) to compute this.
            months += absRound(days / 30);
            days %= 30;

            // 12 months -> 1 year
            years += absRound(months / 12);
            months %= 12;

            data.days = days;
            data.months = months;
            data.years = years;
        },

        abs : function () {
            this._milliseconds = Math.abs(this._milliseconds);
            this._days = Math.abs(this._days);
            this._months = Math.abs(this._months);

            this._data.milliseconds = Math.abs(this._data.milliseconds);
            this._data.seconds = Math.abs(this._data.seconds);
            this._data.minutes = Math.abs(this._data.minutes);
            this._data.hours = Math.abs(this._data.hours);
            this._data.months = Math.abs(this._data.months);
            this._data.years = Math.abs(this._data.years);

            return this;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var output = relativeTime(this, !withSuffix, this.localeData());

            if (withSuffix) {
                output = this.localeData().pastFuture(+this, output);
            }

            return this.localeData().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            var days, months;
            units = normalizeUnits(units);

            if (units === 'month' || units === 'year') {
                days = this._days + this._milliseconds / 864e5;
                months = this._months + daysToYears(days) * 12;
                return units === 'month' ? months : months / 12;
            } else {
                // handle milliseconds separately because of floating point math errors (issue #1867)
                days = this._days + Math.round(yearsToDays(this._months / 12));
                switch (units) {
                    case 'week': return days / 7 + this._milliseconds / 6048e5;
                    case 'day': return days + this._milliseconds / 864e5;
                    case 'hour': return days * 24 + this._milliseconds / 36e5;
                    case 'minute': return days * 24 * 60 + this._milliseconds / 6e4;
                    case 'second': return days * 24 * 60 * 60 + this._milliseconds / 1000;
                    // Math.floor prevents floating point math errors here
                    case 'millisecond': return Math.floor(days * 24 * 60 * 60 * 1000) + this._milliseconds;
                    default: throw new Error('Unknown unit ' + units);
                }
            }
        },

        lang : moment.fn.lang,
        locale : moment.fn.locale,

        toIsoString : deprecate(
            'toIsoString() is deprecated. Please use toISOString() instead ' +
            '(notice the capitals)',
            function () {
                return this.toISOString();
            }
        ),

        toISOString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        },

        localeData : function () {
            return this._locale;
        },

        toJSON : function () {
            return this.toISOString();
        }
    });

    moment.duration.fn.toString = moment.duration.fn.toISOString;

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    for (i in unitMillisecondFactors) {
        if (hasOwnProp(unitMillisecondFactors, i)) {
            makeDurationGetter(i.toLowerCase());
        }
    }

    moment.duration.fn.asMilliseconds = function () {
        return this.as('ms');
    };
    moment.duration.fn.asSeconds = function () {
        return this.as('s');
    };
    moment.duration.fn.asMinutes = function () {
        return this.as('m');
    };
    moment.duration.fn.asHours = function () {
        return this.as('h');
    };
    moment.duration.fn.asDays = function () {
        return this.as('d');
    };
    moment.duration.fn.asWeeks = function () {
        return this.as('weeks');
    };
    moment.duration.fn.asMonths = function () {
        return this.as('M');
    };
    moment.duration.fn.asYears = function () {
        return this.as('y');
    };

    /************************************
        Default Locale
    ************************************/


    // Set default locale, other locale will inherit from English.
    moment.locale('en', {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LOCALES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    'Accessing Moment through the global scope is ' +
                    'deprecated, and will be removed in an upcoming ' +
                    'release.',
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === 'function' && define.amd) {
        define(function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],13:[function(require,module,exports){
// Middleware that injects the shared data and sharify script
module.exports = function(req, res, next) {

  // Clone the "constant" sharify data for the request so
  // request-level data isn't shared across the server potentially
  // exposing sensitive data.
  var data = {};
  for(var key in module.exports.data) {
    data[key] = module.exports.data[key];
  };

  // Inject a sharify object into locals for `= sharify.data` and `= sharify.script()`
  res.locals.sharify = {
    data: data,
    script: function() {
      return '<script type="text/javascript">' +
               'window.__sharifyData = ' +
               //There are tricky rules about safely embedding JSON within HTML
               //see http://stackoverflow.com/a/4180424/266795
               JSON.stringify(data)
                 .replace(/</g, '\\u003c')
                 .replace(/-->/g, '--\\>')
                 .replace(/\u2028/g, '\\u2028')
                 .replace(/\u2029/g, '\\u2029') +
               ';</script>';
    }
  };

  // Alias the sharify short-hand for convience
  res.locals.sd = res.locals.sharify.data;

  next();
};

// The shared hash of data
module.exports.data = {};

// When required on the client via browserify, run this snippet that reads the
// sharify.script data and injects it into this module.
var bootstrapOnClient = module.exports.bootstrapOnClient = function() {
  if (typeof window != 'undefined' && window.__sharifyData) {
    module.exports.data = window.__sharifyData;
    // Conveniently expose globals so client-side templates can access
    // the `sd` and `sharify.data` just like the server.
    if (!window.sharify) window.sharify = module.exports;
    if (!window.sd) window.sd = window.__sharifyData;
  }
};
bootstrapOnClient();

},{}],14:[function(require,module,exports){
(function () {var io = module.exports;/*! Socket.IO.js build:0.8.6, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * IO namespace.
   *
   * @namespace
   */

  var io = exports;

  /**
   * Socket.IO version
   *
   * @api public
   */

  io.version = '0.8.6';

  /**
   * Protocol implemented.
   *
   * @api public
   */

  io.protocol = 1;

  /**
   * Available transports, these will be populated with the available transports
   *
   * @api public
   */

  io.transports = [];

  /**
   * Keep track of jsonp callbacks.
   *
   * @api private
   */

  io.j = [];

  /**
   * Keep track of our io.Sockets
   *
   * @api private
   */
  io.sockets = {};


  /**
   * Manages connections to hosts.
   *
   * @param {String} uri
   * @Param {Boolean} force creation of new socket (defaults to false)
   * @api public
   */

  io.connect = function (host, details) {
    var uri = io.util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = io.util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
    };

    io.util.merge(options, details);

    if (options['force new connection'] || !io.sockets[uuri]) {
      socket = new io.Socket(options);
    }

    if (!options['force new connection'] && socket) {
      io.sockets[uuri] = socket;
    }

    socket = socket || io.sockets[uuri];

    // if path is different from '' or /
    return socket.of(uri.path.length > 1 ? uri.path : '');
  };

})('object' === typeof module ? module.exports : (this.io = {}), this);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * Utilities namespace.
   *
   * @namespace
   */

  var util = exports.util = {};

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api public
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
               'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
               'anchor'];

  util.parseUri = function (str) {
    var m = re.exec(str || '')
      , uri = {}
      , i = 14;

    while (i--) {
      uri[parts[i]] = m[i] || '';
    }

    return uri;
  };

  /**
   * Produces a unique url that identifies a Socket.IO connection.
   *
   * @param {Object} uri
   * @api public
   */

  util.uniqueUri = function (uri) {
    var protocol = uri.protocol
      , host = uri.host
      , port = uri.port;

    if ('document' in global) {
      host = host || document.domain;
      port = port || (protocol == 'https'
        && document.location.protocol !== 'https:' ? 443 : document.location.port);
    } else {
      host = host || 'localhost';

      if (!port && protocol == 'https') {
        port = 443;
      }
    }

    return (protocol || 'http') + '://' + host + ':' + (port || 80);
  };

  /**
   * Mergest 2 query strings in to once unique query string
   *
   * @param {String} base
   * @param {String} addition
   * @api public
   */

  util.query = function (base, addition) {
    var query = util.chunkQuery(base || '')
      , components = [];

    util.merge(query, util.chunkQuery(addition || ''));
    for (var part in query) {
      if (query.hasOwnProperty(part)) {
        components.push(part + '=' + query[part]);
      }
    }

    return components.length ? '?' + components.join('&') : '';
  };

  /**
   * Transforms a querystring in to an object
   *
   * @param {String} qs
   * @api public
   */

  util.chunkQuery = function (qs) {
    var query = {}
      , params = qs.split('&')
      , i = 0
      , l = params.length
      , kv;

    for (; i < l; ++i) {
      kv = params[i].split('=');
      if (kv[0]) {
        query[kv[0]] = decodeURIComponent(kv[1]);
      }
    }

    return query;
  };

  /**
   * Executes the given function when the page is loaded.
   *
   *     io.util.load(function () { console.log('page loaded'); });
   *
   * @param {Function} fn
   * @api public
   */

  var pageLoaded = false;

  util.load = function (fn) {
    if ('document' in global && document.readyState === 'complete' || pageLoaded) {
      return fn();
    }

    util.on(global, 'load', fn, false);
  };

  /**
   * Adds an event.
   *
   * @api private
   */

  util.on = function (element, event, fn, capture) {
    if (element.attachEvent) {
      element.attachEvent('on' + event, fn);
    } else if (element.addEventListener) {
      element.addEventListener(event, fn, capture);
    }
  };

  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
   * @api private
   */

  util.request = function (xdomain) {

    if (xdomain && 'undefined' != typeof XDomainRequest) {
      return new XDomainRequest();
    }

    if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest();
    }

    if (!xdomain) {
      try {
        return new ActiveXObject('Microsoft.XMLHTTP');
      } catch(e) { }
    }

    return null;
  };

  /**
   * XHR based transport constructor.
   *
   * @constructor
   * @api public
   */

  /**
   * Change the internal pageLoaded value.
   */

  if ('undefined' != typeof window) {
    util.load(function () {
      pageLoaded = true;
    });
  }

  /**
   * Defers a function to ensure a spinner is not displayed by the browser
   *
   * @param {Function} fn
   * @api public
   */

  util.defer = function (fn) {
    if (!util.ua.webkit || 'undefined' != typeof importScripts) {
      return fn();
    }

    util.load(function () {
      setTimeout(fn, 100);
    });
  };

  /**
   * Merges two objects.
   *
   * @api public
   */
  
  util.merge = function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep == 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          util.merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  };

  /**
   * Merges prototypes from objects
   *
   * @api public
   */
  
  util.mixin = function (ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype);
  };

  /**
   * Shortcut for prototypical and static inheritance.
   *
   * @api private
   */

  util.inherit = function (ctor, ctor2) {
    function f() {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  };

  /**
   * Checks if the given object is an Array.
   *
   *     io.util.isArray([]); // true
   *     io.util.isArray({}); // false
   *
   * @param Object obj
   * @api public
   */

  util.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Intersects values of two arrays into a third
   *
   * @api public
   */

  util.intersect = function (arr, arr2) {
    var ret = []
      , longest = arr.length > arr2.length ? arr : arr2
      , shortest = arr.length > arr2.length ? arr2 : arr;

    for (var i = 0, l = shortest.length; i < l; i++) {
      if (~util.indexOf(longest, shortest[i]))
        ret.push(shortest[i]);
    }

    return ret;
  }

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  util.indexOf = function (arr, o, i) {
    if (Array.prototype.indexOf) {
      return Array.prototype.indexOf.call(arr, o, i);
    }

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0; 
         i < j && arr[i] !== o; i++) {}

    return j <= i ? -1 : i;
  };

  /**
   * Converts enumerables to array.
   *
   * @api public
   */

  util.toArray = function (enu) {
    var arr = [];

    for (var i = 0, l = enu.length; i < l; i++)
      arr.push(enu[i]);

    return arr;
  };

  /**
   * UA / engines detection namespace.
   *
   * @namespace
   */

  util.ua = {};

  /**
   * Whether the UA supports CORS for XHR.
   *
   * @api public
   */

  util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
    try {
      var a = new XMLHttpRequest();
    } catch (e) {
      return false;
    }

    return a.withCredentials != undefined;
  })();

  /**
   * Detect webkit.
   *
   * @api public
   */

  util.ua.webkit = 'undefined' != typeof navigator
    && /webkit/i.test(navigator.userAgent);

})('undefined' != typeof io ? io : module.exports, this);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.EventEmitter = EventEmitter;

  /**
   * Event emitter constructor.
   *
   * @api public.
   */

  function EventEmitter () {};

  /**
   * Adds a listener
   *
   * @api public
   */

  EventEmitter.prototype.on = function (name, fn) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = fn;
    } else if (io.util.isArray(this.$events[name])) {
      this.$events[name].push(fn);
    } else {
      this.$events[name] = [this.$events[name], fn];
    }

    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Adds a volatile listener.
   *
   * @api public
   */

  EventEmitter.prototype.once = function (name, fn) {
    var self = this;

    function on () {
      self.removeListener(name, on);
      fn.apply(this, arguments);
    };

    on.listener = fn;
    this.on(name, on);

    return this;
  };

  /**
   * Removes a listener.
   *
   * @api public
   */

  EventEmitter.prototype.removeListener = function (name, fn) {
    if (this.$events && this.$events[name]) {
      var list = this.$events[name];

      if (io.util.isArray(list)) {
        var pos = -1;

        for (var i = 0, l = list.length; i < l; i++) {
          if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
            pos = i;
            break;
          }
        }

        if (pos < 0) {
          return this;
        }

        list.splice(pos, 1);

        if (!list.length) {
          delete this.$events[name];
        }
      } else if (list === fn || (list.listener && list.listener === fn)) {
        delete this.$events[name];
      }
    }

    return this;
  };

  /**
   * Removes all listeners for an event.
   *
   * @api public
   */

  EventEmitter.prototype.removeAllListeners = function (name) {
    // TODO: enable this when node 0.5 is stable
    //if (name === undefined) {
      //this.$events = {};
      //return this;
    //}

    if (this.$events && this.$events[name]) {
      this.$events[name] = null;
    }

    return this;
  };

  /**
   * Gets all listeners for a certain event.
   *
   * @api publci
   */

  EventEmitter.prototype.listeners = function (name) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = [];
    }

    if (!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]];
    }

    return this.$events[name];
  };

  /**
   * Emits an event.
   *
   * @api public
   */

  EventEmitter.prototype.emit = function (name) {
    if (!this.$events) {
      return false;
    }

    var handler = this.$events[name];

    if (!handler) {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    if ('function' == typeof handler) {
      handler.apply(this, args);
    } else if (io.util.isArray(handler)) {
      var listeners = handler.slice();

      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }

    return true;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Based on JSON2 (http://www.JSON.org/js.html).
 */

(function (exports, nativeJSON) {
  "use strict";

  // use native JSON if it's available
  if (nativeJSON && nativeJSON.parse){
    return exports.JSON = {
      parse: nativeJSON.parse
    , stringify: nativeJSON.stringify
    }
  }

  var JSON = exports.JSON = {};

  function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
  }

  function date(d, key) {
    return isFinite(d.valueOf()) ?
        d.getUTCFullYear()     + '-' +
        f(d.getUTCMonth() + 1) + '-' +
        f(d.getUTCDate())      + 'T' +
        f(d.getUTCHours())     + ':' +
        f(d.getUTCMinutes())   + ':' +
        f(d.getUTCSeconds())   + 'Z' : null;
  };

  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {    // table of character substitutions
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"' : '\\"',
          '\\': '\\\\'
      },
      rep;


  function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
          var c = meta[a];
          return typeof c === 'string' ? c :
              '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
  }


  function str(key, holder) {

// Produce a string from holder[key].

      var i,          // The loop counter.
          k,          // The member key.
          v,          // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

      if (value instanceof Date) {
          value = date(key);
      }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

      if (typeof rep === 'function') {
          value = rep.call(holder, key, value);
      }

// What happens next depends on the value's type.

      switch (typeof value) {
      case 'string':
          return quote(value);

      case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

          return isFinite(value) ? String(value) : 'null';

      case 'boolean':
      case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

          return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

      case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

          if (!value) {
              return 'null';
          }

// Make an array to hold the partial results of stringifying this object value.

          gap += indent;
          partial = [];

// Is the value an array?

          if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

              length = value.length;
              for (i = 0; i < length; i += 1) {
                  partial[i] = str(i, value) || 'null';
              }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

              v = partial.length === 0 ? '[]' : gap ?
                  '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                  '[' + partial.join(',') + ']';
              gap = mind;
              return v;
          }

// If the replacer is an array, use it to select the members to be stringified.

          if (rep && typeof rep === 'object') {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                  if (typeof rep[i] === 'string') {
                      k = rep[i];
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          } else {

// Otherwise, iterate through all of the keys in the object.

              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

          v = partial.length === 0 ? '{}' : gap ?
              '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
              '{' + partial.join(',') + '}';
          gap = mind;
          return v;
      }
  }

// If the JSON object does not yet have a stringify method, give it one.

  JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

      var i;
      gap = '';
      indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

      if (typeof space === 'number') {
          for (i = 0; i < space; i += 1) {
              indent += ' ';
          }

// If the space parameter is a string, it will be used as the indent string.

      } else if (typeof space === 'string') {
          indent = space;
      }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

      rep = replacer;
      if (replacer && typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
              typeof replacer.length !== 'number')) {
          throw new Error('JSON.stringify');
      }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

      return str('', {'': value});
  };

// If the JSON object does not yet have a parse method, give it one.

  JSON.parse = function (text, reviver) {
  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

      var j;

      function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

          var k, v, value = holder[key];
          if (value && typeof value === 'object') {
              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = walk(value, k);
                      if (v !== undefined) {
                          value[k] = v;
                      } else {
                          delete value[k];
                      }
                  }
              }
          }
          return reviver.call(holder, key, value);
      }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

      text = String(text);
      cx.lastIndex = 0;
      if (cx.test(text)) {
          text = text.replace(cx, function (a) {
              return '\\u' +
                  ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          });
      }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

      if (/^[\],:{}\s]*$/
              .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                  .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                  .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

          j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

          return typeof reviver === 'function' ?
              walk({'': j}, '') : j;
      }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

      throw new SyntaxError('JSON.parse');
  };

})(
    'undefined' != typeof io ? io : module.exports
  , typeof JSON !== 'undefined' ? JSON : undefined
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Parser namespace.
   *
   * @namespace
   */

  var parser = exports.parser = {};

  /**
   * Packet types.
   */

  var packets = parser.packets = [
      'disconnect'
    , 'connect'
    , 'heartbeat'
    , 'message'
    , 'json'
    , 'event'
    , 'ack'
    , 'error'
    , 'noop'
  ];

  /**
   * Errors reasons.
   */

  var reasons = parser.reasons = [
      'transport not supported'
    , 'client not handshaken'
    , 'unauthorized'
  ];

  /**
   * Errors advice.
   */

  var advice = parser.advice = [
      'reconnect'
  ];

  /**
   * Shortcuts.
   */

  var JSON = io.JSON
    , indexOf = io.util.indexOf;

  /**
   * Encodes a packet.
   *
   * @api private
   */

  parser.encodePacket = function (packet) {
    var type = indexOf(packets, packet.type)
      , id = packet.id || ''
      , endpoint = packet.endpoint || ''
      , ack = packet.ack
      , data = null;

    switch (packet.type) {
      case 'error':
        var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
          , adv = packet.advice ? indexOf(advice, packet.advice) : '';

        if (reason !== '' || adv !== '')
          data = reason + (adv !== '' ? ('+' + adv) : '');

        break;

      case 'message':
        if (packet.data !== '')
          data = packet.data;
        break;

      case 'event':
        var ev = { name: packet.name };

        if (packet.args && packet.args.length) {
          ev.args = packet.args;
        }

        data = JSON.stringify(ev);
        break;

      case 'json':
        data = JSON.stringify(packet.data);
        break;

      case 'connect':
        if (packet.qs)
          data = packet.qs;
        break;

      case 'ack':
        data = packet.ackId
          + (packet.args && packet.args.length
              ? '+' + JSON.stringify(packet.args) : '');
        break;
    }

    // construct packet with required fragments
    var encoded = [
        type
      , id + (ack == 'data' ? '+' : '')
      , endpoint
    ];

    // data fragment is optional
    if (data !== null && data !== undefined)
      encoded.push(data);

    return encoded.join(':');
  };

  /**
   * Encodes multiple messages (payload).
   *
   * @param {Array} messages
   * @api private
   */

  parser.encodePayload = function (packets) {
    var decoded = '';

    if (packets.length == 1)
      return packets[0];

    for (var i = 0, l = packets.length; i < l; i++) {
      var packet = packets[i];
      decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
    }

    return decoded;
  };

  /**
   * Decodes a packet
   *
   * @api private
   */

  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

  parser.decodePacket = function (data) {
    var pieces = data.match(regexp);

    if (!pieces) return {};

    var id = pieces[2] || ''
      , data = pieces[5] || ''
      , packet = {
            type: packets[pieces[1]]
          , endpoint: pieces[4] || ''
        };

    // whether we need to acknowledge the packet
    if (id) {
      packet.id = id;
      if (pieces[3])
        packet.ack = 'data';
      else
        packet.ack = true;
    }

    // handle different packet types
    switch (packet.type) {
      case 'error':
        var pieces = data.split('+');
        packet.reason = reasons[pieces[0]] || '';
        packet.advice = advice[pieces[1]] || '';
        break;

      case 'message':
        packet.data = data || '';
        break;

      case 'event':
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args;
        } catch (e) { }

        packet.args = packet.args || [];
        break;

      case 'json':
        try {
          packet.data = JSON.parse(data);
        } catch (e) { }
        break;

      case 'connect':
        packet.qs = data || '';
        break;

      case 'ack':
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if (pieces) {
          packet.ackId = pieces[1];
          packet.args = [];

          if (pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
            } catch (e) { }
          }
        }
        break;

      case 'disconnect':
      case 'heartbeat':
        break;
    };

    return packet;
  };

  /**
   * Decodes data payload. Detects multiple messages
   *
   * @return {Array} messages
   * @api public
   */

  parser.decodePayload = function (data) {
    // IE doesn't like data[i] for unicode chars, charAt works fine
    if (data.charAt(0) == '\ufffd') {
      var ret = [];

      for (var i = 1, length = ''; i < data.length; i++) {
        if (data.charAt(i) == '\ufffd') {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = '';
        } else {
          length += data.charAt(i);
        }
      }

      return ret;
    } else {
      return [parser.decodePacket(data)];
    }
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Transport = Transport;

  /**
   * This is the transport template for all supported transport methods.
   *
   * @constructor
   * @api public
   */

  function Transport (socket, sessid) {
    this.socket = socket;
    this.sessid = sessid;
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Transport, io.EventEmitter);

  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */

  Transport.prototype.onData = function (data) {
    this.clearCloseTimeout();
    
    // If the connection in currently open (or in a reopening state) reset the close 
    // timeout since we have just received data. This check is necessary so
    // that we don't reset the timeout on an explicitly disconnected connection.
    if (this.connected || this.connecting || this.reconnecting) {
      this.setCloseTimeout();
    }

    if (data !== '') {
      // todo: we should only do decodePayload for xhr transports
      var msgs = io.parser.decodePayload(data);

      if (msgs && msgs.length) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.onPacket(msgs[i]);
        }
      }
    }

    return this;
  };

  /**
   * Handles packets.
   *
   * @api private
   */

  Transport.prototype.onPacket = function (packet) {
    if (packet.type == 'heartbeat') {
      return this.onHeartbeat();
    }

    if (packet.type == 'connect' && packet.endpoint == '') {
      this.onConnect();
    }

    this.socket.onPacket(packet);

    return this;
  };

  /**
   * Sets close timeout
   *
   * @api private
   */
  
  Transport.prototype.setCloseTimeout = function () {
    if (!this.closeTimeout) {
      var self = this;

      this.closeTimeout = setTimeout(function () {
        self.onDisconnect();
      }, this.socket.closeTimeout);
    }
  };

  /**
   * Called when transport disconnects.
   *
   * @api private
   */

  Transport.prototype.onDisconnect = function () {
    if (this.close && this.open) this.close();
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this;
  };

  /**
   * Called when transport connects
   *
   * @api private
   */

  Transport.prototype.onConnect = function () {
    this.socket.onConnect();
    return this;
  }

  /**
   * Clears close timeout
   *
   * @api private
   */

  Transport.prototype.clearCloseTimeout = function () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  };

  /**
   * Clear timeouts
   *
   * @api private
   */

  Transport.prototype.clearTimeouts = function () {
    this.clearCloseTimeout();

    if (this.reopenTimeout) {
      clearTimeout(this.reopenTimeout);
    }
  };

  /**
   * Sends a packet
   *
   * @param {Object} packet object.
   * @api private
   */

  Transport.prototype.packet = function (packet) {
    this.send(io.parser.encodePacket(packet));
  };

  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */

  Transport.prototype.onHeartbeat = function (heartbeat) {
    this.packet({ type: 'heartbeat' });
  };
 
  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.open = true;
    this.clearCloseTimeout();
    this.socket.onOpen();
  };

  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    var self = this;

    /* FIXME: reopen delay causing a infinit loop
    this.reopenTimeout = setTimeout(function () {
      self.open();
    }, this.socket.options['reopen delay']);*/

    this.open = false;
    this.socket.onClose();
    this.onDisconnect();
  };

  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */

  Transport.prototype.prepareUrl = function () {
    var options = this.socket.options;

    return this.scheme() + '://'
      + options.host + ':' + options.port + '/'
      + options.resource + '/' + io.protocol
      + '/' + this.name + '/' + this.sessid;
  };

  /**
   * Checks if the transport is ready to start a connection.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Transport.prototype.ready = function (socket, fn) {
    fn.call(this);
  };
})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'connect timeout': 10000
      , 'try multiple transports': true
      , 'reconnect': true
      , 'reconnection delay': 500
      , 'reconnection limit': Infinity
      , 'reopen delay': 3000
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': true
      , 'auto connect': true
      , 'flash policy port': 10843
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;

      io.util.on(global, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].packet({ type: 'connect' });
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      if (data instanceof Error) {
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('script');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else {
            !self.reconnecting && self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck())) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server.
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function (fn) {
    if (this.connecting) {
      return this;
    }

    var self = this;

    this.handshake(function (sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      self.transports = io.util.intersect(
          transports.split(',')
        , self.options.transports
      );

      function connect (transports){
        if (self.transport) self.transport.clearTimeouts();

        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  if (!self.remainingTransports) {
                    self.remainingTransports = self.transports.slice(0);
                  }

                  var remaining = self.remainingTransports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect();

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      this.transport.payload(this.buffer);
      this.buffer = [];
    }
  };

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request()
      , uri = this.resource + '/' + io.protocol + '/' + this.sessionid;

    xhr.open('GET', uri, true);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname 
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;
      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }
      this.emit('connect');
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && this.connected) {
        this.disconnect();
        this.reconnect();
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected) {
      this.transport.close();
      this.transport.clearTimeouts();
      this.publish('disconnect', reason);

      if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
        this.reconnect();
      }
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options['reconnection delay'];

    var self = this
      , maxAttempts = this.options['max reconnection attempts']
      , tryMultiple = this.options['try multiple transports']
      , limit = this.options['reconnection limit'];

    function reset () {
      if (self.connected) {
        for (var i in self.namespaces) {
          if (self.namespaces.hasOwnProperty(i) && '' !== i) {
              self.namespaces[i].packet({ type: 'connect' });
          }
        }
        self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
      }

      self.removeListener('connect_failed', maybeReconnect);
      self.removeListener('connect', maybeReconnect);

      self.reconnecting = false;

      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;

      self.options['try multiple transports'] = tryMultiple;
    };

    function maybeReconnect () {
      if (!self.reconnecting) {
        return;
      }

      if (self.connected) {
        return reset();
      };

      if (self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
      }

      if (self.reconnectionAttempts++ >= maxAttempts) {
        if (!self.redoTransports) {
          self.on('connect_failed', maybeReconnect);
          self.options['try multiple transports'] = true;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect();
        } else {
          self.publish('reconnect_failed');
          reset();
        }
      } else {
        if (self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2; // exponential back off
        }

        self.connect();
        self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
      }
    };

    this.options['try multiple transports'] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

    this.on('connect', maybeReconnect);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.SocketNamespace = SocketNamespace;

  /**
   * Socket namespace constructor.
   *
   * @constructor
   * @api public
   */

  function SocketNamespace (socket, name) {
    this.socket = socket;
    this.name = name || '';
    this.flags = {};
    this.json = new Flag(this, 'json');
    this.ackPackets = 0;
    this.acks = {};
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(SocketNamespace, io.EventEmitter);

  /**
   * Copies emit since we override it
   *
   * @api private
   */

  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

  /**
   * Creates a new namespace, by proxying the request to the socket. This
   * allows us to use the synax as we do on the server.
   *
   * @api public
   */

  SocketNamespace.prototype.of = function () {
    return this.socket.of.apply(this.socket, arguments);
  };

  /**
   * Sends a packet.
   *
   * @api private
   */

  SocketNamespace.prototype.packet = function (packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this;
  };

  /**
   * Sends a message
   *
   * @api public
   */

  SocketNamespace.prototype.send = function (data, fn) {
    var packet = {
        type: this.flags.json ? 'json' : 'message'
      , data: data
    };

    if ('function' == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn;
    }

    return this.packet(packet);
  };

  /**
   * Emits an event
   *
   * @api public
   */
  
  SocketNamespace.prototype.emit = function (name) {
    var args = Array.prototype.slice.call(arguments, 1)
      , lastArg = args[args.length - 1]
      , packet = {
            type: 'event'
          , name: name
        };

    if ('function' == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = 'data';
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1);
    }

    packet.args = args;

    return this.packet(packet);
  };

  /**
   * Disconnects the namespace
   *
   * @api private
   */

  SocketNamespace.prototype.disconnect = function () {
    if (this.name === '') {
      this.socket.disconnect();
    } else {
      this.packet({ type: 'disconnect' });
      this.$emit('disconnect');
    }

    return this;
  };

  /**
   * Handles a packet
   *
   * @api private
   */

  SocketNamespace.prototype.onPacket = function (packet) {
    var self = this;

    function ack () {
      self.packet({
          type: 'ack'
        , args: io.util.toArray(arguments)
        , ackId: packet.id
      });
    };

    switch (packet.type) {
      case 'connect':
        this.$emit('connect');
        break;

      case 'disconnect':
        if (this.name === '') {
          this.socket.onDisconnect(packet.reason || 'booted');
        } else {
          this.$emit('disconnect', packet.reason);
        }
        break;

      case 'message':
      case 'json':
        var params = ['message', packet.data];

        if (packet.ack == 'data') {
          params.push(ack);
        } else if (packet.ack) {
          this.packet({ type: 'ack', ackId: packet.id });
        }

        this.$emit.apply(this, params);
        break;

      case 'event':
        var params = [packet.name].concat(packet.args);

        if (packet.ack == 'data')
          params.push(ack);

        this.$emit.apply(this, params);
        break;

      case 'ack':
        if (this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId];
        }
        break;

      case 'error':
        if (packet.advice){
          this.socket.onError(packet);
        } else {
          if (packet.reason == 'unauthorized') {
            this.$emit('connect_failed', packet.reason);
          } else {
            this.$emit('error', packet.reason);
          }
        }
        break;
    }
  };

  /**
   * Flag interface.
   *
   * @api private
   */

  function Flag (nsp, name) {
    this.namespace = nsp;
    this.name = name;
  };

  /**
   * Send a message
   *
   * @api public
   */

  Flag.prototype.send = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments);
  };

  /**
   * Emit an event
   *
   * @api public
   */

  Flag.prototype.emit = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.websocket = WS;

  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an
   * persistent connection with the Socket.IO server. This transport will also
   * be inherited by the FlashSocket fallback as it provides a API compatible
   * polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */

  function WS (socket) {
    io.Transport.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(WS, io.Transport);

  /**
   * Transport name
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.open = function () {
    var query = io.util.query(this.socket.options.query)
      , self = this
      , Socket


    if (!Socket) {
      Socket = global.MozWebSocket || global.WebSocket;
    }

    this.websocket = new Socket(this.prepareUrl() + query);

    this.websocket.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.websocket.onmessage = function (ev) {
      self.onData(ev.data);
    };
    this.websocket.onclose = function () {
      self.onClose();
      self.socket.setBuffer(true);
    };
    this.websocket.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Send a message to the Socket.IO server. The message will automatically be
   * encoded in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.send = function (data) {
    this.websocket.send(data);
    return this;
  };

  /**
   * Payload
   *
   * @api private
   */

  WS.prototype.payload = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
      this.packet(arr[i]);
    }
    return this;
  };

  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.close = function () {
    this.websocket.close();
    return this;
  };

  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  WS.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Returns the appropriate scheme for the URI generation.
   *
   * @api private
   */
  WS.prototype.scheme = function () {
    return this.socket.options.secure ? 'wss' : 'ws';
  };

  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */

  WS.check = function () {
    return ('WebSocket' in global && !('__addTask' in WebSocket))
          || 'MozWebSocket' in global;
  };

  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  WS.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('websocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.flashsocket = Flashsocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
   * specification. It uses a .swf file to communicate with the server. If you want
   * to serve the .swf file from a other server than where the Socket.IO script is
   * coming from you need to use the insecure version of the .swf. More information
   * about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function Flashsocket () {
    io.Transport.websocket.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(Flashsocket, io.Transport.websocket);

  /**
   * Transport name
   *
   * @api public
   */

  Flashsocket.prototype.name = 'flashsocket';

  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a 
   * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.open = function () {
    var self = this
      , args = arguments;

    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.open.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.send = function () {
    var self = this, args = arguments;
    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };

  /**
   * Disconnects the established `FlashSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.close = function () {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this;
  };

  /**
   * The WebSocket fall back needs to append the flash container to the body
   * element, so we need to make sure we have access to it. Or defer the call
   * until we are sure there is a body element.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Flashsocket.prototype.ready = function (socket, fn) {
    function init () {
      var options = socket.options
        , port = options['flash policy port']
        , path = [
              'http' + (options.secure ? 's' : '') + ':/'
            , options.host + ':' + options.port
            , options.resource
            , 'static/flashsocket'
            , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
          ];

      // Only start downloading the swf file when the checked that this browser
      // actually supports it
      if (!Flashsocket.loaded) {
        if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
          // Set the correct file based on the XDomain settings
          WEB_SOCKET_SWF_LOCATION = path.join('/');
        }

        if (port !== 843) {
          WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
        }

        WebSocket.__initialize();
        Flashsocket.loaded = true;
      }

      fn.call(self);
    }

    var self = this;
    if (document.body) return init();

    io.util.load(init);
  };

  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe
   * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
   * the polyfill is correctly loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.check = function () {
    if (
        typeof WebSocket == 'undefined'
      || !('__initialize' in WebSocket) || !swfobject
    ) return false;

    return swfobject.getFlashPlayerVersion().major >= 10;
  };

  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin 
   * transport. Because we can't see which type (secure or insecure) of .swf is used
   * we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.xdomainCheck = function () {
    return true;
  };

  /**
   * Disable AUTO_INITIALIZATION
   */

  if (typeof window != 'undefined') {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
  }

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');
})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
if ('undefined' != typeof window) {
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
}
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if ('undefined' == typeof window || window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   *
   * @api public
   */
  
  exports.XHR = XHR;

  /**
   * XHR constructor
   *
   * @costructor
   * @api public
   */

  function XHR (socket) {
    if (!socket) return;

    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(XHR, io.Transport);

  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.open = function () {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();

    // we need to make sure the request succeeds since we have no indication
    // whether the request opened or not until it succeeded.
    this.setCloseTimeout();

    return this;
  };

  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our
   * buffer we encode it and forward it to the `post` method.
   *
   * @api private
   */

  XHR.prototype.payload = function (payload) {
    var msgs = [];

    for (var i = 0, l = payload.length; i < l; i++) {
      msgs.push(io.parser.encodePacket(payload[i]));
    }

    this.send(io.parser.encodePayload(msgs));
  };

  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.send = function (data) {
    this.post(data);
    return this;
  };

  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  function empty () { };

  XHR.prototype.post = function (data) {
    var self = this;
    this.socket.setBuffer(true);

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;

        if (this.status == 200){
          self.socket.setBuffer(false);
        } else {
          self.onClose();
        }
      }
    }

    function onload () {
      this.onload = empty;
      self.socket.setBuffer(false);
    };

    this.sendXHR = this.request('POST');

    if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload;
    } else {
      this.sendXHR.onreadystatechange = stateChange;
    }

    this.sendXHR.send(data);
  };

  /**
   * Disconnects the established `XHR` connection.
   *
   * @returns {Transport} 
   * @api public
   */

  XHR.prototype.close = function () {
    this.onClose();
    return this;
  };

  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @returns {XMLHttpRequest}
   * @api private
   */

  XHR.prototype.request = function (method) {
    var req = io.util.request(this.socket.isXDomain())
      , query = io.util.query(this.socket.options.query, 't=' + +new Date);

    req.open(method || 'GET', this.prepareUrl() + query, true);

    if (method == 'POST') {
      try {
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        } else {
          // XDomainRequest
          req.contentType = 'text/plain';
        }
      } catch (e) {}
    }

    return req;
  };

  /**
   * Returns the scheme to use for the transport URLs.
   *
   * @api private
   */

  XHR.prototype.scheme = function () {
    return this.socket.options.secure ? 'https' : 'http';
  };

  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */

  XHR.check = function (socket, xdomain) {
    try {
      if (io.util.request(xdomain)) {
        return true;
      }
    } catch(e) {}

    return false;
  };

  /**
   * Check if the XHR transport supports corss domain requests.
   * 
   * @returns {Boolean}
   * @api public
   */

  XHR.xdomainCheck = function () {
    return XHR.check(null, true);
  };

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.htmlfile = HTMLFile;

  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function HTMLFile (socket) {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(HTMLFile, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  HTMLFile.prototype.name = 'htmlfile';

  /**
   * Creates a new ActiveX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */

  HTMLFile.prototype.get = function () {
    this.doc = new ActiveXObject('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.close();
    this.doc.parentWindow.s = this;

    var iframeC = this.doc.createElement('div');
    iframeC.className = 'socketio';

    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');

    iframeC.appendChild(this.iframe);

    var self = this
      , query = io.util.query(this.socket.options.query, 't='+ +new Date);

    this.iframe.src = this.prepareUrl() + query;

    io.util.on(window, 'unload', function () {
      self.destroy();
    });
  };

  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */

  HTMLFile.prototype._ = function (data, doc) {
    this.onData(data);
    try {
      var script = doc.getElementsByTagName('script')[0];
      script.parentNode.removeChild(script);
    } catch (e) { }
  };

  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */

  HTMLFile.prototype.destroy = function () {
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}

      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;

      CollectGarbage();
    }
  };

  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  HTMLFile.prototype.close = function () {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this);
  };

  /**
   * Checks if the browser supports this transport. The browser
   * must have an `ActiveXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */

  HTMLFile.check = function () {
    if ('ActiveXObject' in window){
      try {
        var a = new ActiveXObject('htmlfile');
        return a && io.Transport.XHR.check();
      } catch(e){}
    }
    return false;
  };

  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */

  HTMLFile.xdomainCheck = function () {
    // we can probably do handling for sub-domains, we should
    // test that it's cross domain but a subdomain here
    return false;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('htmlfile');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['xhr-polling'] = XHRPolling;

  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRPolling () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRPolling, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(XHRPolling, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  XHRPolling.prototype.name = 'xhr-polling';

  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  XHRPolling.prototype.open = function () {
    var self = this;

    io.Transport.XHR.prototype.open.call(self);
    return false;
  };

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  function empty () {};

  XHRPolling.prototype.get = function () {
    if (!this.open) return;

    var self = this;

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;

        if (this.status == 200) {
          self.onData(this.responseText);
          self.get();
        } else {
          self.onClose();
        }
      }
    };

    function onload () {
      this.onload = empty;
      self.onData(this.responseText);
      self.get();
    };

    this.xhr = this.request();

    if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = this.xhr.onerror = onload;
    } else {
      this.xhr.onreadystatechange = stateChange;
    }

    this.xhr.send(null);
  };

  /**
   * Handle the unclean close behavior.
   *
   * @api private
   */

  XHRPolling.prototype.onClose = function () {
    io.Transport.XHR.prototype.onClose.call(this);

    if (this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
  };

  /**
   * Webkit based browsers show a infinit spinner when you start a XHR request
   * before the browsers onload event is called so we need to defer opening of
   * the transport until the onload event is called. Wrapping the cb in our
   * defer method solve this.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  XHRPolling.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {
  /**
   * There is a way to hide the loading indicator in Firefox. If you create and
   * remove a iframe it will stop showing the current loading indicator.
   * Unfortunately we can't feature detect that and UA sniffing is evil.
   *
   * @api private
   */

  var indicator = global.document && "MozAppearance" in
    global.document.documentElement.style;

  /**
   * Expose constructor.
   */

  exports['jsonp-polling'] = JSONPPolling;

  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */

  function JSONPPolling (socket) {
    io.Transport['xhr-polling'].apply(this, arguments);

    this.index = io.j.length;

    var self = this;

    io.j.push(function (msg) {
      self._(msg);
    });
  };

  /**
   * Inherits from XHR polling transport.
   */

  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

  /**
   * Transport name
   *
   * @api public
   */

  JSONPPolling.prototype.name = 'jsonp-polling';

  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  JSONPPolling.prototype.post = function (data) {
    var self = this
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (!this.form) {
      var form = document.createElement('form')
        , area = document.createElement('textarea')
        , id = this.iframeId = 'socketio_iframe_' + this.index
        , iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '-1000px';
      form.style.left = '-1000px';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.prepareUrl() + query;

    function complete () {
      initIframe();
      self.socket.setBuffer(false);
    };

    function initIframe () {
      if (self.iframe) {
        self.form.removeChild(self.iframe);
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    };

    initIframe();

    // we temporarily stringify until we figure out how to prevent
    // browsers from turning `\n` into `\r\n` in form inputs
    this.area.value = io.JSON.stringify(data);

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      iframe.onreadystatechange = function () {
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }

    this.socket.setBuffer(true);
  };
  
  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */

  JSONPPolling.prototype.get = function () {
    var self = this
      , script = document.createElement('script')
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function () {
      self.onClose();
    };

    var insertAt = document.getElementsByTagName('script')[0]
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;

    if (indicator) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @api private
   */

  JSONPPolling.prototype._ = function (msg) {
    this.onData(msg);
    if (this.open) {
      this.get();
    }
    return this;
  };

  /**
   * The indicator hack only works after onload
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  JSONPPolling.prototype.ready = function (socket, fn) {
    var self = this;
    if (!indicator) return fn.call(this);

    io.util.load(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  JSONPPolling.check = function () {
    return 'document' in global;
  };

  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */

  JSONPPolling.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('jsonp-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
}).call(window)
},{}],15:[function(require,module,exports){
//     Underscore.js 1.7.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.7.0';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var createCallback = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  _.iteratee = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return createCallback(value, context, argCount);
    if (_.isObject(value)) return _.matches(value);
    return _.property(value);
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    if (obj == null) return obj;
    iteratee = createCallback(iteratee, context);
    var i, length = obj.length;
    if (length === +length) {
      for (i = 0; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    if (obj == null) return [];
    iteratee = _.iteratee(iteratee, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length),
        currentKey;
    for (var index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index = 0, currentKey;
    if (arguments.length < 3) {
      if (!length) throw new TypeError(reduceError);
      memo = obj[keys ? keys[index++] : index++];
    }
    for (; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== + obj.length && _.keys(obj),
        index = (keys || obj).length,
        currentKey;
    if (arguments.length < 3) {
      if (!index) throw new TypeError(reduceError);
      memo = obj[keys ? keys[--index] : --index];
    }
    while (index--) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    predicate = _.iteratee(predicate, context);
    _.some(obj, function(value, index, list) {
      if (predicate(value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    predicate = _.iteratee(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(_.iteratee(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    if (obj == null) return true;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    if (obj == null) return false;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (obj.length !== +obj.length) obj = _.values(obj);
    return _.indexOf(obj, target) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = obj && obj.length === +obj.length ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = low + high >>> 1;
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return obj.length === +obj.length ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = _.iteratee(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    for (var i = 0, length = input.length; i < length; i++) {
      var value = input[i];
      if (!_.isArray(value) && !_.isArguments(value)) {
        if (!strict) output.push(value);
      } else if (shallow) {
        push.apply(output, value);
      } else {
        flatten(value, shallow, strict, output);
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = _.iteratee(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i];
      if (isSorted) {
        if (!i || seen !== value) result.push(value);
        seen = value;
      } else if (iteratee) {
        var computed = iteratee(value, i, array);
        if (_.indexOf(seen, computed) < 0) {
          seen.push(computed);
          result.push(value);
        }
      } else if (_.indexOf(result, value) < 0) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true, []));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(slice.call(arguments, 1), true, true, []);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function(array) {
    if (array == null) return [];
    var length = _.max(arguments, 'length').length;
    var results = Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var idx = array.length;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var Ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    args = slice.call(arguments, 2);
    bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      Ctor.prototype = func.prototype;
      var self = new Ctor;
      Ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (_.isObject(result)) return result;
      return self;
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = hasher ? hasher.apply(this, arguments) : key;
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed before being called N times.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      } else {
        func = null;
      }
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    if (!_.isObject(obj)) return obj;
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (hasOwnProperty.call(source, prop)) {
            obj[prop] = source[prop];
        }
      }
    }
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj, iteratee, context) {
    var result = {}, key;
    if (obj == null) return result;
    if (_.isFunction(iteratee)) {
      iteratee = createCallback(iteratee, context);
      for (key in obj) {
        var value = obj[key];
        if (iteratee(value, key, obj)) result[key] = value;
      }
    } else {
      var keys = concat.apply([], slice.call(arguments, 1));
      obj = new Object(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        if (key in obj) result[key] = obj[key];
      }
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    if (!_.isObject(obj)) return obj;
    for (var i = 1, length = arguments.length; i < length; i++) {
      var source = arguments[i];
      for (var prop in source) {
        if (obj[prop] === void 0) obj[prop] = source[prop];
      }
    }
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (
      aCtor !== bCtor &&
      // Handle Object.create(x) cases
      'constructor' in a && 'constructor' in b &&
      !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
        _.isFunction(bCtor) && bCtor instanceof bCtor)
    ) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size, result;
    // Recursively compare objects and arrays.
    if (className === '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size === b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      size = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      result = _.keys(b).length === size;
      if (result) {
        while (size--) {
          // Deep compare each member
          key = keys[size];
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around an IE 11 bug.
  if (typeof /./ !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    var pairs = _.pairs(attrs), length = pairs.length;
    return function(obj) {
      if (obj == null) return !length;
      obj = new Object(obj);
      for (var i = 0; i < length; i++) {
        var pair = pairs[i], key = pair[0];
        if (pair[1] !== obj[key] || !(key in obj)) return false;
      }
      return true;
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = createCallback(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? object[property]() : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}]},{},[5]);
