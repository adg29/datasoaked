// 
// Main app file that runs setup code and starts the server process.
// This code should be kept to a minimum. Any setup code that gets large should 
// be abstracted into modules under /lib.
// 

var c = require('./config')
  , express = require('express')
  , setup = require('./lib/setup')
  , setup_sockets = require('./lib/setup_sockets');

var app = exports.app = express();
setup(app);


var http = require('http')
	, server = exports.server = http.createServer(app)
setup_sockets(server);


// Start the server and send a message to IPC for the integration test 
// helper to hook into. 
server.listen(c.PORT, function() {
  console.log('Listening on port ' + c.PORT);
  if(process.send) process.send('listening');
});