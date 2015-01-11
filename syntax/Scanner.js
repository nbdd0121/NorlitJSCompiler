import Unicode from './unicode/Unicode';
import Context from './Context';
import Assertion from '../util/Assertion';
import {
	Comment,
	Token,
	NumberLiteral,
	StringLiteral,
	Identifier
}
from './tree/Token';

const strictReserved = {
	implements: true,
	interface: true,
	package: true,
	private: true,
	protected: true,
	public: true
};

const keywords = {
	break: true,
	case: true,
	catch: true,
	class: true,
	const: true,
	continue: true,
	debugger: true,
	default: true,
	delete: true,
	do: true,
	else: true,
	export: true,
	extends: true,
	finally: true,
	for: true,
	function: true,
	if: true,
	import: true,
	in : true,
	instanceof: true,
	new: true,
	return: true,
	super: true,
	switch: true,
	this: true,
	throw: true,
	try: true,
	typeof: true,
	var: true,
	void: true,
	while: true,
	with: true,
	yield: true,
	null: true,
	true: true,
	false: true
};

class Scanner {
	constructor(context, source) {
		this.context = context;
		this.source = source;
		this.content = source.content;
		this.pointer = 0;

		this.tokenStart = null;

		this._lineBefore = false;
		this._leadingComments = null;

		this.processComments = false;
		this.htmlLikeComment = true;
		this.awaitAsReserved = true;
		this.resolveIdentifierName = true;
	}

	static isWhitespace(char) {
		switch (char) {
			case '\t':
			case '\v':
			case '\f':
			case ' ': // Fast-path
			case '\xA0': // Fast-path
			case '\uFEFF':
				return true;
			default:
				return Unicode.isSpace(char);
		}
	}

	static isLineTerminator(char) {
		switch (char) {
			case '\r':
			case '\n':
			case '\u2028':
			case '\u2029':
				return true;
			default:
				return false;
		}
	}

	static isIdentifierStart(char) {
		switch (char) {
			case '':
				return false;
			case '$':
			case '_':
				return true;
		}
		return Unicode.isIdStart(char);
	}

	static isIdentifierPart(char) {
		switch (char) {
			case '':
				return false;
			case '$':
			case '_':
			case '\u200C':
			case '\u200D':
				return true;
		}
		return Unicode.isIdContinue(char);
	}

	static isHexDigit(char) {
		return "0123456789ABCDEFabcdef".indexOf(char) != -1;
	}

	static getDigit(char) {
		return "0123456789ABCDEF".indexOf(char.toUpperCase());
	}

	static isFutureReservedWord(name, awaitAsReserved = true) {
		if (name === 'enum') {
			return true;
		} else if (name === 'await' && awaitAsReserved) {
			return true;
		} else {
			return false;
		}
	}

	static isStrictModeFutureReserved(name) {
		return strictReserved.hasOwnProperty(name);
	}

	static isKeyword(name) {
		return keywords.hasOwnProperty(name);
	}

	_next(len = 1) {
		if (len == 1) {
			return this.content[this.pointer++] || '';
		}
		const ret = this.content.substring(this.pointer, this.pointer + len);
		this.pointer += len;
		return ret;
	}

	_consume(len = 1) {
		this.pointer += len;
	}

	_pushback() {
		this.pointer--;
	}

	_lookahead(len = 1) {
		if (len === 1) {
			return this.content[this.pointer] || '';
		}
		return this.content.substring(this.pointer, this.pointer + len) || '';
	}

	_expect(seq) {
		const taken = this._next(seq.length);
		Assertion.assert(taken === seq, `Expected \`${seq}\`, but encountered \`${taken ? taken : 'EOF'}\``);
	}

	_start() {
		this.tokenStart = this.pointer;
	}

	_end() {
		const ret = [this.tokenStart, this.pointer];
		this.tokenStart = null;
		return ret;
	}

