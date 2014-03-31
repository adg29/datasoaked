//
// Using ["The Twelve-Factor App"](http://12factor.net/) as a reference all 
// environment configuration will live in environment variables. This file 
// simply lays out all of those environment variables with sensible defaults 
// for development.
//

module.exports = {
  NODE_ENV: 'development',
  PORT: 5000,
  API_URL: 'https://api.instagram.com/v1',
  API_PORT: process.env.IG_API_PORT || null,
  API_BASE_PATH: process.env.IG_BASE_PATH || '',
  IG_CLIENT_ID: process.env.IG_CLIENT_ID || "87f4400b663c4c568ac2bd9a36b87b67",
  IG_CLIENT_SECRET: process.env.IG_CLIENT_SECRET || "ace1dd176b674b75879a14d4fd175962"
}

// Override any values with env variables
for(var key in module.exports) {
  module.exports[key] = process.env[key] || module.exports[key];
}