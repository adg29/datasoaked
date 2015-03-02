var c = require('../config')
  	, url = require('url')
	, util = require('util')
  	, sharify = require('sharify')
  	, io_clients = [];
  	// , io_clients = {};

module.exports = function(server) {

	io = require('socket.io').listen(server); // need to find a way of requiring this in the hashtag app

	io.set('log level', 1); // reduce logging

	io.sockets.on('connection', function (socket) {
	  c.debug('io connection', socket);
	  c.debug('socket.handshake.url ' + socket.handshake.url);
	  c.debug('socket url parsed ' +  util.inspect(url.parse(socket.handshake.url, true) ,false,null) );
	  // extract namespace from connected url query param 'ns'
	  var ns = url.parse(socket.handshake.url, true).query.ns;
	  c.debug('soccket connected ns: '+ns)

	  var rooms = ns.split(',');

	  rooms.forEach(function(r){
	  	c.debug('join');
	  	c.debug(r);
	  	socket.join(r);
	  })

	  io_clients.push(socket);

	  c.debug( 'DATASOAKED # connected clients ' + io_clients.length );

	});


	// assuming io is the Socket.IO server object
	io.configure(function () { 
	  io.set("transports", ["xhr-polling"]); 
	  io.set("polling duration", 3); 
	});
}