	_wrap(unit) {
		const range = this._end();
		unit.range = range;
		if (this._lineBefore) {
			unit.lineBefore = true;
			this._lineBefore = false;
		}
		if (this._leadingComments) {
			unit.leadingComments = this._leadingComments;
			this._leadingComments = null;
		}
		return unit;
	}

	_createWrappedToken(type) {
		return this._wrap(new Token(type));
	}

	_throw(msg, unit) {
		const range = unit ? unit.range : [this.tokenStart, this.pointer];
		const err = new SyntaxError(msg);
		err.range = range;
		err.source = this;
		this.context.error(err, this.source.createRange(...range));
	}

	_pushComment(type, comment) {
		if (!this._leadingComments) {
			this._leadingComments = [];
		}
		this._leadingComments.push(new Comment(this._end(), type, comment));
	}

	/* Helper used by syntax/Context */

	rawFromRange(range) {
		return this.content.substring(...range);
	}

	/* Comments ES6 11.4 */

	nextLineComment() {
		this._start();
		this._expect('//');
		while (true) {
			const char = this._next();
			if (!char || Scanner.isLineTerminator(char)) {
				this._pushback();
				break;
			}
		}
		if (this.processComments) {
			this._pushComment('LineComment', this.content.substring(this.tokenStart + 2, this.pointer));
		}
	}

	nextBlockComment() {
		this._start();
		this._expect('/*');
		while (true) {
			if (this._lookahead(2) == '*/') {
				this._consume(2);
				break;
			} else {
				const nxt = this._next();
				if (!nxt) {
					this._throw('Block comment is not enclosed');
				} else if (Scanner.isLineTerminator(nxt)) {
					this._lineBefore = true;
				}
			}
		}
		if (this.processComments) {
			this._pushComment('BlockComment', this.content.substring(this.tokenStart + 2, this.pointer - 2));
		}
	}

	nextHTMLOpenComment() {
		this._start();
		this._expect('<!--');
		while (true) {
			const char = this._next();
			if (!char || Scanner.isLineTerminator(char)) {
				this._pushback();
				break;
			}
		}
		if (this.processComments) {
			this._pushComment('HTMLOpenComment', this.content.substring(this.tokenStart + 4, this.pointer));
		}
	}

	nextHTMLCloseComment() {
		this._start();
		this._expect('-->');
		while (true) {
			const char = this._next();
			if (!char || Scanner.isLineTerminator(char)) {
				this._pushback();
				break;
			}
		}
		if (this.processComments) {
			this._pushComment('HTMLCloseComment', this.content.substring(this.tokenStart + 3, this.pointer));
		}
	}

	/**
	 * Skip all whitespace, line terminator and comments, and set _lineBefore, _leadingComments accordingly
	 */
	skipWhitespace() {
		while (true) {
			const char = this._next();
			if (!char) {
				return;
			} else if (Scanner.isWhitespace(char)) {
				continue;
			} else if (Scanner.isLineTerminator(char)) {
				this._lineBefore = true;
			} else if (char == '/') {
				const llh = this._lookahead();
				this._pushback();
				if (llh == '/') {
					this.nextLineComment();
				} else if (llh === '*') {
					this.nextBlockComment();
				} else {
					return;
				}
			} else if (this.htmlLikeComment && char === '<') {
				this._pushback();
				if (this._lookahead(4) === '<!--') {
					this.nextHTMLOpenComment();
				} else {
					return;
				}
			} else if (this.htmlLikeComment && this._lineBefore && char === '-') {
				this._pushback();
				if (this._lookahead(3) === '-->') {
					this.nextHTMLCloseComment();
				} else {
					return;
				}
			} else {
				this._pushback();
				return;
			}
		}
	}


