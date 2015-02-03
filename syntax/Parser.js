import Assertion from '../util/Assertion';
import Scanner from './Scanner';
import {
	Identifier
}
from './tree/Token';
import {
	ArrayPattern,
	ObjectPattern,
	DefaultParameter,

	ArrayLiteral,
	ObjectLiteral,
	PropertyDefinition,
	TemplateLiteral,
	CoveredFormals,
	CoverInitializedName,

	NewTargetExpression,
	SuperCallExpression,
	SuperPropertyExpression,
	NewExpression,
	CallExpression,
	MemberExpression,
	TaggedTemplateExpression,
	SpreadExpression,

	PostfixExpression,
	UnaryExpression,
	BinaryExpression,
	ConditionalExpression
}
from './tree/Expression';
import {
	BlockStatement,
	VariableDeclaration,
	VariableDeclarator,
	EmptyStatement,
	IfStatement,
	DoStatement,
	WhileStatement,
	ForStatement,
	ForInStatement,
	ForOfStatement,
	ContinueStatement,
	BreakStatement,
	ReturnStatement,
	WithStatement,
	SwitchStatement,
	CaseClause,
	LabelledStatement,
	ThrowStatement,
	TryStatement,
	DebuggerStatement,
	ExpressionStatement,
	DirectiveStatement
}
from './tree/Statement';
import {
	FunctionExpression,
	FunctionDeclaration,
	ArrowFunction,
	ClassExpression,
	ClassDeclaration,
	MethodDefinition,
	YieldExpression,
	GetterDefinition,
	SetterDefinition
}
from './tree/Function';
import {
	Script,
	ImportDeclaration,
	ExportFrom,
	ExportDeclaration,
	ExportDefault,
	Module
}
from './tree/Module';

class Parser {
	constructor(ctx, scanner) {
		this.context = ctx;
		if (typeof(scanner) === 'string') {
			scanner = new Scanner(ctx, scanner);
		}
		this.scanner = scanner;

		this._buffer = [];
		this._lastToken = [];
		this._locationStack = [];
		this._allowYield = false;
		this._strictMode = false;
	}

	_throw(msg, unit) {
		console.log(unit);
		const range = unit ? unit.range : [this._locationStack[this._locationStack.length - 1], this._lastToken.range[1]];
		const err = new SyntaxError(msg);
		err.range = range;
		err.source = this.scanner;
		this.context.error(err);
	}

	_fetchToken() {
		const token = this.scanner.nextToken();
		if (this._strictMode && token.strictModeError) {
			this._throw(token.strictModeError, token);
		}
		return token;
	}

	_lookahead(n = 1) {
		if (this._buffer.length < n) {
			for (let i = this._buffer.length; i < n; i++) {
				this._buffer.push(this._fetchToken());
			}
		}
		return this._buffer[n - 1];
	}

	_peekType(n = 1) {
		return this._lookahead(n).type;
	}

	_next() {
		if (this._buffer.length) {
			return this._lastToken = this._buffer.shift();
		} else {
			return this._lastToken = this._fetchToken();
		}
	}

	_consume(n = 1) {
		if (this._buffer.length) {
			this._lastToken = this._buffer.shift();
		} else {
			this._lastToken = this._fetchToken();
		}
		if (n > 1) {
			this._consume(n - 1);
		}
	}

	_consumeIf(type) {
		if (this._peekType() === type) {
			this._consume();
			return true;
		}
		return false;
	}

	_expect(type) {
		const token = this._next();
		if (token.type !== type) {
			this._throw(`Expected ${type} while encountering ${token.type}`);
		}
		return token;
	}

	_expectIdentifier(val) {
		const id = this._expect('Identifier');
		if (id.value !== val) {
			this._throw(`Expected ${val} but encountered ${id.value}`);
		}
	}

	_start(unit) {
		if (unit) {
			this._locationStack.push(unit.range[0]);
		} else {
			this._locationStack.push(this._lookahead().range[0]);
		}
	}

	_end() {
		return [this._locationStack.pop(), this._lastToken.range[1]];
	}

	_wrap(unit) {
		unit.range = this._end();
		return unit;
	}

	/* 11.9 Automatic Semicolon Insertion */
	_consumeSemicolon() {
		const nxt = this._lookahead();
		if (nxt.type == ';') {
			this._consume();
			return;
		}
		if (nxt.type == '}' || nxt.lineBefore) {
			return;
		} else {
			this._throw("Expected semicolon after statement");
		}
	}

	_yieldAsIdentifier() {
		if (this._allowYield || this._strictMode) {
			this._throw('Yield cannot be used as an identifier');
		}
		const id = new Identifier('yield');
		id.range = this._next().range;
		return id;
	}

	_identifierWithYield() {
		if (this._peekType() === 'yield') {
			return this._yieldAsIdentifier();
		} else {
			return this._expect('Identifier');
		}
	}

	_backtrace(loc) {
		this.scanner.pointer = loc;
		this._buffer = [];
	}

	_hasLineTerminator() {
		return this._lookahead().lineBefore;
	}

	_ensureNoLineTerminator() {
		if (this._hasLineTerminator()) {
			this._throw('Unexpected line terminator');
		}
	}

