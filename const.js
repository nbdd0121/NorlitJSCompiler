'use strict';

var NorlitJSCompiler = require("./compiler");

var ASTBuilder = NorlitJSCompiler.ASTBuilder;

function removeUselessStatement(body) {
	for (var i = 0; i < body.length; i++) {
		switch (body[i].type) {
			case 'ReturnStatement':
			case 'ThrowStatement':
			case 'BreakStatement':
			case 'ContinueStatement':
				body.splice(i + 1, body.length - i - 1);
				return true;
			default:
				if (!body[i].sideEffect) {
					body.splice(i, 1);
					i--;
				}
		}
	}
	return body.length != 0;
}

NorlitJSCompiler.ASTPass.register({
	leave: function(node, parent) {
		switch (node.type) {
			case 'Symbol':
			case 'ThisExpression':
			case 'Constant':
				{
					node.sideEffect = false;
					break;
				}
			case 'FunctionExpression':
				{
					removeUselessStatement(node.body);
					node.sideEffect = false;
					break;
				}
			case 'FunctionDeclaration':
				{
					removeUselessStatement(node.body);
					node.sideEffect = true;
					break;
				}
			case 'EmptyStatement':
				{
					node.sideEffect = false;
					break;
				}
			case 'ExpressionStatement':
				{
					if (!node.expression.sideEffect) {
						node = new NorlitJSCompiler.Node('EmptyStatement');
						node.sideEffect = false;
						return node;
					}
					node.sideEffect = true;
					break;
				}
			case 'IfStatement':
				{
					if (node.false && !node.false.sideEffect) {
						node.false = undefined;
					}
					if (!node.true.sideEffect) {
						node.true = undefined;
					}
					if (node.true === undefined && node.false === undefined) {
						if (node.test.sideEffect) {
							var wrap = new NorlitJSCompiler.Node('ExpressionStatement');
							wrap.expression = node.test;
							wrap.sideEffect = true;
							return wrap;
						} else {
							return NorlitJSCompiler.Node.EMPTY;
						}
					}
					if (node.true === undefined) {
						var wrap = new NorlitJSCompiler.Node('UnaryExpression');
						wrap.operator = '!';
						wrap.operand = node.test;
						wrap.sideEffect = node.test.sideEffect;
						node.test = wrap;
						node.true = node.false;
						node.false = undefined;
					}
					if (node.test.type == 'Constant') {
						if (node.test.value) {
							return node.true;
						} else {
							return node.false === undefined ? NorlitJSCompiler.Node.EMPTY : node.false;
						}
					}
					if (node.false) {
						node.sideEffect = node.test.sideEffect || node.true.sideEffect;
					} else {
						node.sideEffect = node.test.sideEffect || node.true.sideEffect || node.false.sideEffect;
					}
					break;
				}
			case 'Program':
				{
					node.sideEffect = removeUselessStatement(node.body);
					break;
				}
			case 'BlockStatement':
				{
					node.sideEffect = removeUselessStatement(node.body);
					if (parent.type != 'TryStatement') {
						if (node.body.length == 0) {
							return NorlitJSCompiler.Node.EMPTY;
						} else if (node.body.length == 1) {
							return node.body[0];
						}
					}
					break;
				}
			case 'BinaryExpression':
				{
					if (node.left.type == 'Constant' && node.right.type != 'Constant') {
						switch (node.operator) {
							case '&&':
								{
									return node.left.value ? node.right : node.left;
								}
							case '||':
								{
									return node.left ? node.left : node.right;
								}
						}
					} else if (node.left.type == 'Constant' && node.right.type == 'Constant') {
						var l = node.left.value,
							r = node.right.value;
						switch (node.operator) {
							case '*':
								return ASTBuilder.wrapConstant(l * r);
							case '/':
								return ASTBuilder.wrapConstant(l / r);
							case '%':
								return ASTBuilder.wrapConstant(l % r);
							case '+':
								return ASTBuilder.wrapConstant(l + r);
							case '-':
								return ASTBuilder.wrapConstant(l - r);
							case '<<':
								return ASTBuilder.wrapConstant(l << r);
							case '>>':
								return ASTBuilder.wrapConstant(l >> r);
							case '>>>':
								return ASTBuilder.wrapConstant(l >>> r);
							case '<':
								return ASTBuilder.wrapConstant(l < r);
							case '>':
								return ASTBuilder.wrapConstant(l > r);
							case '<=':
								return ASTBuilder.wrapConstant(l <= r);
							case '>=':
								return ASTBuilder.wrapConstant(l >= r);
							case 'instanceof':
							case 'in':
								throw new TypeError("TypeCheckError");
							case '==':
								return ASTBuilder.wrapConstant(l == r);
							case '!=':
								return ASTBuilder.wrapConstant(l != r);
							case '===':
								return ASTBuilder.wrapConstant(l === r);
							case '!==':
								return ASTBuilder.wrapConstant(l !== r);
							case '&':
								return ASTBuilder.wrapConstant(l & r);
							case '|':
								return ASTBuilder.wrapConstant(l | r);
							case '^':
								return ASTBuilder.wrapConstant(l ^ r);
							case '&&':
								return ASTBuilder.wrapConstant(l && r);
							case '||':
								return ASTBuilder.wrapConstant(l || r);
							case ',':
								return node.right;
							default:
								throw 'Operation ' + node.operator;
						}
					}
					node.sideEffect = node.left.sideEffect | node.right.sideEffect;
					break;
				}
			case 'ConditionalExpression':
				{
					if (node.test.type == 'Constant') {
						return node.test.value ? node.true : node.false;
					}
					node.sideEffect = node.test.sideEffect || node.true.sideEffect || node.false.sideEffect;
					break;
				}
			case 'UnaryExpression':
				{
					if (!node.operand.sideEffect) {
						switch (node.operator) {
							case 'delete':
								{
									return ASTBuilder.wrapConstant(true);
								}
							case 'void':
								{
									return ASTBuilder.wrapConstant(undefined);
								}
						}
					}
					if (node.operand.type == 'Constant') {
						var v = node.operand.value;
						switch (node.operator) {
							case '+':
								return ASTBuilder.wrapConstant(+v);
							case '-':
								return ASTBuilder.wrapConstant(-v);
							case 'typeof':
								return ASTBuilder.wrapConstant(typeof(v));
							case '++':
								throw new TypeError("TypeCheckError");
							case '--':
								throw new TypeError("TypeCheckError");
							case '!':
								return ASTBuilder.wrapConstant(!v);
							case '~':
								return ASTBuilder.wrapConstant(~v);
							default:
								throw 'Operation ' + node.operator;
						}
					}
					switch (node.operator) {
						case 'delete':
						case '++':
						case '--':
							node.sideEffect = true;
							break;
						case 'void':
						case '+':
						case '-':
						case 'typeof':
						case '!':
						case '~':
							node.sideEffect = node.operand.sideEffect;
							break;
						default:
							throw 'Operation ' + node.operator;
					}
					break;
				}
			default:
				{
					node.sideEffect = true;
					break;
				}
		}
	}
});