	/*
	 * Token ES6 11.5
	 * Punctuators 11.7
	 */
	nextToken() {
		this.skipWhitespace();
		this._start();
		const nxt = this._next();
		switch (nxt) {
			case '':
				{
					const token = this._createWrappedToken('EOF');
					token.lineBefore = true;
					return token;
				}
			case '}': // Dealing with right brace as template tail is in parser
			case '{':
			case '(':
			case ')':
			case '[':
			case ']':
			case ';':
			case ',':
			case '~':
			case '?':
			case ':':
				return this._createWrappedToken(nxt);
			case '.':
				{
					const lhd = this._lookahead();
					if (lhd >= '0' && lhd <= '9') {
						this._pushback();
						return this.nextDecimal();
					}
					if (this._lookahead(2) === '..') {
						this._consume(2);
						return this._createWrappedToken('...');
					} else {
						return this._createWrappedToken('.');
					}
				}
			case '<':
				{
					const _2 = this._lookahead();
					if (_2 === '<') {
						this._consume();
						const _3 = this._lookahead();
						if (_3 === '=') {
							this._consume();
							return this._createWrappedToken('<<=');
						} else {
							return this._createWrappedToken('<<');
						}
					} else if (_2 === '=') {
						this._consume();
						return this._createWrappedToken('<=');
					} else {
						return this._createWrappedToken('<');
					}
				}
			case '>':
				{
					const _2 = this._lookahead();
					if (_2 === '>') {
						this._consume();
						const _3 = this._lookahead();
						if (_3 === '>') {
							this._consume();
							const _4 = this._lookahead();
							if (_4 === '=') {
								this._consume();
								return this._createWrappedToken('>>>=');
							} else {
								return this._createWrappedToken('>>>');
							}
						} else if (_3 === '=') {
							this._consume();
							return this._createWrappedToken('>>=');
						} else {
							return this._createWrappedToken('>>');
						}
					} else if (_2 === '=') {
						this._consume();
						return this._createWrappedToken('>=');
					} else {
						return this._createWrappedToken('>');
					}
				}
			case '=':
				if (this._lookahead() === '>') {
					this._consume();
					return this._createWrappedToken('=>');
				}
			case '!':
				if (this._lookahead() === '=') {
					if (this._lookahead(2) === '==') {
						this._consume(2);
						return this._createWrappedToken(nxt + '==');
					} else {
						this._consume();
						return this._createWrappedToken(nxt + '=');
					}
				} else {
					return this._createWrappedToken(nxt);
				}
			case '+':
			case '-':
			case '&':
			case '|':
			case '/':
				{
					const _2 = this._lookahead();
					if (_2 === nxt) {
						this._consume();
						return this._createWrappedToken(nxt + nxt);
					} else if (_2 === '=') {
						this._consume();
						return this._createWrappedToken(nxt + '=');
					} else {
						return this._createWrappedToken(nxt);
					}
				}
			case '*':
			case '%':
			case '^':
				if (this._lookahead() === '=') {
					this._consume();
					return this._createWrappedToken(nxt + '=');
				} else {
					return this._createWrappedToken(nxt);
				}
			case '0':
				{
					const nxt = this._lookahead().toLowerCase();
					this._pushback();
					if (nxt == 'x') {
						return this.nextHexInteger();
					} else if (nxt == 'o') {
						return this.nextOctInteger();
					} else if (nxt === 'b') {
						return this.nextBinInteger();
					} else if (nxt >= '0' && nxt <= '9') {
						return this.nextLegacyOctInteger();
					} else {
						return this.nextDecimal();
					}
				}
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9':
				this._pushback();
				return this.nextDecimal();
			case '`':
				this._pushback();
				return this.nextTemplate();
			case '"':
			case "'":
				this._pushback();
				return this.nextString();
			case '\\':
				this._pushback();
				return this.nextIdentifierNameResolved();
			default:
				if (Scanner.isIdentifierStart(nxt)) {
					this._pushback();
					return this.nextIdentifierNameResolved();
				}
				throw this._throw(`Unexpected character ${nxt} in source text`);
		}
	}

