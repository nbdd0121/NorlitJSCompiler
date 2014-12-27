#!/usr/bin/env node

var System = require('./external/es6-module-loader').System;
if (process.argv.length <= 2) {
	console.log('Argument Required');
} else {
	var moduleName = process.argv[2].replace(/\.js$/, '');
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