	/* 12.2 Primary Expression */
	parsePrimaryExpression() {
		switch (this._peekType()) {
			/* 12.2.1 The this Keyword */
			case 'this':
				return this._next();
				/* Inline: 12.1 Identifier */
			case 'yield':
				return this._yieldAsIdentifier();
			case 'Identifier':
				return this._next();
				/* 12.2.3 Literal */
			case 'null':
			case 'true':
			case 'false':
			case 'Number':
			case 'String':
				return this._next();
			case '[':
				return this.parseArrayLiteral();
			case '{':
				return this.parseObjectLiteral();
			case 'function':
				return this.parseFunctionOrGenerator();
			case 'class':
				return this.parseClass();
				/* 12.2.7 Regular Expression Literals */
			case '/':
			case '/=':
				{
					const div = this._next();
					Assertion.assert(this._buffer.length === 0);
					return this.scanner.nextRegexp(div);
				}
				/* 12.2.8 Template Literals */
			case 'NoSubstitutionTemplate':
				return this._next();
			case 'TemplateHead':
				return this.parseTemplate();
				/* 12.2.9 The Grouping Operator */
			case '(':
				this._start();
				return this._wrap(new CoveredFormals(this.parseArguments()));

			default:
				this._throw(`Unexpected ${this._peekType()} when parsing expression`);
		}
	}

	/* 12.2.4 Array Initializer */
	parseArrayLiteral() {
		this._start();
		this._expect('[');
		let elements = [];
		loop: do {
			switch (this._peekType()) {
				case '...':
					this._start();
					this._consume();
					elements.push(this._wrap(new SpreadExpression(this.parseAssignment())));
					break;
				case ',':
					elements.push(null);
					break;
				case ']':
					break loop;
				default:
					elements.push(this.parseAssignment());
					break;
			}
		} while (this._consumeIf(','));
		this._expect(']');
		return this._wrap(new ArrayLiteral(elements));
	}

	/* 12.2.5 Object Initializer */
	parseObjectLiteral() {
		this._start();
		this._expect('{');
		let elements = [];
		loop: do {
			this.scanner.resolveIdentifierName = false;
			Assertion.assert(this._buffer.length === 0);
			const name = this._lookahead();
			this.scanner.resolveIdentifierName = true;

			switch (name.type) {
				case '}':
					break loop;
				case '*':
					elements.push(this.parseMethodDefinition());
					break;
				case 'String':
				case 'Number':
					if (this._peekType(2) === '(') {
						elements.push(this.parseMethodDefinition());
					} else {
						this._start();
						this._consume();
						this._expect(':');
						const value = this.parseAssignment();
						elements.push(this._wrap(new PropertyDefinition(name, value)));
					}
					break;
				case '[':
					{
						this._start();
						this._consume();
						const key = this.parseAssignment();
						this._expect(']');
						if (this._peekType() === '(') {
							throw 'METHOD'; //TODO
						}
						this._expect(':');
						const value = this.parseAssignment();
						elements.push(this._wrap(new PropertyDefinition(key, value, true)));
						break;
					}
				case 'Identifier':
					{
						this.scanner.resolveIdentifierName = false;
						const lookahead = this._lookahead(2);
						this.scanner.resolveIdentifierName = true;

						switch (lookahead.type) {
							case ':':
								{
									this._start();
									this._consume(2);
									const value = this.parseAssignment();
									elements.push(this._wrap(new PropertyDefinition(name, value)));
									break;
								}
							case '[':
							case 'Identifier':
								elements.push(this.parseMethodDefinition());
								break;
							case '(':
								elements.push(this.parseMethodDefinition());
								break;
							case '=':
								{
									this._start();
									this._consume(2);
									const value = this.parseAssignment();
									elements.push(this._wrap(new CoverInitializedName(name, value)));
									break;
								}
							default:
								{
									this._consume();
									if (this.scanner.resolveIdentifier(name).type !== 'Identifier') {
										this._throw('Reserved words cannot be used as identifier reference');
									}
									elements.push(name);
									break;
								}
						}
						break;
					}
				default:
					this._throw('Expected property definition in object literal');
			}
		} while (this._consumeIf(','));
		this._expect('}');
		return this._wrap(new ObjectLiteral(elements));
	}

	/* 12.2.8 Template Literals */
	parseTemplate() {
		this._start();
		const literal = [this._expect('TemplateHead')];
		const substitution = [];
		do {
			substitution.push(this.parseExpression());
			const rightbrace = this._next();
			/* Whenever read from scanner using method other than _fetchToken,
			 * make sure buffer is empty */
			Assertion.assert(this._buffer.length === 0);
			const middleOrTail = this.scanner.nextTemplateSubstitutionTail(rightbrace);
			literal.push(middleOrTail);
			if (middleOrTail.type == 'TemplateTail') {
				return this._wrap(new TemplateLiteral(literal, substitution));
			}
		} while (true);
	}

	/* 12.3 Left-Hand-Side Expressions */
	parseLeftHandSide(noCall = false) {
		let expr;
		switch (this._peekType()) {
			case 'new':
				{
					this._start();
					this._consume();
					if (this._consumeIf('.')) {
						this._expectIdentifier('target');
						expr = this._wrap(new NewTargetExpression());
						break;
					}
					const constructor = this.parseLeftHandSide(true);
					if (this._peekType() !== '(') {
						/* new NewExpression */
						return this._wrap(new NewExpression(constructor));
					}
					/* new MemberExpression Arguments */
					const args = this.parseArguments();
					expr = this._wrap(new NewExpression(constructor, args));
					break;
				}
			case 'super':
				/* SuperProperty */
				this._start();
				this._consume();
				switch (this._peekType()) {
					case '.':
						{
							this._consume();
							Assertion.assert(this._buffer.length === 0);
							this.scanner.resolveIdentifierName = false;
							const id = this._expect('Identifier');
							this.scanner.resolveIdentifierName = true;
							expr = this._wrap(new SuperPropertyExpression(id, false));
							break;
						}
					case '[':
						{
							this._consume();
							const exp = this.parseExpression();
							this._expect(']');
							expr = this._wrap(new SuperPropertyExpression(exp));
							break;
						}
					case '(':
						{
							const args = this.parseArguments();
							expr = this._wrap(new SuperCallExpression(args));
							break;
						}
					default:
						this._throw('`super` keyword should be used as property access, new, or constructor call');
				}
				break;
			default:
				expr = this.parsePrimaryExpression();
		}
		while (true) {
			this._start(expr);
			switch (this._peekType()) {
				case '.':
					{
						this._consume();
						Assertion.assert(this._buffer.length === 0);
						this.scanner.resolveIdentifierName = false;
						const id = this._expect('Identifier');
						this.scanner.resolveIdentifierName = true;
						expr = this._wrap(new MemberExpression(expr, id, false));
						break;
					}
				case '[':
					{
						this._consume();
						const exp = this.parseExpression();
						this._expect(']');
						expr = this._wrap(new MemberExpression(expr, exp));
						break;
					}
				case '(':
					{
						if (noCall) {
							this._end();
							return expr;
						}
						const args = this.parseArguments();
						expr = this._wrap(new CallExpression(expr, args));
						break;
					}
				case 'NoSubstitutionTemplate':
					expr = this._wrap(new TaggedTemplateExpression(expr, this._next()));
					break;
				case 'TemplateHead':
					expr = this._wrap(new TaggedTemplateExpression(expr, this.parseTemplate()));
					break;
				default:
					this._end();
					return expr;
			}
		}
	}

