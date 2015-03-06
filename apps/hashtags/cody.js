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
    , jqb = require('jquery-bridget')
    , Backbone = require('backbone')
    , Isotope = require('isotope-layout')
    , Hashtags = require('../../collections/hashtag_items.js')
    , listTemplate = function() {
      return require('./templates/list.jade').apply(null, arguments)
    }
    , moment = require('moment')
    , view = null;



var clientTags = sd.hashtag.split('.');
var socketClients = [];
// clientTags.forEach(function(t){
  // console.log('connect',t);
  socketClients.push(
    io.connect(window.location.origin,  {
      multiplex: true,
      query: 'ns='+clientTags,
      resource: "socket.io"
    })
  );
// });

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
          , related:{
              hashtags: []
            , people: []
          }
          , history: {
              hashtags: []
            , people: []
          }
          , filter: {
            matching: []
          }
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

  , events: {
      "click a.updates-toggle": 'bindNewMediaToggle',
      "keydown": 'keyControls'
  }

  , keyControls: function(e) {
      var self = this;
      switch(e.keyCode) {
          case 32:
              // spacebar pressed
              console.log('spacebar');
              e.preventDefault();
              self.bindNewMediaToggle();
              return false;
              break;
      }   
  }

  , filter_setup: function(){

      var view_self = this;

      //open/close lateral filter
      $('.cd-filter-trigger').on('click', function(){
        triggerFilter(true);
      });
      $('.cd-filter .cd-close').on('click', function(){
        triggerFilter(false);
      });
      $('.cd-gallery').on('click', function(){
        triggerFilter(false);
      });

      function triggerFilter($bool) {
        var elementsToTrigger = $([$('.cd-filter-trigger'), $('.cd-filter'), $('.cd-tab-filter'), $('.cd-gallery')]);
        elementsToTrigger.each(function(){
          $(this).toggleClass('filter-is-visible', $bool);
        });
      }

      //mobile version - detect click event on filters tab
      var filter_tab_placeholder = $('.cd-tab-filter .placeholder a'),
        filter_tab_placeholder_default_value = 'Select',
        filter_tab_placeholder_text = filter_tab_placeholder.text();
      
      $('.cd-tab-filter li').on('click', function(event){
        //detect which tab filter item was selected
        var selected_filter = $(event.target).data('type');
          
        //check if user has clicked the placeholder item
        if( $(event.target).is(filter_tab_placeholder) ) {
          (filter_tab_placeholder_default_value == filter_tab_placeholder.text()) ? filter_tab_placeholder.text(filter_tab_placeholder_text) : filter_tab_placeholder.text(filter_tab_placeholder_default_value) ;
          $('.cd-tab-filter').toggleClass('is-open');

        //check if user has clicked a filter already selected 
        } else if( filter_tab_placeholder.data('type') == selected_filter ) {
          filter_tab_placeholder.text($(event.target).text());
          $('.cd-tab-filter').removeClass('is-open'); 

        } else {
          //close the dropdown and change placeholder text/data-type value
          $('.cd-tab-filter').removeClass('is-open');
          filter_tab_placeholder.text($(event.target).text()).data('type', selected_filter);
          filter_tab_placeholder_text = $(event.target).text();
          
          //add class selected to the selected filter item
          $('.cd-tab-filter .selected').removeClass('selected');
          $(event.target).addClass('selected');
        }
        });
        
        //close filter dropdown inside lateral .cd-filter 
        $('.cd-filter-block h4').on('click', function(){
          $(this).toggleClass('closed').siblings('.cd-filter-content').slideToggle(300);
        })

        //fix lateral filter and gallery on scrolling
        $(window).on('scroll', function(){
          (!window.requestAnimationFrame) ? fixGallery() : window.requestAnimationFrame(fixGallery);
        });

        function fixGallery() {
          var offsetTop = $('.cd-main-content').offset().top,
            scrollTop = $(window).scrollTop();
          ( scrollTop >= offsetTop ) ? $('.cd-main-content').addClass('is-fixed') : $('.cd-main-content').removeClass('is-fixed');
        }

        /************************************
          MitItUp filter settings
          More details: 
          https://mixitup.kunkalabs.com/
          or:
          http://codepen.io/patrickkunka/
        *************************************/
        /*****************************************************
          MixItUp - Define a single object literal 
          to contain all filter custom functionality
        *****************************************************/
        var buttonFilter = {
            // Declare any variables we will need as properties of the object
            $filters: null,
            groups: [],
            outputArray: [],
            outputString: '',
          
            // The "init" method will run on document ready and cache any jQuery objects we will need.
            init: function(){
              // As a best practice, in each method we will asign "this" to the variable 
              // "self" so that it remains scope-agnostic. 
              // We will use it to refer to the parent "buttonFilter" object so that we can 
              // share methods and properties between all parts of the object.
              var self = this; 
            
              self.$filters = $('.cd-main-content');
              self.$container = $('.cd-gallery ul');
            
              self.$filters.find('.cd-filters').each(function(){
                  var $this = $(this);
                
                self.groups.push({
                    $inputs: $this.find('.filter'),
                    active: '',
                    tracker: false
                });
              });
              
              self.bindHandlers();
            },
          
            // The "bindHandlers" method will listen for whenever a button is clicked. 
            bindHandlers: function(){
              var self = this;

              self.$filters.on('click', 'a', function(e){
                  self.parseFilters();
              });
              self.$filters.on('change', function(){
                self.parseFilters();           
              });
            },
          
            parseFilters: function(){
              var self = this;
           
              // loop through each filter group and grap the active filter from each one.
              for(var i = 0, group; group = self.groups[i]; i++){
                group.active = [];
                group.$inputs.each(function(){
                  var $this = $(this);
                  if($this.is('input[type="radio"]') || $this.is('input[type="checkbox"]')) {
                    if($this.is(':checked') ) {
                      group.active.push($this.attr('data-filter'));
                    }
                  } else if($this.is('select')){
                    group.active.push($this.val());
                  } else if( $this.find('.selected').length > 0 ) {
                    group.active.push($this.attr('data-filter'));
                  }
                });
                if( $('.cd-filter-content input[type=checkbox]:checked').length > 0 ) {
                  $('.filter-related-clear').css('display','block');
                }else{
                  $('.filter-related-clear').css('display','none');
                }
              }
              self.concatenate();
            },
          
            concatenate: function(){
              var self = this;
            
              self.outputString = ''; // Reset output string
            
              for(var i = 0, group; group = self.groups[i]; i++){
                  self.outputString += group.active;
              }
            
              // If the output string is empty, show all rather than none:    
              !self.outputString.length && (self.outputString = '*'); 
          
              // Send the output string to MixItUp via the 'filter' method:    
              // if(self.$container.mixItUp('isLoaded')){
                  view_self.wrapper.isotope({ filter: self.outputString });
                  // self.$container.mixItUp('filter', self.outputString);
              // }
            }
        };

        buttonFilter.init();
        // $('.cd-gallery ul').mixItUp({
        //     controls: {
        //       enable: false
        //     },
        //     callbacks: {
        //       onMixStart: function(){
        //         $('.cd-fail-message').fadeOut(200);
        //       },
        //         onMixFail: function(){
        //           $('.cd-fail-message').fadeIn(200);
        //       }
        //     }
        // });

        //search filtering
        //credits http://codepen.io/edprats/pen/pzAdg
        var inputText;
        // var $matching = $();

        var delay = (function(){
          var timer = 0;
          return function(callback, ms){
            clearTimeout (timer);
              timer = setTimeout(callback, ms);
          };
        })();

        $('.cd-main-content').on('click','.filter-related-clear',function(){
          $('.cd-filter-content input[type=checkbox]:checked').removeAttr('checked');
          buttonFilter.parseFilters();
        });
        $('#input-filter').on('submit',function(e){
          e.preventDefault();
        })
        $(".cd-filter-content input[type='search']").keyup(function(){
            // Delay function invoked to make sure user stopped typing
            delay(function(){
              inputText = $(".cd-filter-content input[type='search']").val().toLowerCase();
              inputText = inputText.replace(/#/g, '');

              // Check to see if input field is empty
              if ((inputText.length) > 0) {            
                  // #TODO add input search with buttons group and checkbox group filters
                  view_self.sceneSetting.data.filter.matching = inputText.toLowerCase();
                  view_self.wrapper.isotope({filter: '.'+view_self.sceneSetting.data.filter.matching});
              } else {
                  view_self.wrapper.isotope({filter: '*'});
              }
            }, 200 );
        });




  }

  , initialize: function() {
    _.bindAll(this,'render','render_viz','scene_setup','keyControls','bindNewMediaToggle');

    this.scene_setup();

    this.filter_setup();

    // this.scene = this.$("#demo").vs(this.sceneSetting).data('visualSedimentation')

    // this.isotope_setup();

    // this.render_viz();

    // this.search_setup();

    this.on('socket:parsed', this.socket_parsed, this);
    this.on('socket:error', this.socket_error, this);

    // this.collection.on('reset', this.render, this);
  }

  // , render: function() {
  //   console.log('actual render');
  //   this.$('#hashtag-items').html(listTemplate({ hashtags: this.collection.models }));
  // }

  , bindNewMediaToggle: function() { 
      this.wrapper.isotope('updateSortData').isotope();

      $('a.updates-toggle').toggleClass('hover');
       
      if($('.container').hasClass('paused')){
        $('.container').css('background','#222').css('background-opacity',1)
        $('.container').toggleClass('paused');
      }else{
        $('.container').toggleClass('paused');
      }

      this.newMediaToggle ? this.unbindNewMedia() : this.bindNewMedia();
  }
  , bindNewMedia: function() { 
      // $(document).bind("newMedia", this.onNewMedia);
      this.newMediaToggle = true;
  }
  , unbindNewMedia: function() { 
      // $(document).unbind("newMedia");
      this.newMediaToggle = false;
  }

  , onNewMedia: function(d){
      if( _.contains(clientTags, d.channelName ) && this.newMediaToggle){
        // #TODO ensure newMedia has no #ISSUE in filtering logic
        var newMedia = _.reject(d.media,function(m){
          return _.contains($('.element[data-uid]').map(function(){ return $(this).data('uid')}).get(),m.id);
        });

      var flat_tags;
      flat_tags = _.reduceRight(newMedia, function(a, b) { 
        return a.concat(b.tags); 
      }, []) 

      var flat_people;
      flat_people = _.reduceRight(newMedia, function(a, b) { 
        return a.concat(b.user); 
      }, []) 

      v.debug(d);
      v.debug(flat_people);

      this.sceneSetting.data.related.hashtags = _.union(this.sceneSetting.data.related.hashtags,flat_tags);
      this.sceneSetting.data.related.people = _.union(this.sceneSetting.data.related.people,flat_people);

      var $extraElems = this.wrapper.isotope('getItemElements')
      $extraElems = $extraElems.sort(function(a, b) {
        return $(a).data('created') - $(b).data('created');
      })
      $extraElems = $extraElems.slice(0,-24+newMedia.length);


      // #TODO figure out extraElems 
      console.log("onNewMedia", d.channelName,$extraElems.length);

      var d = new Date();

      this.wrapper.isotope('remove', $extraElems)
        .isotope('layout'); 


      var self = this;
      $(newMedia).each(function(index, media){
        var caption = (media.caption==null? "": media.caption.text) + " via " + media.user.username;
        var figdesc = (media.caption!=null && media.tags.length < 7 ?  media.tags.join(' ') + ' <br/><small> ' + media.caption.text + ' </small> ' : media.tags.join(' '));
        var figlink = media.link;
        if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
          figlink = "instagram://media?id="+media.id;
        }
        var figtime = '<a target="_blank" href="'+figlink+'" title="'+caption+'">'+moment.unix(parseInt(media.created_time)).fromNoww()+'</a>';
        var figcaption = '<figcaption class="item-meta"><h3>'+figdesc+'</h3><span>'+media.user.username+'</span><div><a target="_blank" href="'+figlink+'" title="'+caption+'">Take a Look</a></div>'
        var figcaption_time = '<figcaption class="item-time"><h5>'+figtime+'</h5></figcaption>'

        var fig = '<figure><div><img data-uid="'+media.id+'" src="'+media.images.low_resolution.url+'" alt="'+caption+'" data-adaptive-background="1"/></div>'+figcaption_time+figcaption+'</figure>';
        var $newItems = $('<div class="element'+media.tags.join(' ')+'" data-created="'+media.created_time+'" data-uid="'+media.id+'">'+fig+'</div>');
        self.wrapper.prepend($newItems).isotope('prepended',$newItems );
        self.wrapper.isotope('updateSortData').isotope();
      });



    }


  }

  , socket_parsed: function(d){
    var src = "";
    if(d.channelSrc=="twitter"){
      src = "twitter";
      // console.log('twitter');
      // console.log(d);
      // this.createToken(src,this.sceneData[src]);
    }else{
      src = "instagram";
      //incoming instagram data contains the last twenty media items
      // this.createToken(src,this.sceneData[src]);
      this.onNewMedia(d);
    }
    v.debug('socket_parsed')
    v.debug(d)
  }

  , socket_error: function(e){
    v.debug('socket_error')
  }

  // customize tokens before create it  
  , createToken: function(src,data){
      var token = { 
        category: (src=="instagram" ? 1 : 0),
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

  , search_setup: function(){
      var self = this;
      var morphSearch = document.getElementById( 'morphsearch' ),
        input = morphSearch.querySelector( 'input.morphsearch-input' ),
        ctrlClose = morphSearch.querySelector( 'span.morphsearch-close' ),
        isOpen = isAnimating = false,
        // show/hide search area
        toggleSearch = function(evt) {
          // return if open and the input gets focused
          if( evt.type.toLowerCase() === 'focus' && isOpen ) return false;

          var offsets = morphsearch.getBoundingClientRect();
          if( isOpen ) {
            $(morphSearch).removeClass( 'open' );

            // trick to hide input text once the search overlay closes 
            // todo: hardcoded times, should be done after transition ends
            if( input.value !== '' ) {
              setTimeout(function() {
                $( morphSearch ).addClass( 'hideInput' );
                setTimeout(function() {
                 $( morphSearch ).removeClass( 'hideInput' );
                  input.value = '';
                }, 300 );
              }, 500);
            }
            
            input.blur();
          }
          else {
            $( morphSearch ).addClass( 'open' );
            self.search_data();
          }
          isOpen = !isOpen;
        };

      // events
      input.addEventListener( 'focus', toggleSearch );
      ctrlClose.addEventListener( 'click', toggleSearch );
      // esc key closes search overlay
      // keyboard navigation events
      document.addEventListener( 'keydown', function( ev ) {
        var keyCode = ev.keyCode || ev.which;
        if( keyCode === 27 && isOpen ) {
          toggleSearch(ev);
        }
      } );


      morphSearch.querySelector( 'button[type="submit"]' )
        .addEventListener( 'click', function(ev) { 
            ev.preventDefault();
            window.location.assign('/tag/'+$('.morphsearch-input').val());
        } );

  }

  , search_data: function(){
      var tplString_personitem = "<li><a target='_blank' class='menuperson' href='http://instagram.com/<%= username %>'><img class='round' src='<%= profile_picture %>'/><h3><%= username %></h3></a></li>";
      var tpl_personitem = _.template(tplString_personitem);
      var $relatedColumn = $('.related-people ul.items');
      $relatedColumn.html('');
      _.each( this.sceneSetting.data.related.people.slice(0,7), function(p){
        $relatedColumn.append(tpl_personitem(p));
      });
      // var tplString_hashtagitem = "<a class='menutag' href='<%= tag_path %><img src='<%= tag_img %>' alt=''/><h3><%= tag_title %></h3></a>";
      var tplString_hashtagitem = "<li><a class='menutag' href='/tag/<%= tag %>'<h3><%= tag %></h3></a></li>";
      var tpl_hashtagitem = _.template(tplString_hashtagitem);
      $relatedColumn = $('.related-tags ul.items');
      $relatedColumn.html('');
      _.each( this.sceneSetting.data.related.hashtags.slice(0,7), function(t){
        $relatedColumn.append(tpl_hashtagitem({tag: t}));
      });
  
  }

  , isotope_setup: function(){
      $.bridget('isotope', Isotope);
      this.wrapper = $('.cd-gallery').isotope({
        // options
        sortAscending: false,
        getSortData: {
            date: function (el) {
                return new Date(parseInt($(el).data('created'))*1000);
            }
        },
        sortBy: 'date',
        itemSelector : '.element',
        masonry: {
          columnWidth: 4,//'.grid-sizer'  ,
          isFitWidth: true
        }
      });

  }

  , render_viz: function(){

    // Define data and legend 
    // unit 
    var oneYear = 365*24*60*60


    // setup the clock 
    var time     = new Date(),secondsToday

    // start the clock 
    var self = this;
    /*
    var clock = window.setInterval(
                  function (){
                   time = new Date()
                   previousYear = new Date(2010,12,0,06,0,0,00)
                   diffPreviousYear = time.getTime()-previousYear.getTime()
                   secondsToday = (time.getHours()*60*60) + (time.getMinutes()*60) + time.getSeconds()
                   milliSecondsToday= (time.getHours()*60*60*1000) + (time.getMinutes()*60*1000) + time.getSeconds()*1000+time.getMilliseconds() 
                  
                  var srcs = ['twitter'];
                  for (var s in srcs) {
                    var src = srcs[s];
                    self.sceneData[src].now = Math.round(milliSecondsToday*self.sceneData[src].value/1000)
                    if(self.sceneData[src].now!=self.sceneData[src].old && _.random(2)==1) self.createToken(src,self.sceneData[src])
                    self.sceneData[src].old = self.sceneData[src].now
                  };
                 }
                 , 1000); 
    */

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
      window.addEventListener("keydown", this.keyControls, false);

      this.sceneSetting.data.related.hashtags = _.union(this.sceneSetting.data.related.hashtags,sd.related.hashtags);
      this.sceneSetting.data.related.people = _.union(this.sceneSetting.data.related.people,sd.related.people);

      this.newMediaToggle = true;

      for (src in this.sceneData) {
        this.sceneSetting.data.model.push({label:this.sceneData[src].label})
        var source_value_init = this.collection.count_source[src];
        this.sceneSetting.data.strata.push([{initValue: parseInt(source_value_init), label: this.sceneData[src].label + " Strata "}])
      };
  }

});

module.exports.init = function() {
  view = new HashtagsView({
    el: "document",
    collection: new Hashtags(null, { hashtag: sd.hashtag })
  });

  socketClients.forEach(function(socket){
    console.log('socketClients');
    console.log(socket);
    socket.on('message', function(data){ 
      try{
        v.debug('SOCKET update')
        view.trigger('socket:parsed',data);
      }catch(e){
        v.debug('SOCKET ERROR update')
        view.trigger('socket:error',update);
        v.debug(e);
      }
    });
  });

};