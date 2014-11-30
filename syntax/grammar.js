'use strict';

var NorlitJSCompiler = require("../compiler");
require("./lex");

var Node = NorlitJSCompiler.Node;
var ASTBuilder = NorlitJSCompiler.ASTBuilder;

NorlitJSCompiler.Parser = function() {
	function Grammar(lex, context) {
		this.lex = lex;
		this.context = context;
		this.buffer = [];
		this.strictMode = false;
	}

	Grammar.prototype._getErrorPosition = function(token) {
		if (!token) {
			token = this.lookahead();
		}
		return {
			startOffset: token.startPtr,
			endOffset: token.endPtr
		};
	}

	Grammar.prototype.throwErrorOnToken = function(token, error) {
		if (!token) {
			token = this.lookahead();
		}
		var error = new SyntaxError(error);
		error.detail = this._getErrorPosition(token);
		if (token.type == 'eof') {
			throw error;
		}
		this.context.throwError(error);
	}

	Grammar.prototype.throwWarningOnToken = function(token, error) {
		if (!token) {
			token = this.lookahead();
		}
		var error = new NorlitJSCompiler.Warning(error);
		error.detail = {
			startOffset: token.startPtr,
			endOffset: token.endPtr
		};
		this.context.throwWarning(error);
	}

	Grammar.prototype._throwStrictOnToken = function(token, error) {
		if (this.strictMode) {
			this.throwErrorOnToken(token, error + " is not allowed in strict mode");
		} else {
			this.throwWarningOnToken(token, error + " is discouraged and will not work if in strict mode");
		}
	}

	Grammar.prototype.next = function() {
		if (this.buffer.length) {
			var ret = this.buffer.shift();
		} else {
			var ret = this.lex.nextToken();
		}
		if (ret.noStrict) {
			this._throwStrictOnToken(ret, ret.noStrict);
		}
		return ret;
	}

	Grammar.prototype.lookahead = function() {
		if (this.buffer.length) {
			return this.buffer[0];
		}
		var t = this.lex.nextToken();
		this.buffer.push(t);
		return t;
	}

	Grammar.prototype.lookahead2 = function() {
		switch (this.buffer.length) {
			case 0:
				{
					this.buffer.push(this.lex.nextToken());
					var t = this.lex.nextToken();
					this.buffer.push(t);
					return t;
				}
			case 1:
				{
					var t = this.lex.nextToken();
					this.buffer.push(t);
					return t;
				}
			default:
				return this.buffer[1];
		}
	}

	Grammar.prototype.expect = function(id, errmsg) {
		if (this.lookahead().type == id) {
			return this.next();
		}
		this.throwErrorOnToken(null, errmsg);
		this.next();
		return NorlitJSCompiler.Token.ILLEGAL;
	}

	Grammar.prototype.expectSemicolon = function() {
		var nxt = this.lookahead();
		if (nxt.type == ';') {
			this.next();
			return;
		}
		if (nxt.type == '}' || nxt.lineBefore) {
			return;
		} else {
			this.throwErrorOnToken(null, "Expected semicolon after statement");
		}
	}

	Grammar.prototype.primaryExpr = function() {
		switch (this.lookahead().type) {
			case 'this':
				{
					this.next();
					return new Node("ThisExpression");
				}
			case 'id':
				{
					var ret = new Node("Identifier");
					ret.name = this.next().value;
					return ret;
				}
			case 'null':
				{
					this.next();
					return ASTBuilder.wrapConstant(null);
				}
			case 'true':
				{
					this.next();
					return ASTBuilder.wrapConstant(true);
				}
			case 'false':
				{
					this.next();
					return ASTBuilder.wrapConstant(false);
				}
			case 'num':
				{
					return ASTBuilder.wrapConstant(this.next().value);
				}
			case 'str':
				{
					return ASTBuilder.wrapConstant(this.next().value);
				}
			case '/':
			case '/=':
				{
					var token = this.lex.nextRegexp(this.next());
					var ret = new Node("RegexpLiteral");
					ret.regexp = token.regexp;
					ret.flags = token.flags;
					return ret;
				}
			case '(':
				{
					this.next();
					var expr = this.expression();
					this.expect(')', 'Parenthesis mismatch in expression');
					return expr;
				}
			case '[':
				{
					return this.arrayLiteral();
				}
			case '{':
				{
					return this.objectLiteral();
				}
			default:
				{
					this.throwErrorOnToken(null, 'Expected expression');
					this.next();
					return Node.ILLEGAL;
				}
		}
	}

	Grammar.prototype.arrayLiteral = function() {
		this.next();
		if (this.lookahead().type == ']') {
			this.next();
			var ret = new Node('ArrayInitializer');
			ret.elements = [];
			return ret;
		}
		var ret = new Node('ArrayInitializer');
		ret.elements = [this.arrayElem()];
		while (true) {
			var lh = this.next();
			if (lh.type == ']') {
				return ret;
			} else if (lh.type != ',') {
				this.throwErrorOnToken(null, 'Expected comma or right bracket in array initializer expression');
			}
			if (this.lookahead().type == ']') {
				this.next();
				return ret;
			}
			ret.elements.push(this.arrayElem());
		}
	}

	Grammar.prototype.arrayElem = function() {
		if (this.lookahead().type == ',') {
			return undefined;
		}
		return this.assignExpr();
	}

	Grammar.prototype.objectLiteral = function() {
		this.next();
		this.lex.parseId = false;
		var tk = this.lookahead();
		this.lex.parseId = true;
		if (tk.type == '}') {
			this.next();
			var ret = new Node('ObjectInitializer');
			ret.elements = [];
			return ret;
		}
		var ret = new Node('ObjectInitializer');
		ret.elements = [this.objectLiteralProp()];
		while (true) {
			var lh = this.next();
			if (lh.type == '}') {
				return ret;
			} else if (lh.type != ',') {
				this.throwErrorOnToken(null, 'Expected comma or right brace in object initializer expression');
			}
			this.lex.parseId = false;
			var lhd = this.lookahead();
			this.lex.parseId = true;
			if (lhd.type == '}') {
				this.next();
				return ret;
			}
			var prop = this.objectLiteralProp();
			outer: for (var i = 0; i < ret.elements.length; i++) {
				var ele = ret.elements[i];
				if (ele.key != prop.key) continue;
				switch (prop.type) {
					case 'Property':
						{
							if (ele.type == 'Property') {
								this._throwStrictOnToken(null, 'Defining duplicated data properties in object initializer expression');
							} else {
								this.throwErrorOnToken(null, 'Data property and accessor property with the same name cannot be defined at the same time');
							}
							break;
						}
					case 'Setter':
						{
							if (ele.type == 'Property') {
								this.throwErrorOnToken(null, 'Data property and accessor property with the same name cannot be defined at the same time');
							} else if (ele.type == 'Setter') {
								this.throwErrorOnToken(null, 'Two setters with the same name cannot be defined at the same time');
							}
							break;
						}
					default:
						{
							if (ele.type == 'Property') {
								this.throwErrorOnToken(null, 'Data property and accessor property with the same name cannot be defined at the same time');
							} else if (ele.type == 'Getter') {
								this.throwErrorOnToken(null, 'Two getters with the same name cannot be defined at the same time');
							}
							break;
						}
				}
				break;
			}
			ret.elements.push(prop);
		}
	}

	Grammar.prototype.objectLiteralProp = function() {
		this.lex.parseId = false;
		var name = this.next();
		if (name.type != 'str' && name.type != 'num' && name.type != 'id') {
			this.throwErrorOnToken(name, 'Expected identifier, string or number in object initializer');
			return Node.ILLEGAL;
		}
		var colon = this.next();
		this.lex.parseId = true;
		if (colon.type == ':') {
			if (name.type == 'num') {
				name = String(name.value);
			} else {
				name = name.value;
			}
			var ret = new Node('Property');
			ret.key = name;
			ret.value = this.assignExpr();
			return ret;
		} else {
			if (name.type != 'id' || (name.value != 'get' && name.value != 'set')) {
				this.throwErrorOnToken(colon, 'Expected colon after identifier in object initializer');
				return Node.ILLEGAL;
			}
			if (name.value == 'get') {
				var ret = new Node('Getter');
				ret.key = colon.value;
				this.expect('(', 'Expected left parenthesis in object getter initializer');
				this.expect(')', 'Object getter initializer cannot have parameters');
				this.expect('{', "Expected left brace in object getter declaration");
				ret.body = this.funcBody();
				this.expect('}', "Brace mismatch in object getter declaration");
				return ret;
			} else {
				var ret = new Node('Setter');
				ret.key = colon.value;
				this.expect('(', 'Expected left parenthesis in object setter initializer');
				ret.parameter = this.expect('id', 'Object setter initializer need to have exactly one parameter').value;
				if (ret.parameter == 'eval' || ret.parameter == 'arguments') {
					this._throwStrictOnToken(null, "Overriding eval or arguments");
				}
				this.expect(')', 'Object setter initializer need to have exactly one parameter');
				this.expect('{', "Expected left brace in object setter declaration");
				ret.body = this.funcBody();
				this.expect('}', "Brace mismatch in object setter declaration");
				return ret;
			}
		}
	}

	Grammar.prototype.memberExpr = function() {
		var cur;
		switch (this.lookahead().type) {
			case 'function':
				{
					return this.funcExpr();
				}
			case 'new':
				{
					this.next();
					var expr = this.memberExpr();
					if (this.lookahead().type == '(') {
						var args = this.arguments();
					} else {
						var args = [];
					}
					var ret = new Node('NewExpression');
					ret.constructor = expr;
					ret.arguments = args;
					cur = ret;
					break;
				}
			default:
				cur = this.primaryExpr();
				break;
		}
		while (true) {
			switch (this.lookahead().type) {
				case '.':
					{
						this.next();
						this.lex.parseId = false;
						var id = this.expect('id', 'Expected identifier in member accessing expression');
						this.lex.parseId = true;
						var node = new Node('MemberExpression');
						node.base = cur;
						node.property = ASTBuilder.wrapConstant(id.value);
						cur = node;
						break;
					}
				case '[':
					{
						this.next();
						var expr = this.expression();
						this.expect(']', 'Bracket mismatch in member accessing expression');
						var node = new Node('MemberExpression');
						node.base = cur;
						node.property = expr;
						cur = node;
						break;
					}
				default:
					return cur;
			}
		}
	}

	Grammar.prototype.leftHandExpr = function() {
		var cur = this.memberExpr();
		while (true) {
			switch (this.lookahead().type) {
				case '.':
					{
						this.next();
						this.lex.parseId = false;
						var id = this.expect('id', 'Expected identifier in member accessing expression');
						this.lex.parseId = true;
						id.type = 'str';
						var node = new Node('MemberExpression');
						node.base = cur;
						node.property = ASTBuilder.wrapConstant(id.value);
						cur = node;
						break;
					}
				case '[':
					{
						this.next();
						var expr = this.expression();
						this.expect(']', 'Bracket mismatch in member accessing expression');
						var node = new Node('MemberExpression');
						node.base = cur;
						node.property = expr;
						cur = node;
						break;
					}
				case '(':
					{
						var node = new Node('CallExpression');
						node.callee = cur;
						node.arguments = this.arguments();
						cur = node;
						break;
					}
				default:
					return cur;
			}
		}
	}

	Grammar.prototype.arguments = function() {
		this.next();
		if (this.lookahead().type == ')') {
			this.next();
			return [];
		}
		var ret = [this.assignExpr()];
		while (true) {
			if (this.lookahead().type != ',') {
				this.expect(')', 'Parenthesis mismatch in call or new expression');
				return ret;
			}
			this.next();
			ret.push(this.assignExpr());
		}
	}

	Grammar.prototype.postfixExpr = function() {
		var expr = this.leftHandExpr();
		var nxt = this.lookahead();
		if (nxt.lineBefore || (nxt.type != '++' && nxt.type != '--')) {
			return expr;
		}
		if (expr.type == 'Identifier' && (expr.name == 'eval' || expr.name == 'arguments')) {
			this._throwStrictOnToken(null, "Overriding eval or arguments");
		}
		this.next();
		var ret = new Node('PostfixExpression');
		ret.operator = nxt.type;
		ret.operand = expr;
		return ret;
	}

	Grammar.prototype.unaryExpr = function() {
		switch (this.lookahead().type) {
			case '+':
			case '-':
			case 'delete':
			case 'void':
			case 'typeof':
			case '++':
			case '--':
			case '!':
			case '~':
				break;
			default:
				return this.postfixExpr();
		}
		var node = new Node('UnaryExpression');
		node.operator = this.next().type;
		node.operand = this.unaryExpr();
		if (node.operator == 'delete' && node.operand.type == 'Identifier') {
			this._throwStrictOnToken(null, 'Deleting a unqualified identifier');
		} else if ((node.operator == '++' || node.operator == '--') && node.operand.type == 'Identifier' && (node.operand.name == 'eval' || node.operand.name == 'arguments')) {
			this._throwStrictOnToken(null, "Overriding eval or arguments");
		}
		return node;
	}

	function binaryGen(ops, previous) {
		if (typeof(ops) == "string") {
			return function() {
				var cur = this[previous]();
				while (true) {
					if (this.lookahead().type != ops) {
						return cur;
					}
					var node = new Node("BinaryExpression");
					node.operator = this.next().type;
					node.left = cur;
					node.right = this[previous]();
					cur = node;
				}
			}
		} else {
			return function() {
				var cur = this[previous]();
				while (true) {
					var type = this.lookahead().type;
					if (ops.indexOf(type) == -1) {
						return cur;
					}
					var node = new Node("BinaryExpression");
					node.operator = this.next().type;
					node.left = cur;
					node.right = this[previous]();
					cur = node;
				}
			}
		}
	}

	Grammar.prototype.mulExpr = binaryGen(['*', '%', '/'], "unaryExpr");
	Grammar.prototype.addExpr = binaryGen(['+', '-'], "mulExpr");
	Grammar.prototype.shiftExpr = binaryGen(['<<', '>>', '>>>'], "addExpr");
	Grammar.prototype.relExpr = binaryGen(['<', '>', '<=', '>=', 'instanceof', 'in'], "shiftExpr");
	Grammar.prototype.relExprNoIn = binaryGen(['<', '>', '<=', '>=', 'instanceof'], "shiftExpr");
	Grammar.prototype.eqExpr = binaryGen(['==', '!=', '===', '!=='], "relExpr");
	Grammar.prototype.eqExprNoIn = binaryGen(['==', '!=', '===', '!=='], "relExprNoIn");
	Grammar.prototype.andExpr = binaryGen('&', "eqExpr");
	Grammar.prototype.andExprNoIn = binaryGen('&', "eqExprNoIn");
	Grammar.prototype.xorExpr = binaryGen('^', "andExpr");
	Grammar.prototype.xorExprNoIn = binaryGen('^', "andExprNoIn");
	Grammar.prototype.orExpr = binaryGen('|', "xorExpr");
	Grammar.prototype.orExprNoIn = binaryGen('|', "xorExprNoIn");
	Grammar.prototype.lAndExpr = binaryGen('&&', "orExpr");
	Grammar.prototype.lAndExprNoIn = binaryGen('&&', "orExprNoIn");
	Grammar.prototype.lOrExpr = binaryGen('||', "lAndExpr");
	Grammar.prototype.lOrExprNoIn = binaryGen('||', "lAndExprNoIn");

	Grammar.prototype.condExpr = function(noIn) {
		var node = noIn ? this.lOrExprNoIn() : this.lOrExpr();
		if (this.lookahead().type == '?') {
			var ret = new Node('ConditionalExpression');
			this.next();
			ret.test = node;
			ret.true = this.assignExpr();
			this.expect(':', 'Expected colon in conditional expression');
			ret.false = this.assignExpr(noIn);
			return ret;
		} else {
			return node;
		}
	}

	Grammar.prototype.assignExpr = function(noIn) {
		var node = this.condExpr(noIn);
		switch (this.lookahead().type) {
			case '=':
			case '*=':
			case '/=':
			case '%=':
			case '+=':
			case '-=':
			case '<<=':
			case '>>=':
			case '>>>=':
			case '&=':
			case '|=':
			case '^=':
				break;
			default:
				return node;
		}
		if (node.type == 'Identifier' && (node.name == 'eval' || node.name == 'arguments')) {
			this.throwErrorOnToken(null, "Overriding eval or arguments");
		}
		var ret = new Node('AssignmentExpression');
		ret.operator = this.next().type;
		ret.left = node;
		ret.right = this.assignExpr(noIn);
		return ret;
	}
	Grammar.prototype.assignExprNoIn = function() {
		return this.assignExpr(true);
	}

	Grammar.prototype.expression = binaryGen(',', 'assignExpr');
	Grammar.prototype.expressionNoIn = binaryGen(',', 'assignExprNoIn');

	Grammar.prototype.statement = function() {
		switch (this.lookahead().type) {
			case '{':
				return this.block();
			case 'var':
				return this.varStmt();
			case ';':
				this.next();
				return Node.EMPTY;
			case 'if':
				return this.ifStmt();
			case 'do':
				return this.doStmt();
			case 'while':
				return this.whileStmt();
			case 'for':
				return this.forStmt();
			case 'continue':
				return this.continueStmt();
			case 'break':
				return this.breakStmt();
			case 'return':
				return this.returnStmt();
			case 'with':
				this._throwStrictOnToken(null, 'With statement');
				return this.withStmt();
			case 'switch':
				return this.switchStmt();
			case 'throw':
				return this.throwStmt();
			case 'try':
				return this.tryStmt();
			case 'debugger':
				{
					this.next();
					this.expectSemicolon();
					return new Node('DebuggerStatement');
				}
			case 'id':
				{
					if (this.lookahead2().type == ':') {
						return this.labelStmt();
					}
				}
			default:
				return this.exprStmt();
		}
	}

	Grammar.prototype.block = function() {
		this.expect('{', 'Expected left brace in block statement');
		if (this.lookahead().type == '}') {
			this.next();
			var block = new Node('BlockStatement');
			block.body = [];
			return block;
		}
		var block = new Node('BlockStatement');
		block.body = [this.statement()];
		while (true) {
			if (this.lookahead().type == '}') {
				this.next();
				return block;
			}
			block.body.push(this.statement());
		}
	}

	Grammar.prototype.varStmt = function() {
		this.next();
		var ret = this.varDeclList();
		this.expectSemicolon();
		return ret;
	}

	Grammar.prototype.varDeclList = function() {
		var varDecl = new Node('VariableDeclaration');
		varDecl.declarations = [];
		do {
			var ret = new Node('VariableDeclarator');
			ret.name = this.expect('id', 'Expected identifier in variable declaration').value;
			if (ret.name == 'eval' || ret.name == 'arguments') {
				this._throwStrictOnToken(null, "Overriding eval or arguments");
			}
			if (this.lookahead().type == '=') {
				this.next();
				ret.init = this.assignExpr();
			} else {
				ret.init = undefined;
			}
			varDecl.declarations.push(ret);
			if (this.lookahead().type != ',') return varDecl;
			this.next();
		} while (true);
	}

	Grammar.prototype.exprStmt = function() {
		var expr = this.expression();
		this.expectSemicolon();
		var ret = new Node('ExpressionStatement');
		ret.expression = expr;
		return ret;
	}

	Grammar.prototype.ifStmt = function() {
		this.next();
		var ret = new Node('IfStatement');
		this.expect('(', 'Expected left parenthesis after if');
		ret.test = this.expression();
		this.expect(')', 'Parenthesis mismatch in if statement');
		ret.true = this.statement();
		if (this.lookahead().type == 'else') {
			this.next();
			ret.false = this.statement();
		} else {
			ret.false = undefined;
		}
		return ret;
	}

	Grammar.prototype.doStmt = function() {
		this.next();
		var ret = new Node('DoStatement');
		ret.body = this.statement();
		this.expect('while', 'Expected keyword while in do while statement');
		this.expect('(', 'Expected left parenthesis in do while statement');
		ret.test = this.expression();
		this.expect(')', 'Parenthesis mismatch in do while statement');
		this.expectSemicolon();
		return ret;
	}

	Grammar.prototype.whileStmt = function() {
		this.next();
		var ret = new Node('WhileStatement');
		this.expect('(', 'Expected left parenthesis after while');
		ret.test = this.expression();
		this.expect(')', 'Parenthesis mismatch in while statement');
		ret.body = this.statement();
		return ret;
	}

	Grammar.prototype.forStmt = function() {
		this.next();
		this.expect('(', 'Expected left parenthesis after for');
		if (this.lookahead().type == 'var') {
			var isVar = true;
			this.next();
			var initExpr = this.varDeclList();
		} else {
			var isVar = false;
			if (this.lookahead().type != ';') {
				var initExpr = this.expressionNoIn();
			} else {
				var initExpr = undefined;
			}
		}
		if (this.lookahead().type == 'in') {
			this.next();
			if (initExpr.type == 'VariableDeclaration') {
				if (initExpr.declarations.length != 1) {
					this.throwErrorOnToken(null, "Too many variable declarations for a for-in statement");
				}
				initExpr = initExpr.declarations[0];
			}
			var ret = new Node('ForInStatement');
			ret.var = initExpr;
			ret.container = this.expression();
			this.expect(')', 'Parenthesis mismatch in for-in statement');
			ret.body = this.statement();
			return ret;
		} else {
			this.expect(';', "Expected semicolon in for statement");
			if (this.lookahead().type != ';') {
				var testExpr = this.expression();
			} else {
				var testExpr = undefined;
			}
			this.expect(';', "Expected semicolon in for statement");
			if (this.lookahead().type != ')') {
				var incExpr = this.expression();
			} else {
				var incExpr = undefined;
			}
			this.expect(')', "Parenthesis mismatch in for statement");
			var ret = new Node('ForStatement');
			ret.init = initExpr;
			ret.test = testExpr;
			ret.inc = incExpr;
			ret.body = this.statement();
			return ret;
		}
	}

	Grammar.prototype.withStmt = function() {
		this.next();
		var ret = new Node('WithStatement');
		this.expect('(', "Expected left parenthesis after with");
		ret.base = this.expression();
		this.expect(')', "Parenthesis mismatch in with statement");
		ret.body = this.statement();
		return ret;
	}

	Grammar.prototype.switchStmt = function() {
		this.next();
		var ret = new Node('SwitchStatement');
		this.expect('(', "Expected left parenthesis after switch");
		ret.expression = this.expression();
		this.expect(')', "Parenthesis mismatch in switch statement");
		ret.body = this.caseBlock();
		return ret;
	}

	Grammar.prototype.caseBlock = function() {
		this.expect('{', "Expected left brace in case block");
		var list = [];
		var def = false;
		while (true) {
			var lhd = this.next();
			if (lhd.type == 'case') {
				var key = this.expression();
			} else if (lhd.type == 'default') {
				if (def) {
					this.throwErrorOnToken(null, "Only one default clause is permitted in switch statement");
				}
				def = true;
				var key = undefined;
			} else if (lhd.type == '}') {
				return list;
			} else {
				if (lastError != list.length) {
					this.throwErrorOnToken(lhd, "Expected case clause or default clause");
					var lastError = list.length;
				} else {
					this.context.lastError().detail.endOffset = this._getErrorPosition(lhd).endOffset;
				}
				continue;
			}
			this.expect(':', 'Expected colon in case clause');
			var stmt = [];
			while (true) {
				lhd = this.lookahead();
				if (lhd.type != 'case' && lhd.type != 'default' && lhd.type != '}') {
					stmt.push(this.statement());
				} else {
					break;
				}
			}
			var clause = new Node('CaseClause');
			clause.key = key;
			clause.body = stmt;
			list.push(clause);
		}
	}

	Grammar.prototype.returnStmt = function() {
		this.next();
		var lhd = this.lookahead();
		if (lhd.type == ';') {
			this.next();
			var ret = new Node('ReturnStatement');
			ret.expression = undefined;
			return ret;
		} else if (lhd.type == '}' || lhd.lineBefore) {
			var ret = new Node('ReturnStatement');
			ret.expression = undefined;
			return ret;
		}
		var ret = new Node('ReturnStatement');
		ret.expression = this.expression();
		this.expectSemicolon();
		return ret;
	}

	Grammar.prototype.continueStmt = function() {
		this.next();
		var lhd = this.lookahead();
		if (lhd.type == 'id' && !lhd.lineBefore) {
			var ret = new Node('ContinueStatement');
			ret.label = this.next().value;
			this.expectSemicolon();
			return ret;
		}
		var ret = new Node('ContinueStatement');
		ret.label = undefined;
		this.expectSemicolon();
		return ret;
	}

	Grammar.prototype.breakStmt = function() {
		this.next();
		var lhd = this.lookahead();
		if (lhd.type == 'id' && !lhd.lineBefore) {
			var ret = new Node('BreakStatement');
			ret.label = this.next().value;
			this.expectSemicolon();
			return ret;
		}
		var ret = new Node('BreakStatement');
		ret.label = undefined;
		this.expectSemicolon();
		return ret;
	}

	Grammar.prototype.labelStmt = function() {
		var ret = new Node('LabeledStatement');
		ret.label = this.next().value;
		this.next();
		ret.body = this.statement();
		return ret;
	}

	Grammar.prototype.throwStmt = function() {
		this.next();
		var ret = new Node('ThrowStatement');
		if (this.lookahead().lineBefore) {
			this.throwErrorOnToken(null, "Expected Expression in throw statement");
			ret.expression = Node.ILLEGAL;
			return ret;
		}
		ret.expression = this.expression();
		this.expectSemicolon();
		return ret;
	}

	Grammar.prototype.tryStmt = function() {
		this.next();
		var ret = new Node('TryStatement');
		ret.body = this.block();
		if (this.lookahead().type == 'finally') {
			this.next();
			ret.parameter = ret.catch = undefined;
			ret.finally = this.block();
			return ret;
		}
		this.expect('catch', "Expected catch or finally after try block");
		this.expect('(', "Expected left parenthesis in catch block");
		ret.parameter = this.expect('id', "Expected identifier in catch block").value;
		if (ret.parameter == 'eval' || ret.parameter == 'arguments') {
			this._throwStrictOnToken(null, "Overriding eval or arguments");
		}
		this.expect(')', "Parenthesis mismatch in catch block");
		ret.catch = this.block();
		if (this.lookahead().type == 'finally') {
			this.next();
			ret.finally = this.block();
		} else {
			ret.finally = undefined;
		}
		return ret;
	}

	Grammar.prototype.funcDecl = function() {
		var func = this.funcExpr();
		if (!func.name) {
			this.throwErrorOnToken(null, "Expected function name in function declaration");
		}
		func.type = 'FunctionDeclaration';
		return func;
	}

	Grammar.prototype.funcExpr = function() {
		this.next();
		var func = new Node('FunctionExpression');
		if (this.lookahead().type == 'id') {
			func.name = this.next().value;
			if (func.name == 'eval' || func.name == 'arguments') {
				this._throwStrictOnToken(null, "Overriding eval or arguments");
			}
		} else {
			func.name = undefined;
		}
		this.expect('(', "Expected left parenthesis or function name in function expression");
		if (this.lookahead().type == 'id') {
			func.parameter = this.formalParamList();
		} else {
			func.parameter = [];
		}
		this.expect(')', "Parenthesis mismatch in function declaration");
		this.expect('{', "Expected left brace in function declaration");
		func.body = this.funcBody();
		this.expect('}', "Brace mismatch in function declaration");
		return func;
	}

	Grammar.prototype.formalParamList = function() {
		var ret = [];
		do {
			var name = this.expect('id', "Expected identifier in function parameter list").value;
			if (name == 'eval' || name == 'arguments') {
				this._throwStrictOnToken(null, "Overriding eval or arguments");
			} else if (ret.indexOf(name) != -1) {
				this._throwStrictOnToken(null, 'Using duplicate parameter names');
			}
			ret.push(name);
			if (this.lookahead().type != ',') {
				return ret;
			}
			this.next();
		} while (true);
	}

	Grammar.prototype.funcBody = function() {
		var body = [];
		var originalStrict = this.strictMode;
		while (true) {
			var next = this.lookahead();
			if (next.type != 'str') {
				break;
			}
			var nextToken = this.lookahead2();
			if (nextToken.type != ';') {
				var stmt = this.exprStmt();
				if (this.lookahead() != nextToken) {
					body.push(stmt);
					break;
				}
			} else {
				this.next();
				this.next();
			}
			var raw = this.lex.getRaw(next);
			if (raw.substr(1, raw.length - 2) == 'use strict') {
				this.strictMode = true;
			}
			var dir = new Node('DirectiveStatement');
			dir.value = next.value;
			dir.raw = raw;
			body.push(dir);
		}
		while (true) {
			var next = this.lookahead();
			if (next.type == 'eof' || next.type == '}') {
				this.strictMode = originalStrict;
				return body;
			}
			var stmt = this.sourceElement();
			body.push(stmt);
		}
	}

	Grammar.prototype.sourceElement = function() {
		if (this.lookahead().type == 'function') {
			return this.funcDecl();
		} else {
			return this.statement();
		}
	}

	Grammar.prototype.program = function() {
		var program = new Node('Program');
		program.body = this.funcBody();
		this.expect('eof', 'Unexpected right brace at end of program');
		return program;
	}

	return function(lex, context) {
		if (!(lex instanceof NorlitJSCompiler.Lex)) {
			lex = new NorlitJSCompiler.Lex(lex, context);
		}
		var g = new Grammar(lex, context);
		try {
			var ret = g.program();
		} catch (e) {
			context.throwError(e);
		}
		return ret;
	}
}();