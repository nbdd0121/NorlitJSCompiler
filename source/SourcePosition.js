export default class SourcePosition {
	constructor(source, offset) {
		this.source = source;
		this.offset = offset;

		/* Idea about this trick comes from traceur */
		this._line = null;
		this._column = null;
	}

	get line() {
		if (!this._line) {
			[this._line, this._column] = this.source.getLineAndColumn(this.offset);
		}
		return this._line;
	}

	get column() {
		if (!this._column) {
			[this._line, this._column] = this.source.getLineAndColumn(this.offset);
		}
		return this._column;
	}
}