	resolveIdentifier(idName) {
		if (Scanner.isKeyword(idName.value)) {
			const token = new Token(idName.value);
			token.range = idName.range;
			if (idName.lineBefore) {
				token.lineBefore = true;
			}
			if (idName.leadingComments) {
				token.leadingComments = idName.leadingComments;
			}
			return token;
		}
		if (Scanner.isFutureReservedWord(idName.value, this.awaitAsReserved)) {
			this._throw(`${idName.value}, as future reserved word, cannot be used as identifier`, idName);
			return idName;
		}
		if (Scanner.isStrictModeFutureReserved(idName)) {
			idName.strictModeError = 'Future reserved word in strict mode';
		}
		return idName;
	}

	nextIdentifierNameResolved() {
		const idName = this.nextIdentifierName();
		if (!this.resolveIdentifierName || idName.range[1] - idName.range[0] != idName.value.length) {
			return idName;
		}
		return this.resolveIdentifier(idName);
	}

	/* ES6 11.6 */
	nextIdentifierName() {
		let id = this._next();
		if (id == '\\') {
			id = this.nextUnicodeEscapeSequence();
			if (!Scanner.isIdentifierStart(id)) {
				this._throw('Unicode escape sequence should be proper identifier start');
			}
		} else if (!Scanner.isIdentifierStart(id)) {
			Assertion.assert(0, 'Expected identifier start');
		}
		while (true) {
			const nxt = this._next();
			if (nxt == '\\') {
				const esc = this.nextUnicodeEscapeSequence();
				if (!Scanner.isIdentifierPart(esc)) {
					this._throw('Unicode escape sequence should be proper identifier part');
				}
				id += esc;
			} else if (Scanner.isIdentifierPart(nxt)) {
				id += nxt;
			} else {
				this._pushback();
				break;
			}
		}
		return this._wrap(new Identifier(id));
	}

	_scanDecimal() {
		let decimal = "";
		while (true) {
			const next = this._next();
			if (next >= '0' && next <= '9') {
				decimal += next;
			} else {
				this._pushback();
				return decimal;
			}
		}
	}

	_scanExp() {
		Assertion.assert(this._next().toLowerCase() == 'e');
		const next = this._lookahead();
		let sign = "+";
		if (next == '+' || next == '-') {
			sign = this._next();
		}
		let expPart = "";
		while (true) {
			const next = this._next();
			if (next >= '0' && next <= '9') {
				expPart += next;
			} else {
				break;
			}
		}
		this._pushback();
		if (!expPart.length) {
			this._throw('Expected +, - or digits after the exponential mark');
		}
		return 'e' + sign + expPart;
	}

	/* Numeric Literals 11.8.3 */
	nextDecimal() {
		this._start();
		let raw = this._scanDecimal();
		if (raw) {
			const next = this._lookahead();
			if (next === '.') {
				this._consume();
				raw += '.';
				raw += this._scanDecimal();
				const _2 = this._lookahead();
				if (_2 === 'e' || _2 === 'E') {
					raw += this._scanExp();
				}
			} else if (next === 'e' || next === 'E') {
				raw += this._scanExp();
			}
		} else {
			this._expect('.');
			const dec = this._scanDecimal();
			Assertion.assert(dec);
			raw = '.' + dec;
			const next = this._lookahead();
			if (next === 'e' || next === 'E') {
				raw += this._scanExp();
			}
		}
		const next = this._lookahead();
		if (next === '\\' || Scanner.isIdentifierStart(next)) {
			this._throw('Unexpected character after number literal');
			this.nextIdentifierName();
		}
		return this._wrap(new NumberLiteral(parseFloat(raw)));
	}