	parseArguments() {
		this._expect('(');
		if (this._peekType() === ')') {
			this._consume();
			return [];
		}
		let args = [];
		while (true) {
			if (this._peekType() === '...') {
				this._start();
				this._consume();
				args.push(this._wrap(new SpreadExpression(this.parseAssignment())));
			} else {
				args.push(this.parseAssignment());
			}
			if (this._peekType() !== ',') {
				this._expect(')');
				return args;
			}
			this._consume();
		}
	}

	parsePostfix() {
		const expr = this.parseLeftHandSide();
		const lookahead = this._lookahead();
		if (!lookahead.lineBefore && (lookahead.type === '++' || lookahead.type === '--')) {
			this._start(expr);
			this._consume();
			return this._wrap(new PostfixExpression(expr, lookahead.type));
		} else {
			return expr;
		}
	}

	parseUnary() {
		switch (this._peekType()) {
			case 'delete':
			case 'void':
			case 'typeof':
			case '++':
			case '--':
			case '+':
			case '-':
			case '~':
			case '!':
				{
					this._start();
					const operator = this._next().type;
					return this._wrap(new UnaryExpression(this.parseUnary(), operator));
				}
			default:
				return this.parsePostfix();
		}
	}

	parseMultiplicative() {
		let expr = this.parseUnary();
		while (true) {
			switch (this._peekType()) {
				case '*':
				case '/':
				case '%':
					{
						this._start(expr);
						const operator = this._next().type;
						const right = this.parseUnary();
						expr = this._wrap(new BinaryExpression(operator, expr, right));
						break;
					}
				default:
					return expr;
			}
		}
	}

	parseAdditive() {
		let expr = this.parseMultiplicative();
		while (true) {
			switch (this._peekType()) {
				case '+':
				case '-':
					{
						this._start(expr);
						const operator = this._next().type;
						const right = this.parseMultiplicative();
						expr = this._wrap(new BinaryExpression(operator, expr, right));
						break;
					}
				default:
					return expr;
			}
		}
	}

	/* 12.8 Bitwise Shift Operators */
	parseShift() {
		let expr = this.parseAdditive();
		while (true) {
			switch (this._peekType()) {
				case '<<':
				case '>>':
				case '>>>':
					{
						this._start(expr);
						const operator = this._next().type;
						const right = this.parseAdditive();
						expr = this._wrap(new BinaryExpression(operator, expr, right));
						break;
					}
				default:
					return expr;
			}
		}
	}

	/* 12.9 Relational Operators */
	parseRelational(noIn) {
		let expr = this.parseShift();
		while (true) {
			switch (this._peekType()) {
				case 'in':
					if (noIn) {
						return expr;
					}
				case '<':
				case '>':
				case '<=':
				case '>=':
				case 'instanceof':
					{
						this._start(expr);
						const operator = this._next().type;
						const right = this.parseShift();
						expr = this._wrap(new BinaryExpression(operator, expr, right));
						break;
					}
				default:
					return expr;
			}
		}
	}

	/* 12.10 Equality Operators */
	parseEquality(noIn) {
		let expr = this.parseRelational(noIn);
		while (true) {
			switch (this._peekType()) {
				case '==':
				case '!=':
				case '===':
				case '!==':
					{
						this._start(expr);
						const operator = this._next().type;
						const right = this.parseRelational(noIn);
						expr = this._wrap(new BinaryExpression(operator, expr, right));
						break;
					}
				default:
					return expr;
			}
		}
	}

	/* 12.11 Binary Bitwise Operators */
	parseBitwiseAnd(noIn) {
		let expr = this.parseEquality(noIn);
		while (this._peekType() === '&') {
			this._start(expr);
			this._consume();
			expr = this._wrap(new BinaryExpression('&', expr, this.parseEquality(noIn)));
		}
		return expr;
	}

	parseBitwiseXor(noIn) {
		let expr = this.parseBitwiseAnd(noIn);
		while (this._peekType() === '^') {
			this._start(expr);
			this._consume();
			expr = this._wrap(new BinaryExpression('^', expr, this.parseBitwiseAnd(noIn)));
		}
		return expr;
	}

	parseBitwiseOr(noIn) {
		let expr = this.parseBitwiseXor(noIn);
		while (this._peekType() === '|') {
			this._start(expr);
			this._consume();
			expr = this._wrap(new BinaryExpression('|', expr, this.parseBitwiseXor(noIn)));
		}
		return expr;
	}

