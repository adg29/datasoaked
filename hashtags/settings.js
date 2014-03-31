exports.IG_CLIENT_ID = process.env.IG_CLIENT_ID || "87f4400b663c4c568ac2bd9a36b87b67";
exports.IG_CLIENT_SECRET = process.env.IG_CLIENT_SECRET || "ace1dd176b674b75879a14d4fd175962";
// exports.IG_CLIENT_ID = process.env.IG_CLIENT_ID || "602782ce658f4577b7950bea45e510cd"
// exports.IG_CLIENT_SECRET = process.env.IG_CLIENT_SECRET || "8f64948615734619a8d847646152048d"

exports.httpClient = (process.env.IG_USE_INSECURE ? require('http') : require('https'));
exports.REDIS_PORT = 6486;
exports.REDIS_HOST = '127.0.0.1';
exports.debug = true;
exports.hashtag_items = 24;