	nextBinInteger() {
		this._start();
		Assertion.assert(this._next(2).toLowerCase() == '0b');
		let raw = "";
		let error = false;
		while (true) {
			const next = this._next();
			if (next == '0' || next == '1') {
				raw += next;
			} else if (next >= '2' && next <= '9') {
				error = true;
			} else {
				this._pushback();
				if (next == '\\' || Scanner.isIdentifierStart(next)) {
					this._throw('Unexpected character after number literal');
					this.nextIdentifierName();
				} else if (error) {
					this._throw('Unexpected digits in binary number literal');
				}
				return this._wrap(new NumberLiteral(parseInt(raw, 2)));
			}
		}
	}

	nextOctInteger() {
		this._start();
		Assertion.assert(this._next(2).toLowerCase() == '0o');
		let raw = "";
		let error = false;
		while (true) {
			const next = this._next();
			if (next >= '0' && next <= '7') {
				raw += next;
			} else if (next == '8' || next == '9') {
				error = true;
			} else {
				this._pushback();
				if (next == '\\' || Scanner.isIdentifierStart(next)) {
					this._throw('Unexpected character after number literal');
					this.nextIdentifierName();
				} else if (error) {
					this._throw('Unexpected digits in octal number literal');
				}
				return this._wrap(new NumberLiteral(parseInt(raw, 8)));
			}
		}
	}

	nextHexInteger() {
		this._start();
		Assertion.assert(this._next(2).toLowerCase() == '0x');
		let raw = "";
		while (true) {
			const next = this._next();
			if (Scanner.isHexDigit(next)) {
				raw += next;
			} else {
				this._pushback();
				if (next == '\\' || Scanner.isIdentifierStart(next)) {
					this._throw('Unexpected character after number literal');
					this.nextIdentifierName();
				}
				return this._wrap(new NumberLiteral(parseInt(raw, 16)));
			}
		}
	}

	nextLegacyOctInteger() {
		this._start();
		this._expect('0');
		let raw = "";
		let error = false;
		while (true) {
			const next = this._next();
			if (next >= '0' && next <= '7') {
				raw += next;
			} else if (next == '8' || next == '9') {
				error = true;
			} else {
				this._pushback();
				if (next == '\\' || Scanner.isIdentifierStart(next)) {
					this._throw('Unexpected character after number literal');
					this.nextIdentifierName();
				} else if (error) {
					this._throw('Unexpected digits in octal number literal');
				}
				const token = this._wrap(new NumberLiteral(parseInt(raw, 8)));
				token.strictModeError = "Legacy octal number literal";
				return token;
			}
		}
	}

	/* String Literals 11.8.4 */
	nextString() {
		this._start();
		const quote = this._next();
		Assertion.assert(quote == "'" || quote == '"');
		let value = "";
		let oct = false;
		while (true) {
			const next = this._next();
			switch (next) {
				case '"':
				case "'":
					{
						if (quote !== next) {
							value += next;
							break;
						}
						const token = this._wrap(new StringLiteral(value));
						if (oct) {
							token.strictModeError = 'Octal escape sequence';
						}
						return token;
					}
				case '\\':
					{
						const _0 = this._next();
						switch (_0) {
							case '\r':
								if (this._lookahead() == '\n') {
									this._consume();
									break;
								}
							case '\n':
							case '\u2028':
							case '\u2029':
								break;
							case "'":
								value += "'";
								break
							case '"':
								value += '"';
								break;
							case '\\':
								value += '\\';
								break;
							case 'b':
								value += '\b';
								break;
							case 'f':
								value += '\f';
								break;
							case 'n':
								value += '\n';
								break;
							case 'r':
								value += '\r';
								break;
							case 't':
								value += '\t';
								break;
							case 'v':
								value += '\v';
								break;
							case '0':
								{
									const lhd = this._lookahead();
									if (lhd < '0' || lhd > '7') {
										value += '\0';
										break;
									}
								}
							case '1':
							case '2':
							case '3':
							case '4':
							case '5':
							case '6':
							case '7':
								{
									oct = true;
									const _1 = this._lookahead();
									if (_1 < '0' || _1 > '7') {
										value += String.fromCharCode(Scanner.getDigit(_0));
										break;
									}
									this._consume();
									const _2 = this._lookahead();
									if (_2 < '0' || _2 > '7' || (_0 >= '4' && _0 <= '7')) {
										value += String.fromCharCode(Scanner.getDigit(_0) * 8 + Scanner.getDigit(_1));
									} else {
										this._consume();
										value += String.fromCharCode(Scanner.getDigit(_0) * 64 + Scanner.getDigit(_1) * 8 + Scanner.getDigit(_2));
									}
									break;
								}
							case 'x':
								let val = 0;
								for (let i = 0; i < 2; i++) {
									const d = this._next();
									if (Scanner.isHexDigit(d)) {
										val *= 16;
										val += Scanner.getDigit(d);
									} else {
										this._throw('Expected hex digits in hexical escape sequence');
										break;
									}
								}
								value += String.fromCharCode(val);
								break;
							case 'u':
								this._pushback();
								value += this.nextUnicodeEscapeSequence();
								break;
							default:
								value += _0;
								break
						}
						break;
					}
				case '':
				case '\r':
				case '\n':
				case '\u2028':
				case '\u2029':
					{
						this._pushback();
						this._throw("String literal is not enclosed");
						const token = this._wrap(new StringLiteral(value));
						token.value = value;
						if (oct) {
							token.strictModeError = 'Octal escape sequence';
						}
						return token;
					}
				default:
					value += next;
					break;
			}
		}
	}

