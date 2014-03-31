//
// Using ["The Twelve-Factor App"](http://12factor.net/) as a reference all 
// environment configuration will live in environment variables. This file 
// simply lays out all of those environment variables with sensible defaults 
// for development.
//

module.exports = {
  NODE_ENV: 'development',
  PORT: 4000,
  API_URL: 'https://api.instagram.com/v1'
  API_PORT: process.env.IG_API_PORT || null,
  API_BASE_PATH: process.env.IG_BASE_PATH || ''
}

// Override any values with env variables
for(var key in module.exports) {
  module.exports[key] = process.env[key] || module.exports[key];
}