	/* 12.12 Binary Logical Operators */
	parseLogicalAnd(noIn) {
		let expr = this.parseBitwiseOr(noIn);
		while (this._peekType() === '&&') {
			this._start(expr);
			this._consume();
			expr = this._wrap(new BinaryExpression('&&', expr, this.parseBitwiseOr(noIn)));
		}
		return expr;
	}

	parseLogicalOr(noIn) {
		let expr = this.parseLogicalAnd(noIn);
		while (this._peekType() === '||') {
			this._start(expr);
			this._consume();
			expr = this._wrap(new BinaryExpression('||', expr, this.parseLogicalAnd(noIn)));
		}
		return expr;
	}

	/* 12.13 Conditional Operator ( ? : ) */
	parseConditional(noIn) {
		const expr = this.parseLogicalOr(noIn);
		if (this._peekType() !== '?') {
			return expr;
		}
		this._start(expr);
		this._consume();
		const trueExpr = this.parseAssignment();
		this._expect(':');
		const falseExpr = this.parseAssignment(noIn);
		return this._wrap(new ConditionalExpression(expr, trueExpr, falseExpr));
	}

	/* 12.14 Assignment Operators */
	parseAssignment(noIn = false) {
		const peekType = this._peekType();
		if (this._allowYield && peekType === 'yield') {
			this._next();
			if (this._lookahead().lineBefore) {
				return new YieldExpression();
			}
			if (this._consumeIf('*')) {
				return new YieldExpression(this.parseAssignment(noIn), true);
			} else {
				return new YieldExpression(this.parseAssignment(noIn));
			}
		} else if ((peekType === 'Identifier' || peekType === 'yield') && this._peekType(2) === '=>') {
			return this.parseArrowFunction(this._next());
		}
		let expr = this.parseConditional(noIn);
		switch (this._peekType()) {
			case '=>':
				if (expr instanceof CoveredFormals) {
					return this.parseArrowFunction(expr);
				} else {
					this._throw('Illegal arrow parameter');
					break;
				}
			case '=':
				{
					if (expr instanceof ArrayLiteral) {
						expr = this.parseArrayPattern(true, expr);
					} else if (expr instanceof ObjectLiteral) {
						expr = this.parseObjectPattern(true, expr);
					} {
						this._start(expr);
						const operator = this._next().type;
						return this._wrap(new BinaryExpression('=', expr, this.parseAssignment(noIn)));
					}
				}
			case '*=':
			case '/=':
			case '%=':
			case '+=':
			case '-=':
			case '<<=':
			case '>>=':
			case '>>>=':
			case '&=':
			case '^=':
			case '|=':
				{
					this._start(expr);
					const operator = this._next().type;
					return this._wrap(new BinaryExpression(operator, expr, this.parseAssignment(noIn)));
				}
			default:
				return expr;
		}
	}

	/* 12.14.5 Destructuring Assignment
	 * 13.2.3 Destructuring Binding Patterns
	 */
	parseDestructuringTarget(inAssignment = false) {
		if (inAssignment) {
			const expr = this.parseLeftHandSide();
			// Remove parenthesis
			if (expr instanceof ArrayLiteral) {
				return this.parseArrayPattern(true, expr);
			} else if (expr instanceof ObjectLiteral) {
				return this.parseObjectPattern(true, expr);
			} else {
				return expr;
			}
		} else {
			switch (this._peekType()) {
				case 'yield':
					return this._yieldAsIdentifier();
				case 'Identifier':
					return this._next();
				case '{':
					return this.parseObjectPattern();
				case '[':
					return this.parseArrayPattern();
				default:
					this._throw('Illegal binding element');
			}
		}
	}

	parseObjectPattern(inAssignment = false, lhsExpr) {
		if (lhsExpr) {
			this._backtrace(lhsExpr.range[0]);
		}
		this._start();
		this._expect('{');
		const elements = [];
		loop: do {
			this.scanner.resolveIdentifierName = false;
			Assertion.assert(this._buffer.length === 0);
			const name = this._lookahead();
			this.scanner.resolveIdentifierName = true;

			let prop;
			switch (name.type) {
				case '}':
					break loop;
				case 'String':
				case 'Number':
					{
						this._start();
						this._consume();
						this._expect(':');
						const target = this.parseDestructuringTarget(inAssignment);
						prop = this._wrap(new PropertyDefinition(name, target));
					}
					break;
				case '[':
					{
						this._start();
						this._consume();
						const key = this.parseAssignment();
						this._expect(']');
						this._expect(':');
						const target = this.parseDestructuringTarget(inAssignment);
						prop = this._wrap(new PropertyDefinition(key, target, true));
					}
					break;
				case 'Identifier':
					{
						this._consume();
						if (this._peekType() === ':') {
							this._start(name);
							this._consume();
							const target = this.parseDestructuringTarget(inAssignment);
							prop = this._wrap(new PropertyDefinition(name, target));
						} else {
							if (this.scanner.resolveIdentifier(name).type !== 'Identifier') {
								this._throw('Reserved words cannot be used as binding identfier', name);
							}
							prop = name;
						}
						break;
					}
				default:
					this._throw('Expected property definition in object literal');
			}
			if (this._consumeIf('=')) {
				this._start(prop);
				const def = this.parseAssignment();
				elements.push(this._wrap(new DefaultParameter(prop, def)));
			} else {
				elements.push(prop);
			}
		} while (this._consumeIf(','));
		this._expect('}');
		const ret = this._wrap(new ObjectPattern(elements));
		if (lhsExpr)
			Assertion.assert(ret.range[1] === lhsExpr.range[1]);
		return ret;
	}

