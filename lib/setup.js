//
// Sets up intial project settings, middleware, mounted apps, and
// global configuration such as overriding Backbone.sync and
// populating sharify data
//

var c = require('../config')
  , express = require('express')
  , Backbone = require('backbone')
  , sharify = require('sharify')
  , path = require('path');

// Inject some constant data into sharify
sharify.data = {
  API_URL: c.API_URL,
  IG_CLIENT_ID: c.IG_CLIENT_ID,
  IG_CLIENT_SECRET: c.IG_CLIENT_SECRET,
  JS_EXT: 'production' == c.NODE_ENV ? '.min.js' : '.js',
  CSS_EXT: 'production' == c.NODE_ENV ? '.min.css' : '.css'
};

module.exports = function(app) {

  // Override Backbone to use server-side sync
  Backbone.sync = require('backbone-super-sync');
  // Set some headers for the Github API
  Backbone.sync.editRequest = function(req) {
    req.set({ 'User-Agent': 'artsy' });
  };

  app.use(express.methodOverride());
  // For Express 3 (won't work with express 2.x)
  // this is part of the hashtags app and should be set there 
  app.use(function(req, res, next) {
      //console.log('mw collecting data');
      var data = '';
      req.on('data', function(chunk) { 
         data += chunk;
      });
      req.on('end', function() {
          console.log('end rawData');
          console.log(data);
          req.rawBody = data;
          next();
      });
  });



  // General express middleware
  app.use(sharify);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded());



  app.use(app.router);

  // Development only
  if ('development' == c.NODE_ENV) {
    app.use(express.errorHandler());
    // Compile assets on request in development
    app.use(require('stylus').middleware({
      src: path.resolve(__dirname, '../'),
      dest: path.resolve(__dirname, '../public')
    }));
    app.use(require('browserify-dev-middleware')({
      src: path.resolve(__dirname, '../'),
      transforms: [require('jadeify')]
    }));
  }

  // Test only
  if('test' == c.NODE_ENV) {
    // Mount fake API server
    app.use('/__api', require('../test/helpers/integration.js').api);
  }

  // Mount apps
  app.use(require('../apps/hashtags'));

  // More general middleware
  app.use(express.static(path.resolve(__dirname, '../public')));
}