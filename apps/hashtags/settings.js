var sd = require('sharify').data;

// Inject some constant data into sharify
sd['debug'] = false;
sd['httpClient'] = require('http');
sd['REDIS_PORT'] = 6486;
sd['REDIS_HOST'] = '127.0.0.1';


 sd['IG_API_URL'] = 'https://api.instagram.com/v1';
 sd['IG_API_PORT'] = process.env.IG_API_PORT || null;
 sd['IG_API_BASE_PATH'] = process.env.IG_BASE_PATH || '';
 sd['IG_CLIENT_ID'] = process.env.IG_CLIENT_ID || "87f4400b663c4c568ac2bd9a36b87b67";
 sd['IG_CLIENT_SECRET'] = process.env.IG_CLIENT_SECRET || "ace1dd176b674b75879a14d4fd175962";
 //sd['IG_CLIENT_ID'] = process.env.IG_CLIENT_ID || "602782ce658f4577b7950bea45e510cd";
 //sd['IG_CLIENT_SECRET'] = process.env.IG_CLIENT_SECRET || "8f64948615734619a8d847646152048d";

sd['hashtag'] = 'liveaudio';
sd['hashtag_items'] = 60;

