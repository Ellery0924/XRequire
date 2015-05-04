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
var mod3 = require('vendor/mod3');

mod1();

console.log(XRequire.module);