'use strict';

var NorlitJSCompiler = require("../compiler");

function Node(type) {
	this.type = type;
}

NorlitJSCompiler.Node = Node;

Node.ILLEGAL = new Node('<illegal>');

Node.EMPTY = function() {
	var node = new Node('EmptyStatement');
	node.sideEffect = false;
	return node;
}();

Node.UNDEFINED = function() {
	var ret = new Node("Constant");
	ret.value = undefined;
	ret.sideEffect = false;
	return ret;
}();

var ASTBuilder = {
	wrapConstant: function(constant) {
		var ret = new Node("Constant");
		ret.value = constant;
		ret.sideEffect = false;
		return ret;
	}
};

NorlitJSCompiler.ASTBuilder = ASTBuilder;