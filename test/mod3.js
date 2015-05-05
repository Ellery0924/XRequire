/**
 * Created by Ellery1 on 15/4/27.
 */

var html = require('tmpl/html1.html');

var mod1 = require('vendor/mod1'),
    mod2 = require('vendor/mod2');

module.exports = {
    mod1: mod1,
    mod2: mod2,
    mod3: 'mod3',
    html:{
        '1':html
    }
};

console.log('eval mod3');
