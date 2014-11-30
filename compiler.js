'use strict';

var NorlitJSCompiler = {};
module.exports = NorlitJSCompiler;

NorlitJSCompiler.Warning = function() {
	function Warning(message) {
		this.stack = (new Error).stack || [];
		this.message = message;
	}

	Warning.prototype = Error.prototype;
	Warning.prototype.name = "Warning";
	return Warning;
}();

NorlitJSCompiler.Context = function() {
	function Context(tolerance) {
		this.errors = [];
		this.warnings = [];
		this.tolerance = !!tolerance;
	}

	Context.prototype.throwError = function(error) {
		if (this.tolerance) {
			this.errors.push(error);
		} else {
			throw error;
		}
	}

	Context.prototype.throwWarning = function(w) {
		this.warnings.push(w);
	}

	Context.prototype.lastError = function() {
		return this.errors[this.errors.length - 1];
	}

	Context.prototype.hasError = function() {
		return this.errors.length;
	}
	return Context;
}();

/* Defines NorlitJSCompiler.CharType */
require("./syntax/chartype");
/* Defines NorlitJSCompiler.Node & NorlitJSCompiler.ASTBuilder */
require("./ast/builder");
/* Defines NorlitJSCompiler.Lex & NorlitJSCompiler.Token */
require("./syntax/lex");
/* Defines NorlitJSCompiler.Parser */
require("./syntax/grammar");

NorlitJSCompiler.Visitor = require("./visitor.js");
NorlitJSCompiler.ASTPass = (function() {
	var ASTPass = [];
	ASTPass.register = function(a) {
		ASTPass.push(a);
	}
	ASTPass.applyAll = function(ast) {
		NorlitJSCompiler.ASTPass.forEach(function(pass) {
			ast = NorlitJSCompiler.Visitor.traverse(ast, pass) || ast;
		});
		return ast;
	}
	ASTPass.apply = function(ast, pass) {
		return NorlitJSCompiler.Visitor.traverse(ast, pass) || ast;
	}
	return ASTPass;
})();

require("./const.js");