var moment = require('moment');


moment.fn.fromNoww = function (a) {
    if (Math.abs(moment().diff(this)) <= 1000) { // 1000 milliseconds
        return 'just now';
    }
    if (Math.abs(moment().diff(this)) < 60000) { // 1000 milliseconds
        return Math.floor(Math.abs(moment.duration(this.diff(a)).asSeconds()))  + ' seconds ago';//this.fromNow();
    }
    return this.fromNow(a);
}

exports.moment = moment;