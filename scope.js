var NorlitJSCompiler = require("./compiler");

var ASTBuilder = NorlitJSCompiler.ASTBuilder;

NorlitJSCompiler.ScopeAnalysis = function ScopeAnalysis(ast) {
	function Symbol(name) {
		this.name = name;
		this.type = "Symbol";
	}

	function DeclScope(outer) {
		this.optimize = true;
		this.outer = outer;
		this.var = [];
	}

	function WithScope(outer) {
		this.optimize = false;
		this.outer = outer;
		outer.disableOptimize();
	}

	function CatchScope(outer, param) {
		this.optimize = true;
		this.outer = outer;
		this.symbol = new Symbol(param);
	}

	function GlobalScope() {
		this.optimize = false;
		this.outer = null;
		this.var = [];
	}

	DeclScope.prototype.declare = GlobalScope.prototype.declare = function(name) {
		for (var i = 0; i < this.var.length; i++) {
			if (this.var[i].name == name) {
				return this.var[i];
			}
		}
		var symbol = new Symbol(name);
		this.var.push(symbol);
		return symbol;
	};

	DeclScope.prototype.resolve = function(name) {
		for (var i = 0; i < this.var.length; i++) {
			if (this.var[i].name == name) {
				return this.var[i];
			}
		}
		return this.outer.resolve(name);
	}

	WithScope.prototype.declare = function(name) {
		return this.outer.declare(name);
	}

	WithScope.prototype.resolve = function(name) {
		return null;
	}

	CatchScope.prototype.declare = function(name) {
		return this.outer.declare(name);
	}

	CatchScope.prototype.resolve = function(name) {
		if (this.symbol.name == name) {
			return this.symbol;
		}
		return this.outer.resolve(name);
	}

	GlobalScope.prototype.resolve = function(name) {
		return undefined;
	}

	DeclScope.prototype.disableOptimize =
		WithScope.prototype.disableOptimize =
		CatchScope.prototype.disableOptimize =
		GlobalScope.prototype.disableOptimize = function() {
			if (this.optimize) {
				this.optimize = false;
				if (this.outer)
					this.outer.disableOptimize();
			}
		}



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
		},
		noLiteralVisit: true
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
					return symbol;
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
		},
		noLiteralVisit: true
	};

	NorlitJSCompiler.Visitor.traverse(ast, identifierResolver);
};