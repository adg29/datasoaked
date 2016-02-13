var sd = require('sharify').data;

// Inject some constant data into sharify
sd['debug'] = false;
sd['httpClient'] = require('http');
sd['REDIS_PORT'] = 6379;
sd['REDIS_HOST'] = '127.0.0.1';


 sd['IG_API_URL'] = 'https://api.instagram.com/v1';
 sd['IG_API_PORT'] = process.env.IG_API_PORT || null;
 sd['IG_API_BASE_PATH'] = process.env.IG_BASE_PATH || '';

 // sd['IG_CLIENT_ID'] = process.env.IG_CLIENT_ID || "fbc600c2d36d4c5dae64ae9a275ba612";
 // sd['IG_CLIENT_SECRET'] = process.env.IG_CLIENT_SECRET || "a8ab4b3ef5bc4486b04a4fa97b9ac6cb";



 //sd['IG_CLIENT_ID'] = process.env.IG_CLIENT_ID || "602782ce658f4577b7950bea45e510cd";
 //sd['IG_CLIENT_SECRET'] = process.env.IG_CLIENT_SECRET || "8f64948615734619a8d847646152048d";

sd['IG_CLIENT_ID'] =  process.env.IG_CLIENT_ID || "7215ab31c2b5410ab649f11d6ff060df";
sd['IG_CLIENT_SECRET'] = process.env.IG_CLIENT_SECRET  || "5b3bcecdfe24425384559b961a91f084";

sd['hashtag'] = 'arcomadrid.thearmoryshow';
sd['hashtag_items'] = 60;

