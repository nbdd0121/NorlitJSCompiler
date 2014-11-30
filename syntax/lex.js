'use strict';

var NorlitJSCompiler = require("../compiler");
require("./chartype");

NorlitJSCompiler.Lex = function() {
	var type = NorlitJSCompiler.CharType;

	var TAB = "\u0009",
		VT = "\u000B",
		FF = "\u000C",
		SP = "\u0020",
		NBSP = "\u00A0",
		BOM = "\uFEFF",
		LF = "\u000A",
		CR = "\u000D",
		LS = "\u2028",
		PS = "\u2029",
		ZWNJ = "\u200C",
		ZWJ = "\u200D";

	var strictReserved = {
		implements: true,
		interface: true,
		let: true,
		package: true,
		private: true,
		protected: true,
		public: true,
		static: true,
		yield: true
	};

	var reserved = {
		class: true,
		const: true,
		enum: true,
		export: true,
		extends: true,
		import: true,
		super: true
	};

	var keywords = {
		break: true,
		case: true,
		catch: true,
		continue: true,
		debugger: true,
		default: true,
		delete: true,
		do: true,
		else: true,
		finally: true,
		for: true,
		function: true,
		if: true,
		in : true,
		instanceof: true,
		new: true,
		return: true,
		switch: true,
		this: true,
		throw: true,
		try: true,
		typeof: true,
		var: true,
		void: true,
		while: true,
		with: true,
		null: true,
		true: true,
		false: true
	};

	function Lex(str, context) {
		this.source = str;
		this.context = context;
		this.ptr = 0;
		this.line = 1;
		this.lineBefore = false;
		this.parseId = true;
	}

	NorlitJSCompiler.Token = Token;
	Token.ILLEGAL = new Token('<illegal>');
	Token.ILLEGAL.value = Token.ILLEGAL;

	function subChar(a, b) {
		return a.charCodeAt(0) - b.charCodeAt(0);
	}

	function char(a) {
		return String.fromCharCode(a);
	}

	function assert(bool) {
		if (!bool) {
			throw new Error('Assertion Error');
		}
	}

	function Token(type) {
		this.type = type;
	}

	function assertNext(lex, allowed) {
		var nxt = nextChar(lex);
		assert(allowed.indexOf(nxt) != -1);
		return nxt;
	};

	function lookahead(lex) {
		if (lex.ptr >= lex.source.length) {
			return '\uFFFF';
		}
		return lex.source[lex.ptr];
	}

	function nextChar(lex) {
		if (lex.ptr >= lex.source.length) {
			lex.ptr++;
			return '\uFFFF';
		}
		return lex.source[lex.ptr++];
	}

	function pushback(lex, num) {
		lex.ptr -= num || 1;
	}

	Lex.prototype.throwError = function(msg) {
		var err = new SyntaxError(msg);
		err.detail = {
			startOffset: this.startPtr,
			endOffset: this.ptr
		};
		this.context.throwError(err);
	}

	/* Character type classification */
	Lex.prototype.isHexDigit = function(digit) {
		return "0123456789abcdefABCDEF".indexOf(digit) != -1;
	}

	Lex.prototype.isIdentfierStart = function(char) {
		if (char == '$' || char == '_') {
			return true;
		}
		switch (type(char)) {
			case 'UPPERCASE_LETTER':
			case 'LOWERCASE_LETTER':
			case 'TITLECASE_LETTER':
			case 'MODIFIER_LETTER':
			case 'OTHER_LETTER':
			case 'LETTER_NUMBER':
				return true;
		}
		return false;
	}

	Lex.prototype.isIdentfierPart = function(char) {
		if (char == '$' || char == '_' || char == ZWNJ || char == ZWJ) {
			return true;
		}
		switch (type(char)) {
			case 'UPPERCASE_LETTER':
			case 'LOWERCASE_LETTER':
			case 'TITLECASE_LETTER':
			case 'MODIFIER_LETTER':
			case 'OTHER_LETTER':
			case 'LETTER_NUMBER':
			case 'CONNECTOR_PUNCTUATION':
			case 'DECIMAL_DIGIT_NUMBER':
			case 'NON_SPACING_MARK':
			case 'COMBINING_SPACING_MARK':
				return true;
		}
		return false;
	}

	Lex.prototype.isStrictModeReserved = function(id) {
		return strictReserved.hasOwnProperty(id);
	}

	Lex.prototype.isReserved = function(id) {
		return reserved.hasOwnProperty(id);
	}

	Lex.prototype.isKeyword = function(id) {
		return keywords.hasOwnProperty(id);
	}

	Lex.prototype.dealUnicodeEscapeSequence = function() {
		var d;
		var val = 0;
		for (var i = 0; i < 4; i++) {
			val *= 16;
			d = nextChar(this);
			if (d >= '0' && d <= '9') {
				val += subChar(d, '0');
			} else if (d >= 'A' && d <= 'F') {
				val += subChar(d, 'A') + 10;
			} else if (d >= 'a' && d <= 'f') {
				val += subChar(d, 'a') + 10;
			} else {
				this.throwError("Expected hex digits in unicode escape sequence");
				return "";
			}
		}
		return char(val);
	}

	Lex.prototype.proceedSpaces = function() {
		while (true) {
			var next = nextChar(this);
			switch (next) {
				case TAB:
				case VT:
				case FF:
				case SP:
				case NBSP:
				case BOM:
					break;
				case CR:
					if (lookahead(this) == LF)
						nextChar(this);
				case LF:
				case LS:
				case PS:
					this.line++;
					this.lineBefore = true;
					break;
				case '/':
					var n = lookahead(this);
					pushback(this);
					if (n == '/') {
						this.nextLineComment();
						break;
					} else if (n == '*') {
						this.startPtr = this.ptr;
						this.nextBlockComment();
						break;
					} else {
						return;
					}
				default:
					pushback(this);
					return;
			}
		}
	}

	Lex.prototype.nextRawToken = function() {
		while (true) {
			var next = nextChar(this);
			switch (next) {
				case '/':
					{
						if (lookahead(this) == '=') {
							nextChar(this);
							return new Token('/=');
						} else {
							return new Token('/');
						}
					}
				case '\\':
					{
						pushback(this);
						return this.nextIdentifier();
					}
				case '.':
					{
						var nch = lookahead(this);
						if (nch >= '0' && nch <= '9') {
							pushback(this);
							return this.nextDecimal();
						}
					}
				case '{':
				case '}':
				case '(':
				case ')':
				case '[':
				case ']':
				case ';':
				case ',':
				case '~':
				case '?':
				case ':':
					{
						return new Token(next);
					}
				case '<':
					{
						var nch = lookahead(this);
						if (nch == '=') {
							nextChar(this);
							return new Token('<=');
						} else if (nch == '<') {
							nextChar(this);
							if (lookahead(this) == '=') {
								nextChar(this);
								return new Token('<<=');
							} else {
								return new Token('<<');
							}
						} else {
							return new Token('<');
						}
					}
				case '>':
					{
						var nch = lookahead(this);
						if (nch == '=') {
							nextChar(this);
							return new Token(">=");
						} else if (nch == '>') {
							nextChar(this);
							var n2ch = lookahead(this);
							if (n2ch == '=') {
								nextChar(this);
								return new Token(">>=");
							} else if (n2ch == '>') {
								nextChar(this);
								if (lookahead(this) == '=') {
									nextChar(this);
									return new Token(">>>=");
								} else {
									return new Token('>>>');
								}
							} else {
								return new Token('>>');
							}
						} else {
							return new Token('>');
						}
					}
				case '=':
				case '!':
					{
						if (lookahead(this) == '=') {
							nextChar(this);
							if (lookahead(this) == '=') {
								nextChar(this);
								return new Token(next + "==");
							} else {
								return new Token(next + "=");
							}
						} else {
							return new Token(next);
						}
					}
				case '+':
				case '-':
				case '&':
				case '|':
					{
						var nch = lookahead(this);
						if (nch == '=') {
							nextChar(this);
							return new Token(next + "=");
						} else if (nch == next) {
							nextChar(this);
							return new Token(next + next);
						} else {
							return new Token(next);
						}
					}
				case '*':
				case '%':
				case '^':
					{
						if (lookahead(this) == '=') {
							nextChar(this);
							return new Token(next + '=');
						} else {
							return new Token(next);
						}
					}
				case '0':
					{
						var nch = lookahead(this);
						pushback(this);
						if (nch == 'x' || nch == 'X') {
							return this.nextHexInteger();
						} else if (nch >= '0' && nch <= '9') {
							return this.nextOctInteger();
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
					{
						pushback(this);
						return this.nextDecimal();
					}
				case '"':
				case '\'':
					{
						pushback(this);
						return this.nextString();
					}
				case '\uFFFF':
					{
						var token = new Token('eof');
						token.lineBefore = true;
						return token;
					}
			}
			if (this.isIdentfierStart(next)) {
				pushback(this);
				return this.nextIdentifier();
			}
			if (lastError) {
				lastError.detail.endOffset = this.ptr;
			} else {
				this.throwError("Unexpected source character(s)");
				var lastError = this.context.lastError();
			}
			this.proceedSpaces();
			this.startPtr = this.ptr;
		}
	}

	Lex.prototype.nextLineComment = function() {
		assertNext(this, '/');
		assertNext(this, '/');
		while (true) {
			var next = nextChar(this);
			switch (next) {
				case CR:
				case LF:
				case LS:
				case PS:
					{
						this.line++;
						this.lineBefore = true;
						return;
					}
				case '\uFFFF':
					return;
			}
		}
	}

	Lex.prototype.nextBlockComment = function() {
		assertNext(this, '/');
		assertNext(this, '*');
		while (true) {
			var next = nextChar(this);
			switch (next) {
				case '*':
					if (lookahead(this) == '/') {
						nextChar(this);
						return;
					}
					break;
				case CR:
				case LF:
				case LS:
				case PS:
					this.line++;
					this.lineBefore = true;
					break;
				case '\uFFFF':
					pushback(this);
					this.throwError("Block comment is not enclosed");
					return;
			}
		}
	}

	Lex.prototype.nextIdentifier = function() {
		var escaped = false;
		var id = nextChar(this);
		if (id == '\\') {
			escaped = true;
			if (nextChar(this) != 'u') {
				this.throwError("Expected unicode escape sequence");
			} else {
				id = this.dealUnicodeEscapeSequence();
				if (id && !this.isIdentfierStart(id)) {
					this.throwError("Illegal unicode escape sequence as identifier start");
				}
			}
		} else {
			assert(this.isIdentfierStart(id));
		}
		while (true) {
			var next = nextChar(this);
			if (next == '\\') {
				escaped = true;
				if (nextChar(this) != 'u') {
					this.throwError("Expected unicode escape sequence");
				} else {
					var val = this.dealUnicodeEscapeSequence();
					if (val && !this.isIdentfierPart(val)) {
						this.throwError("Illegal unicode escape sequence as identifier part");
					}
					id += val;
				}
			} else if (this.isIdentfierPart(next)) {
				id += next;
			} else {
				pushback(this);
				if (this.parseId && !escaped) {
					if (this.isStrictModeReserved(id)) {
						var token = new Token('id');
						token.value = id;
						token.noStrict = 'Future reserved word as identifiers';
						return token;
					} else if (this.isReserved(id)) {
						this.throwError("Reserved word cannot be used as identifiers");
					} else if (this.isKeyword(id)) {
						return new Token(id);
					}
				}
				var token = new Token('id');
				token.value = id;
				return token;
			}
		}
	}

	Lex.prototype.nextOctInteger = function() {
		assertNext(this, '0');
		var raw = "";
		var error = false;
		while (true) {
			var next = nextChar(this);
			if (next >= '0' && next <= '7') {
				raw += next;
			} else if (next == '8' || next == '9') {
				error = true;
			} else {
				pushback(this);
				if (next == '\\' || this.isIdentfierStart(next)) {
					this.nextIdentifier();
					this.throwError("Unexpected character after number literal");
				} else if (error) {
					this.throwError("Unexpected digits in octal number literal");
				}
				var token = new Token('num');
				token.value = parseInt(raw, 8);
				token.noStrict = "Octal literal";
				return token;
			}
		}
	}

	Lex.prototype.nextHexInteger = function() {
		assertNext(this, '0');
		assertNext(this, 'xX');
		var rawNumber = "";
		while (true) {
			var next = nextChar(this);
			if (this.isHexDigit(next)) {
				rawNumber += next;
			} else {
				pushback(this);
				if (next == '\\' || this.isIdentfierStart(next)) {
					this.nextIdentifier();
					this.throwError("Unexpected character after number literal");
				}
				var token = new Token('num');
				token.value = parseInt(rawNumber, 16);
				return token;
			}
		}
	}

	Lex.prototype.nextDecimal = function() {
		var that = this;

		function decimal() {
			var decimal = "";
			while (true) {
				var next = nextChar(that);
				if (next >= '0' && next <= '9') {
					decimal += next;
				} else {
					pushback(that);
					return decimal;
				}
			}
		}

		function exp() {
			assertNext(that, "eE");
			var next = lookahead(that);
			var sign = "+";
			if (next == '+' || next == '-') {
				sign = nextChar(that);
			}
			var expPart = "";
			while (true) {
				var next = nextChar(that);
				if (next >= '0' && next <= '9') {
					expPart += next;
				} else {
					break;
				}
			}
			pushback(that);
			if (!expPart.length) {
				that.throwError("Expected +, - or digits after the exponential mark");
			}
			return "e" + sign + expPart;
		}
		var raw = decimal();
		if (raw) {
			var next = lookahead(this);
			if (next == '.') {
				nextChar(this);
				raw += '.';
				raw += decimal();
				next = lookahead(this);
				if (next == 'e' || next == 'E') {
					raw += exp();
				}
			} else if (next == 'e' || next == 'E') {
				raw += exp();
			}
		} else {
			assertNext(this, '.');
			var dec = decimal();
			assert(dec);
			raw = "." + dec;
			next = lookahead(this);
			if (next == 'e' || next == 'E') {
				raw += exp();
			}
		}
		next = lookahead(this);
		if (next == '\\' || this.isIdentfierStart(next)) {
			this.nextIdentifier();
			this.throwError("Unexpected character after number literal");
		}
		var token = new Token('num');
		token.value = parseFloat(raw);
		return token;
	}

	Lex.prototype.nextString = function() {
		var quote = assertNext(this, '\'"');
		var value = "";
		var oct = false;
		while (true) {
			var next = nextChar(this);
			switch (next) {
				case quote:
					var token = new Token('str');
					token.value = value;
					return token;
				case '\\':
					next = nextChar(this);
					switch (next) {
						case CR:
							if (lookahead(this) == LF) {
								nextChar(this);
								break;
							}
						case LF:
						case LS:
						case PS:
							this.line++;
							break;
						case '\'':
							value += '\'';
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
								var ll1 = lookahead(this);
								if (ll1 < '0' || ll1 > '7') {
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
								var ll1 = lookahead(this);
								if (ll1 < '0' || ll1 > '7') {
									value += char(subChar(next, '0'));
									break;
								}
								nextChar(this);
								var ll2 = lookahead(this);
								if (ll2 < '0' || ll2 > '7' || (next >= '4' && next <= '7')) {
									value += char(subChar(next, '0') * 8 + subChar(ll1, '0'));
								} else {
									nextChar(this);
									value += char(subChar(next, '0') * 64 + subChar(ll1, '0') * 8 + subChar(ll2, '0'));
								}
								break;
							}

						case 'x':
							var d;
							var val = 0;
							for (var i = 0; i < 2; i++) {
								val *= 16;
								d = nextChar(this);
								if (d >= '0' && d <= '9') {
									val += subChar(d, '0');
								} else if (d >= 'A' && d <= 'F') {
									val += subChar(d, 'A') + 10;
								} else if (d >= 'a' && d <= 'f') {
									val += subChar(d, 'a') + 10;
								} else {
									this.throwError("Expected hex digits in hexical escape sequence");
									break;
								}
							}
							value += char(val);
							break;
						case 'u':
							value += this.dealUnicodeEscapeSequence();
							break;
						default:
							value += next;
							break
					}
					break;
				case CR:
				case LF:
				case LS:
				case PS:
				case '\uFFFF':
					pushback(this);
					this.throwError("String literal is not enclosed");
					var token = new Token('str');
					token.value = value;
					if (oct == true) {
						token.noStrict = 'Octal escape sequence';
					}
					return token;
				default:
					value += next;
					break;
			}
		}
	}

	Lex.prototype.nextRawRegexp = function() {
		assertNext(this, '/');
		var regexp = "";
		var inClass = false;
		loop: while (true) {
			var nxt = nextChar(this);
			switch (nxt) {
				case '/':
					if (inClass) {
						regexp += '/';
						break;
					}
					break loop;
				case '\\':
					nxt = nextChar(this);
					switch (nxt) {
						case CR:
						case LF:
						case LS:
						case PS:
						case '\uFFFF':
							pushback(this);
							this.throwError("Regexp literal is not enclosed");
							break loop;
					}
					regexp += '\\' + nxt;
					break;
				case '[':
					regexp += '[';
					inClass = true;
					break;
				case ']':
					regexp += ']';
					inClass = false;
					break;
				case CR:
				case LF:
				case LS:
				case PS:
				case '\uFFFF':
					pushback(this);
					this.throwError("Regexp literal is not enclosed");
					break loop;
				default:
					regexp += nxt;
					break;
			}
		}
		var flags = "";
		while (true) {
			var next = nextChar(this);
			if (next == '\\') {
				if (nextChar(this) != 'u') {
					this.throwError("Expected unicode escape sequence");
					continue;
				}
				next = this.dealUnicodeEscapeSequence();
				if (!this.isIdentfierPart(next)) {
					this.throwError("Illegal identifier part in regexp flags");
				}
				flags += next;
			} else if (this.isIdentfierPart(next)) {
				flags += next;
			} else {
				pushback(this);
				var token = new Token('regexp');
				token.regexp = regexp;
				token.flags = flags;
				return token;
			}
		}
	}

	Lex.prototype.nextToken = function() {
		this.proceedSpaces();
		this.startPtr = this.ptr;
		var startLine = this.line;
		var ret = this.nextRawToken();
		if (this.lineBefore) {
			ret.lineBefore = this.lineBefore;
			this.lineBefore = false;
		}
		ret.startPtr = this.startPtr;
		ret.startLine = startLine;
		ret.endPtr = this.ptr;
		ret.endLine = this.line;
		return ret;
	}

	Lex.prototype.nextRegexp = function(tk) {
		pushback(this, tk.type.length);
		this.startPtr = this.ptr;
		var startLine = this.line;
		var ret = this.nextRawRegexp();
		if (this.lineBefore) {
			ret.lineBefore = this.lineBefore;
			this.lineBefore = false;
		}
		ret.startPtr = this.startPtr;
		ret.startLine = startLine;
		ret.endPtr = this.ptr;
		ret.endLine = this.line;
		return ret;
	}

	Lex.prototype.getRaw = function(tk) {
		return this.source.substring(tk.startPtr, tk.endPtr);
	}

	return Lex;
}();