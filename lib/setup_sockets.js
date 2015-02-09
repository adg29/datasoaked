var c = require('../config')
  , sharify = require('sharify')
  , io_clients = {};

module.exports = function(server) {

	io = require('socket.io').listen(server); // need to find a way of requiring this in the hashtag app

	io.set('log level', 1); // reduce logging

	io.sockets.on('connection', function (socket) {
	  c.debug('io connection')
	  c.debug(socket);
	  c.debug(JSON.stringify(socket));
	  var ioc = io_clients[socket.id] = socket;
	  c.io_clients.push(ioc);
	});


	// assuming io is the Socket.IO server object
	io.configure(function () { 
	  io.set("transports", ["xhr-polling"]); 
	  io.set("polling duration", 3); 
	});
}