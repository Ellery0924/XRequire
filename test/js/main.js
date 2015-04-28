/**
 * Created by Ellery1 on 15/4/27.
 */
var html = require('./html/html1.html'),
    html2 = require('./html/html2.html');

console.log(html);
console.log(html2);

require('./css/css1.css');
require('./css/css2.css');

window.jQuery = window.$ = require('jquery');
require('jquery-ui');

var mod1 = require('mod1');
var mod3 = require('mod3');