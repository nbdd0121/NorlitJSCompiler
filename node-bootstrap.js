#!/usr/bin/env node

var System = require('./external/es6-module-loader').System;
if (process.argv.length <= 2) {
	console.log('Argument Required');
}
var moduleName = process.argv[2].replace(/\.js$/, '');
System.import(moduleName).then(function(index) {

}).catch(function(err) {
	console.log(err.stack ? err.stack : err);
})
