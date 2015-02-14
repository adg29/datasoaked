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
	  // extract namespace from connected url query param 'ns'
	  c.debug('socket.handshake ' + util.inspect(socket.handshake,false,null));
	  c.debug('socket.handshake.url ' + socket.handshake.url);
	  c.debug('socket url parsed ' +  util.inspect(url.parse(socket.handshake.url, true) ,false,null) );
	  var ns = url.parse(socket.handshake.url, true).query.ns;
	  c.debug('connected ns: '+ns)


	  // var ioc = io_clients[socket.id] = socket;
	  // c.io_clients.push(ioc);


	  /*
      	create new namespace (or use previously created)
		*/
      io.of(ns).on('connection', function (nsSocket) {
        // fire event when socket connecting
	  	// var ioc = io_clients[ns] = nsSocket; //might be inconsequential
	  	if(typeof c.io_clients[ns]=='undefined'){
	  		c.io_clients[ns] = [];
	  	}

	  	c.io_clients[ns]
	  		.push(nsSocket);

	  	c.debug( 'PROFILE ' +  ns + ' connected clients ' + c.io_clients[ns].length );

      });


	});


	// assuming io is the Socket.IO server object
	io.configure(function () { 
	  io.set("transports", ["xhr-polling"]); 
	  io.set("polling duration", 3); 
	});
}