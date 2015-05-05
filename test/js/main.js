/**
 * Created by Ellery1 on 15/4/27.
 */

require('./css/css1.css');
require('./css/css2.css');

window.jQuery = window.$ = require('vendor/jquery.commonjs');
console.log($);
require('vendor/jquery-ui.commonjs');
console.log($().dialog);

var mod1 = require('vendor/mod1');
var mod3 = require('/XRequire/test/mod3');
var html2 = require('tmpl/html2.html');

mod1();
console.log(mod3);
console.log(html2);
console.log(XRequire.getModule());