	parseArrayPattern(inAssignment = false, lhsExpr) {
		if (lhsExpr) {
			this._backtrace(lhsExpr.range[0]);
		}
		this._start();
		this._expect('[');
		const elements = [];
		loop: do {
			switch (this._peekType()) {
				case '...':
					this._start();
					this._consume();
					elements.push(this._wrap(new SpreadExpression(this._identifierWithYield())));
					break loop;
				case ',':
					elements.push(null);
					break;
				case ']':
					break loop;
				default:
					{
						const target = this.parseDestructuringTarget(inAssignment);
						if (this._consumeIf('=')) {
							this._start(target);
							const def = this.parseAssignment();
							elements.push(this._wrap(new DefaultParameter(target, def)));
						} else {
							elements.push(target);
						}
					}
			}
		} while (this._consumeIf(','));
		this._expect(']');
		const ret = this._wrap(new ArrayPattern(elements));
		if (lhsExpr)
			Assertion.assert(ret.range[1] === lhsExpr.range[1]);
		return ret;
	}

	/* 12.15 Comma Operator ( , ) */
	parseExpression(noIn = false) {
		let expr = this.parseAssignment(noIn);
		while (this._peekType() === ',') {
			this._start(expr);
			this._consume();
			expr = this._wrap(new BinaryExpression(',', expr, this.parseAssignment(noIn)));
		}
		return expr;
	}

	/* 13 ECMAScript Language: Statements and Declarations */
	parseStatement() {
		switch (this._peekType()) {
			case '{':
				return this.parseBlock();
			case 'var':
				return this.parseVariable();
			case ';':
				/* Inline: 13.3 Empty Statement */
				this._start();
				this._consume();
				return this._wrap(new EmptyStatement());
			case 'if':
				return this.parseIf();
				/* Inline 13.6 Iteration Statements */
			case 'do':
				return this.parseDo();
			case 'while':
				return this.parseWhile();
			case 'for':
				return this.parseFor();
			case 'switch':
				return this.parseSwitch();
			case 'continue':
				return this.parseContinue();
			case 'break':
				return this.parseBreak();
			case 'return':
				return this.parseReturn();
			case 'with':
				return this.parseWith();
			case 'throw':
				return this.parseThrow();
			case 'try':
				return this.parseTry();
			case 'debugger':
				/* Inline: 13.15 Debugger Statement */
				this._start();
				this._consume();
				this._consumeSemicolon();
				return this._wrap(new DebuggerStatement());
			case 'Identifier':
			case 'yield':
				if (this._lookahead(2).type === ':') {
					return this.parseLabelled();
				}
			default:
				return this.parseExpressionStatement();
		}
	}

	parseDeclaration() {
		switch (this._peekType()) {
			case 'function':
				return this.parseFunctionOrGenerator(FunctionDeclaration);
			case 'class':
				return this.parseClass(ClassDeclaration);
			case 'const':
			case 'yield':
			case 'Identifier':
				return this.parseVariable();
			default:
				Assertion.assert(0);
		}
	}

	/* 13.1 Block */
	parseBlock() {
		this._start();
		this._expect('{');
		const body = this.parseStatementList();
		this._expect('}');
		return this._wrap(new BlockStatement(body));
	}

	parseStatementList(directive = false, inModule = false) {
		const result = [];
		const originalStrict = this._strictMode;
		while (directive) {
			if (this._lookahead().type === 'String') {
				const _2 = this._lookahead(2);
				let directive;
				if (_2.type !== ';' && _2.type !== '}' && !_2.lineBefore) {
					break;
				}
				this._start();
				const value = this._next();
				const raw = this.scanner.rawFromRange([value.range[0] + 1, value.range[1] - 1]);
				if (_2.type === ';') {
					this._consume();
				}
				if (raw === 'use strict') {
					this._strictMode = true;
				}
				result.push(this._wrap(new DirectiveStatement(value, raw)));
			} else {
				break;
			}
		}
		while (true) {
			const lhd = this._lookahead();
			if (lhd.type === '}' || lhd.type === 'EOF') {
				this._strictMode = originalStrict;
				return result;
			}
			const item = this.parseStatementListItem(inModule);
			result.push(item);
		}
	}

	parseStatementListItem(inModule) {
		const lhd = this._lookahead();
		switch (lhd.type) {
			case 'import':
				if (inModule) {
					return this.parseImport();
				} else {
					this._throw('Illegal import declaration');
					break;
				}
			case 'export':
				if (inModule) {
					return this.parseExport();
				} else {
					this._throw('Illegal export declaration');
					break;
				}
			case 'const':
			case 'function':
			case 'class':
				return this.parseDeclaration();
			case 'Identifier':
				if (lhd.value === 'let') {
					const lh2 = this._lookahead(2);
					switch (this._peekType(2)) {
						case '{':
						case '[':
						case 'Identifier':
						case 'yield':
							return this.parseDeclaration();
						default:
							return this.parseStatement();
					}
				}
			default:
				return this.parseStatement();
		}
	}

	/* 13.2 */
	parseVariable(inFor = false) {
		this._start();
		let type, declarations = []; {
			const keyword = this._next();
			if (keyword.type === 'var' || keyword.type === 'const') {
				type = keyword.type;
			} else {
				Assertion.assert(keyword.type === 'Identifier' && keyword.value === 'let');
				type = 'let';
			}
		}
		do {
			let id;
			this._start();
			switch (this._peekType()) {
				case '[':
					id = this.parseArrayPattern();
					break;
				case '{':
					id = this.parseObjectPattern();
					break;
				default:
					id = this._identifierWithYield();
					break;
			}
			if (this._consumeIf('=')) {
				declarations.push(this._wrap(new VariableDeclarator(id, this.parseAssignment(inFor))));
			} else {
				declarations.push(this._wrap(new VariableDeclarator(id)));
			}
		} while (this._consumeIf(','));
		if (!inFor)
			this._consumeSemicolon();
		return this._wrap(new VariableDeclaration(type, declarations));
	}

