var c = require('../config')
  	, url = require('url')
  	, sharify = require('sharify')
  	, io_clients = {};

module.exports = function(server) {

	io = require('socket.io').listen(server); // need to find a way of requiring this in the hashtag app

	io.set('log level', 1); // reduce logging

	io.sockets.on('connection', function (socket) {
	  c.debug('io connection')
	  c.debug(socket);

	  // extract namespace from connected url query param 'ns'
	  c.debug(socket.handshake);
	  c.debug(socket.handshake.url);
	  c.debug( url.parse(socket.handshake.url, true) );
	  var ns = url.parse(socket.handshake.url, true).query.ns;
	  c.debug('connected ns: '+ns)

      // create new namespace (or use previously created)
      io.of(ns).on('connection', function (nsSocket) {
        // fire event when socket connecting
	  	var ioc = io_clients[nsSocket.id] = nsSocket;
	  	c.io_clients.push(ioc);

      });


	});


	// assuming io is the Socket.IO server object
	io.configure(function () { 
	  io.set("transports", ["xhr-polling"]); 
	  io.set("polling duration", 3); 
	});
}