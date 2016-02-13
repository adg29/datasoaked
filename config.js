//
// Using ["The Twelve-Factor App"](http://12factor.net/) as a reference all 
// environment configuration will live in environment variables. This file 
// simply lays out all of those environment variables with sensible defaults 
// for development.
//
var util = require('util');

module.exports = {
  debug_on: true
  , debug: function debug(msg) {
    if (module.exports.debug_on) {
      console.log(util.inspect(msg,false,null));
      if (msg instanceof Error)
        console.log(msg.stack)
    }
  }
  , NODE_ENV: 'development'
  , PORT: 5000
}

// Override any values with env variables
for(var key in module.exports) {
  module.exports[key] = process.env[key] || module.exports[key];
}
