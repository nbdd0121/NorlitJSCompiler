var NorlitJSCompiler = require("../compiler");
require("./decl");

var Symbol = NorlitJSCompiler.Scope.Symbol;
var DeclScope = NorlitJSCompiler.Scope.DeclScope;
var WithScope = NorlitJSCompiler.Scope.WithScope;
var CatchScope = NorlitJSCompiler.Scope.CatchScope;
var GlobalScope = NorlitJSCompiler.Scope.GlobalScope;

var ASTBuilder = NorlitJSCompiler.ASTBuilder;

NorlitJSCompiler.ScopeAnalysis = function ScopeAnalysis(ast) {
	var scopeChain = [];
	var global = new GlobalScope();
	var scope = global;

	var scopeAnalyzer = {
		enter: function(ast, parent) {
			switch (ast.type) {
				case 'Program':
					{
						scopeChain.push(scope);
						scope = new DeclScope(scope);
						ast.scope = scope;
						break;
					}
				case 'FunctionExpression':
					{
						scopeChain.push(scope);
						scope = new DeclScope(scope);
						if (ast.name)
							ast.name = scope.declare(ast.name);
						for (var i = 0; i < ast.parameter.length; i++) {
							if (ast.parameter[i] == 'eval') {
								scope.disableOptimize();
							}
							ast.parameter[i] = scope.declare(ast.parameter[i]);
						}
						ast.scope = scope;
						break;
					}
				case 'FunctionDeclaration':
					{
						ast.name = scope.declare(ast.name);
						scopeChain.push(scope);
						scope = new DeclScope(scope);
						for (var i = 0; i < ast.parameter.length; i++) {
							if (ast.parameter[i] == 'eval') {
								scope.disableOptimize();
							}
							ast.parameter[i] = scope.declare(ast.parameter[i]);
						}
						ast.scope = scope;
						break;
					}
				case 'VariableDeclarator':
					{
						ast.name = scope.declare(ast.name);
						break;
					}
				case 'WithStatement':
					{
						scopeChain.push(scope);
						scope = new WithScope(scope);
						ast.scope = scope;
						break;
					}
				case 'TryStatement':
					{
						if (ast.parameter !== undefined) {
							NorlitJSCompiler.Visitor.traverse(ast.body, scopeAnalyzer);
							scopeChain.push(scope);
							scope = new CatchScope(scope, ast.parameter);
							ast.parameter = scope.symbol;
							ast.scope = scope;
							NorlitJSCompiler.Visitor.traverse(ast.catch, scopeAnalyzer);
							scope = scopeChain.pop();
							if (ast.finally !== undefined) {
								NorlitJSCompiler.Visitor.traverse(ast.finally, scopeAnalyzer);
							}
							return ast;
						}
						break;
					}
			}
		},
		leave: function(ast, parent) {
			switch (ast.type) {
				case 'Program':
				case 'FunctionExpression':
				case 'FunctionDeclaration':
					{
						//console.log('Analysis of ' + ast.type + " Yield " + JSON.stringify(scope.var));
						scope = scopeChain.pop();
						break;
					}
				case 'WithStatement':
					{
						//console.log('Leave With Scope');
						scope = scopeChain.pop();
						break;
					}

			}
		}
	};

	NorlitJSCompiler.Visitor.traverse(ast, scopeAnalyzer);

	var identifierResolver = {
		enter: function(ast, parent) {
			switch (ast.type) {
				case 'Program':
				case 'FunctionExpression':
				case 'FunctionDeclaration':
				case 'WithStatement':
					{
						scopeChain.push(scope);
						scope = ast.scope;
						break;
					}
				case 'TryStatement':
					{
						if (ast.parameter !== undefined) {
							NorlitJSCompiler.Visitor.traverse(ast.body, identifierResolver);
							scopeChain.push(scope);
							scope = ast.scope;
							NorlitJSCompiler.Visitor.traverse(ast.catch, identifierResolver);
							scope = scopeChain.pop();
							if (ast.finally !== undefined) {
								NorlitJSCompiler.Visitor.traverse(ast.finally, identifierResolver);
							}
							return ast;
						}
						break;
					}
				case 'CallExpression':
					{
						if (ast.callee.type == 'Identifier' & ast.callee.name == 'eval') {
							scope.disableOptimize();
						}
						break;
					}
			}
			if (ast.type == 'Identifier') {
				var symbol = scope.resolve(ast.name);
				if (symbol) {
					ast.name = symbol;
					return;
				} else {
					if (symbol === undefined) {
						if (ast.name == 'undefined') {
							return ASTBuilder.wrapConstant(undefined);
						}
					}
					global.declare(ast.name);
					return;
				}
			}
		},
		leave: function(ast, parent) {
			switch (ast.type) {
				case 'Program':
				case 'FunctionExpression':
				case 'FunctionDeclaration':
				case 'WithStatement':
					{
						scope = scopeChain.pop();
						break;
					}
			}
		}
	};

	NorlitJSCompiler.Visitor.traverse(ast, identifierResolver);
};

NorlitJSCompiler.Scope.Desymbolize = function(ast) {
	NorlitJSCompiler.Visitor.traverse(ast, {
		enter: function(ast, parent) {
			switch (ast.type) {
				case 'VariableDeclarator':
					{
						if (ast.name instanceof Symbol) {
							ast.name = ast.name.name;
						}
						break;
					}
				case 'TryStatement':
					{
						if (ast.parameter instanceof Symbol) {
							ast.parameter = ast.parameter.name;
						}
						break;
					}
				case 'Identifier':
					{
						if (ast.name instanceof Symbol) {
							ast.name = ast.name.name;
						}
						break;
					}
				case 'FunctionDeclaration':
				case 'FunctionExpression':
					{
						if (ast.name instanceof Symbol) {
							ast.name = ast.name.name;
						}
						for (var i = 0; i < ast.parameter.length; i++) {
							if (ast.parameter[i] instanceof Symbol) {
								ast.parameter[i] = ast.parameter[i].name;
							}
						}
						break;
					}
			}
		}
	});
}

var idStart = "_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
var idPart = "_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function variableName(id) {
	var text = idStart[id % idStart.length];
	id = Math.floor(id / idStart.length);
	for (; id; id = Math.floor(id / idPart.length)) {
		text += idPart[id % idPart.length];
	}
	return text;
}

NorlitJSCompiler.Scope.Obfuscate = function(ast) {
	NorlitJSCompiler.Visitor.traverse(ast, {
		enter: function(node, parent) {
			switch (node.type) {
				case 'Program':
					{
						node.scope.id = 0;
						break;
					}
				case 'FunctionExpression':
				case 'FunctionDeclaration':
					{
						var scope = node.scope;
						var id = scope.outer.id;
						if (scope.optimize) {
							for (var i = 0; i < scope.var.length; i++) {
								var symbol = scope.var[i];
								var varName;
								while (scope.outer.isDeclared(varName = variableName(id++)));
								symbol.name = varName;
							}
						}
						scope.id = id;
						break;
					}
				case 'WithStatement':
					{
						node.scope.id = node.scope.outer.id;
					}
				case 'TryStatement':
					{
						if (node.scope !== undefined) {
							var scope = node.scope;
							var id = scope.outer.id;
							if (scope.optimize) {
								var symbol = scope.symbol;
								var varName;
								while (scope.outer.isDeclared(varName = variableName(id++)));
								symbol.name = varName;
								id++;
							}
							scope.id = id;
						}
						break;
					}
			}
		}
	});
}