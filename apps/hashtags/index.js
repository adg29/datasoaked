// 
// The express app for the "hashtags" app.
// 
// Simply exports the express instance to be mounted into the project, 
// and loads the routes.
// 

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express();

// For Express 3 (won't work with express 2.x)
app.use(function(req, res, next) {
    //console.log('mw collecting data');
    var data = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { 
       data += chunk;
    });
    req.on('end', function() {
        req.rawBody = data;
        next();
    });
});



app.set('views', __dirname + '/templates');
app.set('view engine', 'jade');
app.get('/', routes.index);
app.get('/callbacks/tag/:tag', routes.challenge_callback_instagram);
app.post('/callbacks/tag/:tag', routes.subscription_callback_instagram);