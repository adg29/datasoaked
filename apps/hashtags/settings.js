var sd = require('sharify').data;

// Inject some constant data into sharify
sd['debug'] = true;
sd['httpClient'] = require('http');
sd['REDIS_PORT'] = 6486;
sd['REDIS_HOST'] = '127.0.0.1';
sd['hashtag'] = 'tbt';
sd['hashtag_items'] = 24;