	/* 13.4 Expression Statement */
	parseExpressionStatement() {
		this._start();
		const expr = this.parseExpression();
		this._consumeSemicolon();
		return this._wrap(new ExpressionStatement(expr));
	}

	/* 13.5 If Statement */
	parseIf() {
		this._start();
		this._expect('if');
		this._expect('(');
		const test = this.parseExpression();
		this._expect(')');
		const trueStmt = this.parseStatement();
		if (this._peekType() === 'else') {
			this._consume();
			return this._wrap(new IfStatement(test, trueStmt, this.parseStatement()));
		} else {
			return this._wrap(new IfStatement(test, trueStmt));
		}
	}

	/* 13.6 Iteration Statements */
	parseDo() {
		this._start();
		this._expect('do');
		const body = this.parseStatement();
		this._expect('while');
		this._expect('(');
		const test = this.parseExpression();
		this._expect(')');
		this._consumeIf(';');
		return this._wrap(new DoStatement(body, test));
	}

	parseWhile() {
		this._start();
		this._expect('while');
		this._expect('(');
		const test = this.parseExpression();
		this._expect(')');
		const body = this.parseStatement();
		return this._wrap(new WhileStatement(test, body));
	}

	parseFor() {
		this._start();
		this._expect('for');
		this._expect('(');
		let init;
		if (this._peekType() === ';') {
			init = null;
		} else {
			const lookahead = this._lookahead();
			if (lookahead.type === 'var' || lookahead.type === 'const') {
				init = this.parseVariable(true);
			} else if (lookahead.type === 'Identifier' && lookahead.value === 'let') {
				switch (this._peekType(2)) {
					case '[':
					case '{':
					case 'yield':
					case 'Identifier':
						init = this.parseVariable(true);
						break;
					default:
						init = this.parseExpression(true);
				}
			} else {
				init = this.parseExpression(true);
			}
		}
		if (!init || this._peekType() === ';') {
			this._expect(';');
			const test = this._peekType() === ';' ? null : this.parseExpression();
			this._expect(';');
			const inc = this._peekType() === ')' ? null : this.parseExpression();
			this._expect(')');
			const body = this.parseStatement();
			return this._wrap(new ForStatement(init, test, inc, body));
		}
		let next = this._next();
		if (next.type !== 'in' && next.type !== 'Identifier' && next.type !== 'of') {
			this._throw('Expected for, for-in, or for-of loop');
		}
		if (init instanceof ArrayLiteral) {
			init = this.parseArrayPattern(true, init);
		} else if (init instanceof ObjectLiteral) {
			init = this.parseObjectPattern(true, init);
		}
		const coll = this.parseExpression();
		this._expect(')');
		const body = this.parseStatement();
		return this._wrap(new(next.type === 'in' ? ForInStatement : ForOfStatement)(init, coll, body));
	}

	/* 13.7 The continue Statement */
	parseContinue() {
		this._start();
		this._expect('continue');
		const lookahead = this._lookahead();
		if (lookahead.type === 'Identifier' && !lookahead.lineBefore) {
			const label = this._next();
			this._consumeSemicolon();
			return this._wrap(new ContinueStatement(label));
		}
		this._consumeSemicolon();
		return this._wrap(new ContinueStatement());
	}

	/* 13.8 The break Statement */
	parseBreak() {
		this._start();
		this._expect('break');
		const lookahead = this._lookahead();
		if (lookahead.type === 'Identifier' && !lookahead.lineBefore) {
			const label = this._next();
			this._consumeSemicolon();
			return this._wrap(new BreakStatement(label));
		}
		this._consumeSemicolon();
		return this._wrap(new BreakStatement());
	}

	/* 13.9 The return Statement */
	parseReturn() {
		this._start();
		this._expect('return');
		const lookahead = this._lookahead();
		if (lookahead.type === '}' || lookahead.lineBefore) {
			return this._wrap(new ReturnStatement());
		} else if (lookahead.type === ';') {
			this._consume();
			return this._wrap(new ReturnStatement());
		}
		const expr = this.parseExpression();
		this._consumeSemicolon();
		return this._wrap(new ReturnStatement(expr));
	}

	/* 13.10 The with Statement */
	parseWith() {
		this._start();
		this._expect('with');
		this._expect('(');
		const base = this.parseExpression();
		this._expect(')');
		const body = this.parseStatement();
		return this._wrap(new WithStatement(base, body));
	}

	/* 13.11 The switch Statement */
	parseSwitch() {
		this._start();
		this._expect('switch');
		this._expect('(');
		const expr = this.parseExpression();
		this._expect(')');
		this._expect('{');
		let clauses = [];
		let defaultDef = false;
		loop: while (true) {
			let test = null;
			switch (this._peekType()) {
				case 'case':
					this._start();
					this._consume();
					test = this.parseExpression();
					break;
				case 'default':
					if (defaultDef) {
						this._throw('Duplicate default clause');
					}
					defaultDef = true;
					this._start();
					this._consume();
					break;
				default:
					break loop;
			}
			this._expect(':');
			const body = [];
			stmt: while (true) {
				switch (this._peekType()) {
					case 'case':
					case 'default':
					case '}':
						break stmt;
					default:
						body.push(this.parseStatementListItem());
				}
			}
			clauses.push(this._wrap(new CaseClause(test, body)));
		}
		this._expect('}');
		return this._wrap(new SwitchStatement(expr, clauses));
	}

	/* 13.12 Labelled Statements */
	parseLabelled() {
		this._start();
		const label = this._identifierWithYield();
		this._expect(':');
		if (this._peekType() === 'function') {
			return this._wrap(new LabelledStatement(label, this.parseFunctionOrGenerator()));
		} else {
			return this._wrap(new LabelledStatement(label, this.parseStatement()));
		}
	}

