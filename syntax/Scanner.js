import Unicode from 'syntax/unicode/Unicode'
import Context from 'syntax/Context'
import Assertion from 'util/Assertion'


class Scanner {
	constructor(context, source) {
		Assertion.checkType(source, 'string');
		this.context = context;
		this.source = source;
		this.pointer = 0;

		this._processComments = false;
	}

	static isWhitespace(char) {
		Assertion.checkArguments(arguments, 'string');
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
		Assertion.checkArguments(arguments, 'string');
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

	_next(len = 1) {
		const ret = this.source.substring(this.pointer, this.pointer + len);
		this.pointer += len;
		return ret || undefined;
	}

	_consume(len = 1) {
		this.pointer += len;
	}

	_pushback(len = 1) {
		this.pointer -= len;
	}

	_lookahead(len = 1) {
		return this.source.substring(this.pointer, this.pointer + len) || undefined;
	}

	_expect(seq) {
		const taken = this._next(seq.length);
		Assertion.assert(taken === seq, `Expected \`${seq}\`, but encountered \`${taken}\``);
	}

	_start() {
		this.tokenStart = this.pointer;
	}

	_end() {
		const ret = [this.tokenStart, this.pointer];
		this.tokenStart = undefined;
		return ret;
	}

	_wrap(unit) {
		const range = this._end();
		unit.range = range;
		return unit;
	}

	_throw(msg) {
		const range = [this.tokenStart, this.pointer];
		const err = new SyntaxError(msg);
		err.range = range;
		err.source = this;
		this.context.error(err);
	}

	/* Helper used by syntax/Context */

	getPositionFromIndex(pos) {
		const prevStr = this.source.substring(0, pos);
		const matches = prevStr.match(/\r\n|[\r\n\u2028\u2029]/g);
		const line = matches ? matches.length + 1 : 1;
		const column = prevStr.replace(/[^]*(\r\n|[\r\n\u2028\u2029])/, '').length;
		return [line, column];
	}

	getLineEndByStart(pos) {
		const regex = /\r\n|[\r\n\u2028\u2029]/g;
		const src = this.source.substring(pos);
		return regex.exec(src) ? regex.lastIndex + pos - 1 : src.length + pos;
	}

	rawFromRange(range) {
		return this.source.substring(...range);
	}

	/* Comments ES6 11.4 */

	parseLineComment(ignore = true) {
		this._start();
		this._expect('//');
		while (true) {
			const char = this._next();
			if (!char || Scanner.isLineTerminator(char)) {
				this._pushback();
				break;
			}
		}
		if (!ignore) {
			return this._wrap(new Comment('Line', this.source.substring(this.tokenStart + 2, this.pointer)));
		}
	}

	parseBlockComment(ignore = true) {
		this._start();
		this._expect('/*');
		while (true) {
			if (this._lookahead(2) == '*/') {
				this._consume(2);
				break;
			} else if (!this._next()) {
				this._throw('Block comment is not enclosed');
			}
		}
		if (!ignore) {
			return this._wrap(new Comment('Block', this.source.substring(this.tokenStart + 2, this.pointer - 2)));
		}
	}

	parseComment(ignore = true) {
		return this._lookahead(2) == '//' ? this.parseLineComment(ignore) : this.parseBlockComment(ignore);
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
				if (llh == '/' || llh == '*') {
					if (!this._processComments) {
						this.parseComment();
					} else {
						if (!this._leadingComments) {
							this._leadingComments = [];
						}
						this._leadingComments.push(this.parseComment(false));
					}
				} else {
					return;
				}
			}
		}
	}

}

class LexicalUnit {
	constructor() {

	}
}

class Comment extends LexicalUnit {
	constructor(type, content) {
		this.type = type;
		this.content = content;
	}
}

var ctx = new Context();
var syn = new Scanner(ctx,
	`/* a=1; *a*/ 
	`);
syn._processComments = true;
syn.skipWhitespace();
console.log(syn._leadingComments);