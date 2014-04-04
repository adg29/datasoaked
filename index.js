// 
// Main app file that runs setup code and starts the server process.
// This code should be kept to a minimum. Any setup code that gets large should 
// be abstracted into modules under /lib.
// 

var c = require('./config')
  , express = require('express')
  , setup = require('./lib/setup');

var app = module.exports = express();
setup(app);


var http = require('http')
	, server = http.createServer(app)
	, io = require('socket.io').listen(server); // need to find a way of requiring this in the hashtag app


// Start the server and send a message to IPC for the integration test 
// helper to hook into. 
server.listen(c.PORT, function() {
  console.log('Listening on port ' + c.PORT);
  if(process.send) process.send('listening');
});