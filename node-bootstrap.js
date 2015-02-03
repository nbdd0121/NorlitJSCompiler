#!/usr/bin/env node

var System = require('./external/es6-module-loader').System;
process.argv = process.argv.slice(2);
if (process.argv.length === 0) {
	console.log('Argument Required');
} else {
	var moduleName = process.argv[0].replace(/\.js$/, '');
	System.traceurOptions.sourceMaps = true;
	System.import(moduleName).then(function(index) {

	}).catch(function(err) {
		if (!err.stack) {
			console.log(err);
		} else {
			var stack =
				err.stack
				.replace(/\(.*\)/g, '')
				.replace(/([^]*) at\ execute [^]*/, '$1')
				.trim() + '\n    at ' + moduleName;
			console.log(stack);
		}
	})
}