	/* 13.13 The throw Statement */
	parseThrow() {
		this._start();
		this._expect('throw');
		if (this._lookahead().lineBefore) {
			this._throw('No line terminator allowed after throw');
		}
		const expr = this.parseExpression();
		this._consumeSemicolon();
		return this._wrap(new ThrowStatement(expr));
	}

	/* 13.14 The try Statement */
	parseTry() {
		this._start();
		this._expect('try');
		const body = this.parseBlock();
		let tryParam = null,
			tryBlock = null,
			finallyBlock = null;
		if (this._consumeIf('catch')) {
			this._expect('(');
			tryParam = this.parseDestructuringTarget();
			this._expect(')');
			tryBlock = this.parseBlock();
		}
		if (this._consumeIf('finally')) {
			finallyBlock = this.parseBlock();
		}
		if (!tryBlock && !finallyBlock) {
			this._throw('Expected catch or finally');
		}
		return this._wrap(new TryStatement(body, tryParam, tryBlock, finallyBlock));
	}

	/* 14.1 Function Definitions
	 * 14.3 Generator Definitions
	 */
	parseFunctionOrGenerator(ctor = FunctionExpression) {
		this._start();
		this._expect('function');
		const isGenerator = this._consumeIf('*');
		let name = null;
		if (this._peekType() === 'Identifier' || this._peekType() === 'yield') {
			name = this._identifierWithYield();
		}
		const param = this.parseFormalParameters();
		this._expect('{');
		if (isGenerator)
			this._allowYield = true;
		const body = this.parseStatementList(true);
		if (isGenerator)
			this._allowYield = false;
		this._expect('}');
		return this._wrap(new ctor(isGenerator, name, param, body));
	}

	parseFormalParameters() {
		this._expect('(');
		if (this._consumeIf(')')) {
			return [];
		}
		let parameters = [];
		do {
			if (this._peekType() === '...') {
				this._start();
				this._consume();
				parameters.push(this._wrap(new SpreadExpression(this._identifierWithYield())));
				break;
			} else {
				const target = this.parseDestructuringTarget();
				if (this._consumeIf('=')) {
					this._start(target);
					const init = this.parseAssignment();
					parameters.push(this._wrap(new DefaultParameter(target, init)));
				} else {
					parameters.push(target);
				}
			}
		} while (this._consumeIf(','));
		this._expect(')');
		return parameters;
	}

	/* 14.2 Arrow Function Definitions */
	parseArrowFunction(param) {
		this._start(param);
		/* Refine CoveredFormals as (FormalParameters) */
		if (param instanceof CoveredFormals) {
			if (param.body.length == 0) {
				param = [];
			} else {
				this._backtrace(param.range[0]);
				const parsed = this.parseFormalParameters();
				Assertion.assert(param.range[1] === this._lastToken.range[1]);
				param = parsed;
			}
		} else {
			param = [param];
		}
		this._ensureNoLineTerminator();
		this._expect('=>');
		let body;
		if (this._consumeIf('{')) {
			body = this.parseStatementList(true);
			this._expect('}');
		} else {
			body = this.parseAssignment();
		}
		return this._wrap(new ArrowFunction(param, body));
	}

	/* 14.3 Method Definitions */
	parseMethodDefinition() {
		this._start();
		this.scanner.resolveIdentifierName = false;
		const token1 = this._next();
		const token2 = token1.type === '[' ? null : this._lookahead();
		let name, computed;
		this.scanner.resolveIdentifierName = true;
		if (token1.type === '*') {
			if (token2.type === '[') {
				this._consume();
				name = this.parseAssignment();
				this._expect(']');
				computed = true;
			} else {
				name = this._expect('Identifier');
				computed = false;
			}
			const param = this.parseFormalParameters();
			this._expect('{');
			this._allowYield = true;
			const body = this.parseStatementList(true);
			this._allowYield = false;
			this._expect('}');
			return this._wrap(new MethodDefinition(true, name, param, body, computed));
		}
		if (token1.type === '[' || token2.type === '(') {
			if (token1.type === '[') {
				name = this.parseAssignment();
				this._expect(']');
				computed = true;
			} else {
				name = token1;
				computed = false;
			}
			const param = this.parseFormalParameters();
			this._expect('{');
			const body = this.parseStatementList(true);
			this._expect('}');
			return this._wrap(new MethodDefinition(false, name, param, body, computed));
		} else {
			if (token1.type !== 'Identifier') {
				this._throw('Illegal method definition');
			}
			let name, computed;
			if (token2.type === 'Identifier') {
				name = token2;
				this._consume();
				computed = false;
			} else if (token2.type === '[') {
				this._consume();
				name = this.parseAssignment();
				this._expect(']');
				computed = true;
			} else {
				this._throw('Illegal method definition');
			}
			if (token1.value === 'get') {
				this._expect('(');
				this._expect(')');
				this._expect('{');
				const body = this.parseStatementList(true);
				this._expect('}');
				return this._wrap(new GetterDefinition(name, body, computed));
			} else if (token1.value === 'set') {
				throw 'SETTER';
			} else {
				this._throw('Illegal method definition');
			}
		}
	}