	nextUnicodeEscapeSequence() {
		this._expect('u');
		if (this._lookahead() == '{') {
			this._consume();
			let val = 0;
			while (true) {
				const d = this._next();
				if (d == '}') {
					return String.fromCodePoint(val);
				} else if (Scanner.isHexDigit(d)) {
					val *= 16;
					val += Scanner.getDigit(d);
				} else {
					this._throw("Expected hex digits in unicode escape sequence");
					return "";
				}
			}
		} else {
			let val = 0;
			for (let i = 0; i < 4; i++) {
				const d = this._next();
				if (Scanner.isHexDigit(d)) {
					val *= 16;
					val += Scanner.getDigit(d);
				} else {
					this._throw("Expected hex digits in unicode escape sequence");
					return "";
				}
			}
			return String.fromCharCode(val);
		}
	}

	/* Regular Expression Literals 11.8.5 */
	nextRegexp(div) {
		if (div) {
			this.pointer = div.range[0];
		}
		this._start();
		this._expect('/');
		let regexp = "";
		let inClass = false;
		loop: while (true) {
			const nxt = this._next();
			switch (nxt) {
				case '/':
					if (inClass) {
						regexp += '/';
						break;
					}
					break loop;
				case '\\':
					{
						const _1 = this._next();
						switch (_1) {
							case '':
							case '\r':
							case '\n':
							case '\u2028':
							case '\u2029':
								this._pushback();
								this._throw("Regexp literal is not enclosed");
								break loop;
						}
						regexp += '\\' + _1;
						break;
					}
				case '[':
					regexp += '[';
					inClass = true;
					break;
				case ']':
					regexp += ']';
					inClass = false;
					break;
				case '':
				case '\r':
				case '\n':
				case '\u2028':
				case '\u2029':
					this._pushback();
					this._throw("Regexp literal is not enclosed");
					break loop;
				default:
					regexp += nxt;
					break;
			}
		}
		let flags = "";
		while (true) {
			const next = this._next();
			if (next == '\\') {
				if (this._lookahead() != 'u') {
					this._throw("Expected unicode escape sequence");
					continue;
				}
				const before = this.pointer;
				const esc = this.nextUnicodeEscapeSequence();
				if (!Scanner.isIdentifierPart(esc)) {
					this._throw("Illegal identifier part in regexp flags");
				}
				flags += this.content.substring(before - 1, this.pointer);
			} else if (Scanner.isIdentifierPart(next)) {
				flags += next;
			} else {
				this._pushback();
				const token = this._createWrappedToken('RegularExpression');
				token.value = regexp;
				token.flags = flags;
				return token;
			}
		}
	}

