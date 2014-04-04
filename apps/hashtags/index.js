// 
// The express app for the "hashtags" app.
// 
// Simply exports the express instance to be mounted into the project, 
// and loads the routes.
// 

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express();



app.set('views', __dirname + '/templates');
app.set('view engine', 'jade');
app.get('/', routes.index);
app.get('/tag/:tag', routes.index);
app.post('/callbacks/tag/:tag', routes.subscription_callback_instagram);
app.get('/callbacks/tag/:tag', routes.challenge_callback_instagram);