	/* 14.5 Class Definitions */
	parseClass(ctor = ClassExpression) {
		this._start();
		this._expect('class');
		let name = null;
		if (this._peekType() === 'Identifier' || this._peekType() === 'yield') {
			name = this._identifierWithYield();
		}
		let superClass;
		if (this._consumeIf('extends')) {
			superClass = this.parseLeftHandSide();
		}
		this._expect('{');
		let elements = [];
		while (true) {
			this.scanner.resolveIdentifierName = false;
			const lookahead = this._lookahead();
			this.scanner.resolveIdentifierName = true;
			switch (lookahead.type) {
				case ';':
					this._consume();
					continue;
				case '}':
					this._consume();
					return new ctor(name, superClass, elements);
				case 'Identifier':
					if (lookahead.value === 'static') {
						this.scanner.resolveIdentifierName = false;
						const lookahead2 = this._lookahead();
						this.scanner.resolveIdentifierName = true;
						if (lookahead2.type === '(') {
							elements.push(this.parseMethodDefinition());
						} else {
							this._consume();
							const def = this.parseMethodDefinition();
							def.static = true;
							elements.push(def);
						}
					} else {
						elements.push(this.parseMethodDefinition());
					}
					break;
				default:
					elements.push(this.parseMethodDefinition());
					break;
			}
		}
	}

	parseScript() {
		this.scanner.awaitAsReserved = false;
		this._start();
		const body = this.parseStatementList(true);
		this._expect('EOF');
		return this._wrap(new Script(body));
	}

	parseModule() {
		this.scanner.awaitAsReserved = true;
		this._start();
		const body = this.parseStatementList(true, true);
		this._expect('EOF');
		return this._wrap(new Module(body));
	}

	parseNameImports() {
		this._start();
		this._expect('{');
		const elements = [];
		do {
			this.scanner.resolveIdentifierName = false;
			Assertion.assert(this._buffer.length === 0);
			const name = this._next();
			this.scanner.resolveIdentifierName = true;

			if (name.type === '}') {
				return this._wrap(new ObjectPattern(elements));
			} else if (this._peekType() === 'Identifier') {
				if (this._next().value !== 'as') {
					this._throw('expected as in name imports');
				}
				this._start(name);
				const id = this._identifierWithYield();
				elements.push(this._wrap(new PropertyDefinition(name, id)));
			} else {
				if (this.scanner.resolveIdentifier(name).type !== 'Identifier') {
					this._throw('Reserved words cannot be used as binding identfier', name);
				}
				elements.push(name);
			}
		} while (this._consumeIf(','));
		this._expect('}');
		return this._wrap(new ObjectPattern(elements));
	}

	parseImport() {
		this._start();
		this._expect('import');
		if (this._peekType() === 'String') {
			const source = this._next();
			this._consumeSemicolon();
			return this._wrap(new ImportDeclaration(source));
		}
		let def = null,
			namespace = null;
		switch (this._peekType()) {
			case 'yield':
			case 'Identifier':
				def = this._identifierWithYield();
				if (this._consumeIf(',')) {
					switch (this._peekType()) {
						case '*':
							this._consume();
							if (this._expect('Identifier').value !== 'as') {
								this._throw('Expected as in namespace import');
							}
							namespace = this._identifierWithYield();
							break;
						case '{':
							namespace = this.parseNameImports();
							break;
						default:
							this._throw('Expected namespace import or name import');
					}
				}
				break;
			case '*':
				this._consume();
				if (this._expect('Identifier').value !== 'as') {
					this._throw('Expected as in namespace import');
				}
				namespace = this._identifierWithYield();
				break;
			case '{':
				namespace = this.parseNameImports();
				break;
			default:
				this._throw('Expected namespace import or name import');
		}
		if (this._expect('Identifier').value !== 'from') {
			this._Throw('Expected from clause');
		}
		const source = this._expect('String');
		this._consumeSemicolon();
		return this._wrap(new ImportDeclaration(source, def, namespace));
	}

	parseExportClause() {
		this._start();
		this._expect('{');
		const elements = [];
		do {
			this.scanner.resolveIdentifierName = false;
			Assertion.assert(this._buffer.length === 0);
			const name = this._next();
			this.scanner.resolveIdentifierName = true;

			if (name.type === '}') {
				return this._wrap(new ObjectPattern(elements));
			} else if (this._peekType() === 'Identifier') {
				if (this._next().value !== 'as') {
					this._throw('expected as in export clause');
				}
				this._start(name);
				this.scanner.resolveIdentifierName = false;
				Assertion.assert(this._buffer.length === 0);
				const id = this._next();
				this.scanner.resolveIdentifierName = true;
				elements.push(this._wrap(new PropertyDefinition(id, name)));
			} else {
				elements.push(name);
			}
		} while (this._consumeIf(','));
		this._expect('}');
		return this._wrap(new ObjectLiteral(elements));
	}

	parseExport() {
		this._start();
		this._expect('export');
		if (this._consumeIf('default')) {
			let exp;
			switch (this._peekType()) {
				case 'function':
					exp = this.parseFunctionOrGenerator(FunctionDeclaration);
					break;
				case 'class':
					exp = this.parseClass(ClassDeclaration);
					break;
				default:
					exp = this.parseAssignment();
			}
			this._consumeSemicolon();
			return this._wrap(new ExportDefault(exp));
		} else {
			switch (this._peekType()) {
				case '*':
					{
						this._consume();
						this._expectIdentifier('from');
						const source = this._expect('String');
						this._consumeSemicolon();
						return this._wrap(new ExportFrom(source));
					}
				case 'var':
					return this._wrap(new ExportDeclaration(this.parseVariable()));
				case '{':
					{
						const clause = this.parseExportClause();
						if (this._peekType() === 'Identifier') {
							if (this._next().value !== 'from') {
								this._throw('Expected from in export from clause');
							}
							const source = this._expect('String');
							this._consumeSemicolon();
							return this._wrap(new ExportFrom(source, clause));
						} else {
							this._consumeSemicolon();
							return this._wrap(new ExportDeclaration(clause));
						}
					}
				default:
					return this._wrap(new ExportDeclaration(this.parseDeclaration()));
			}
		}
	}
}

export default Parser;