	/* Template Literal Lexical Components 11.8.6 */
	nextTemplate() {
		this._start();
		this._expect('`');
		const [cooked, raw] = this._templateCharacters();
		let token;
		if (this._lookahead() == '`') {
			this._consume();
			token = this._createWrappedToken('NoSubstitutionTemplate');
		} else {
			this._expect('${');
			token = this._createWrappedToken('TemplateHead');
		}
		token.value = cooked;
		token.raw = raw;
		return token;
	}

	nextTemplateSubstitutionTail(rightbrace) {
		if (rightbrace) {
			this.pointer = rightbrace.range[0];
		}
		this._start();
		this._expect('}');
		const [cooked, raw] = this._templateCharacters();
		let token;
		if (this._lookahead() == '`') {
			this._consume();
			token = this._createWrappedToken('TemplateTail');
		} else {
			this._expect('${');
			token = this._createWrappedToken('TemplateMiddle');
		}
		token.value = cooked;
		token.raw = raw;
		return token;
	}

	_templateCharacters() {
		let cooked = '';
		let raw = '';
		while (true) {
			const next = this._next();
			switch (next) {
				case '':
					this._throw('Template Literal is not enclosed');
					break;
				case '`':
					this._pushback();
					return [cooked, raw];
				case '$':
					if (this._lookahead() === '{') {
						this._pushback();
						return [cooked, raw];
					} else {
						cooked += '$';
						raw += '$';
						break;
					}
				case '\\':
					{
						const _0 = this._next();
						switch (_0) {
							case '\r':
								if (this._lookahead() == '\n') {
									this._consume();
									break;
								}
							case '\n':
							case '\u2028':
							case '\u2029':
								break;
							case "'":
							case '"':
							case '\\':
								cooked += _0;
								raw += '\\' + _0;
								break
							case 'b':
								cooked += '\b';
								raw += '\\b';
								break;
							case 'f':
								cooked += '\f';
								raw += '\\f';
								break;
							case 'n':
								cooked += '\n';
								raw += '\\n';
								break;
							case 'r':
								cooked += '\r';
								raw += '\\r';
								break;
							case 't':
								cooked += '\t';
								raw += '\\t';
								break;
							case 'v':
								cooked += '\v';
								raw += '\\v';
								break;
							case '0':
								{
									const lhd = this._lookahead();
									if (lhd >= '0' && lhd <= '7') {
										this._throw('Octal escape sequences are not allowed in template literal');
									}
									cooked += '\0';
									raw += '\\0';
									break;
								}
							case '1':
							case '2':
							case '3':
							case '4':
							case '5':
							case '6':
							case '7':
								{
									this._throw('Octal escape sequences are not allowed in template literal');
									break;
								}
							case 'x':
								{
									let val = 0;
									raw += '\\x';
									for (let i = 0; i < 2; i++) {
										const d = this._next();
										if (Scanner.isHexDigit(d)) {
											val *= 16;
											val += Scanner.getDigit(d);
											raw += d;
										} else {
											this._throw('Expected hex digits in hexical escape sequence');
											break;
										}
									}
									cooked += String.fromCharCode(val);
									break;
								}
							case 'u':
								{
									this._pushback();
									const start = this.pointer;
									cooked += this.nextUnicodeEscapeSequence();
									raw += '\\' + this.content.substring(start, this.pointer);
									break;
								}
							default:
								cooked += _0;
								raw += '\\' + _0;
								break
						}
						break;
					}
					Assertion.assert(0, 'Escape and LineContinution');
				case '\r':
					if (this._lookahead() === '\n') {
						this._consume();
					}
				case '\n':
					cooked += '\n';
					raw += '\n';
					break;
				default:
					cooked += next;
					raw += next;
					break;
			}
		}
	}
}

export default Scanner;
