var _ = require('underscore')
	, moment = require('moment')
  	, sd = require('sharify').data;


moment.fn.fromNoww = function (a) {
    if (Math.abs(moment().diff(this)) <= 1000) { // 1000 milliseconds
        return 'just now';
    }
    if (Math.abs(moment().diff(this)) < 60000) { // 1000 milliseconds
        return Math.floor(Math.abs(moment.duration(this.diff(a)).asSeconds()))  + ' seconds ago';//this.fromNow();
    }
    return this.fromNow(a);
}

function debug(msg) {
  if (sd.debug) {
    console.log(msg);
    if (msg instanceof Error)
      console.log(msg.stack)
  }
}
exports.debug = debug;

exports.moment = moment;
exports._ = _;