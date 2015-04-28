/**
 * Created by Ellery1 on 15/4/27.
 */
var html = require('tmpl/html1.html'),
    html2 = require('tmpl/html2.html');

console.log(html);
console.log(html2);

require('./css/css1.css');
require('./css/css2.css');

window.jQuery = window.$ = require('jquery.commonjs');
console.log($);
require('jquery-ui.commonjs');
console.log($().dialog);

var mod1 = require('mod1');
var mod3 = require('mod3');

mod1();