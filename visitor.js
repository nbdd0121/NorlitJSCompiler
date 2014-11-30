var syntax = {
	Constant: [],
	Identifier: [],
	RegexpLiteral: [],
	ThisExpression: [],
	ObjectInitializer: ["elements"],
	Property: ["value"],
	Getter: ["body"],
	Setter: ["body"],
	ArrayInitializer: ["elements"],
	MemberExpression: ["base", "property"],
	NewExpression: ["constructor", "arguments"],
	CallExpression: ["callee", "arguments"],
	PostfixExpression: ["operand"],
	UnaryExpression: ["operand"],
	BinaryExpression: ["left", "right"],
	AssignmentExpression: ["left", "right"],
	ConditionalExpression: ["test", "true", "false"],


	BlockStatement: ["body"],
	EmptyStatement: [],
	DebuggerStatement: [],
	ExpressionStatement: ["expression"],
	VariableDeclaration: ["declarations"],
	VariableDeclarator: ["init"],
	IfStatement: ["test", "true", "false"],
	TryStatement: ["body", "catch", "finally"],
	ThrowStatement: ["expression"],
	ReturnStatement: ["expression"],
	SwitchStatement: ["expression", "body"],
	CaseClause: ["key", "body"],
	WithStatement: ["base", "body"],
	WhileStatement: ["test", "body"],
	LabeledStatement: ["body"],
	ForStatement: ["init", "test", "inc", "body"],
	ForInStatement: ["var", "container", "body"],
	ContinueStatement: [],
	BreakStatement: [],
	DoStatement: ["body", "test"],

	FunctionExpression: ["body"],
	FunctionDeclaration: ["body"],
	DirectiveStatement: [],
	Program: ["body"],

	Symbol: []
};

function traverse(ast, options, parent) {
	if (ast === undefined) {
		return;
	} else if (ast instanceof Array) {
		for (var i = 0; i < ast.length; i++) {
			var replace = traverse(ast[i], options, parent);
			if (replace !== undefined) {
				ast[i] = replace;
			}
		}
		return;
	} else if (ast instanceof Object) {
		if (options.enter) {
			var ret = options.enter(ast, parent);
			if (ret !== undefined) {
				return ret;
			}
		}
		var type = syntax[ast.type];
		if (!type) {
			console.log(ast);
			throw new Error("Unsupported Node " + ast.type);
		}
		for (var i = 0; i < type.length; i++) {
			var replace = traverse(ast[type[i]], options, ast);
			if (replace !== undefined) {
				ast[type[i]] = replace;
			}
		}
		if (options.leave) {
			var ret = options.leave(ast, parent);
			if (ret !== undefined) {
				return ret;
			}
		}
	} else {
		console.log('>>>>' + ast);
		throw 'ERROR!!!!';
	}

}

exports.traverse = function(ast, options) {
	if (!options) {
		options = {};
	}
	traverse(ast, options);
}