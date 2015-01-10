import SourceRange from 'source/SourceRange';

export default class Source {
	constructor(name, content) {
		this.name = name;
		this.content = content;
		this.lineTable = this._generateLineTable();
	}

	getLine(offset) {
		let alpha = 0,
			beta = this.lineTable.length;
		while (true) {
			/* Bitwise shift is 10 times faster */
			const mid = (alpha + beta) >> 1;
			if (this.lineTable[mid] > offset) {
				beta = mid;
			} else if (this.lineTable[mid + 1] <= offset) {
				alpha = mid + 1;
			} else {
				return mid;
			}
		}
	}

	getColumn(offset, line = getLine(offset)) {
		return offset - this.lineTable[line];
	}

	getLineAndColumn(offset) {
		const line = this.getLine(offset);
		const column = this.getColumn(offset, line);
		return [line, column];
	}

	createRange(start, end) {
		return new SourceRange(this, start, end);
	}

	getLineText(line) {
		const start = this.lineTable[line];
		const end = this.lineTable[line + 1] - 1 || this.content.length;
		if (this.content[end] === '\n') {
			if (this.content[end - 1] === '\r') {
				return this.content.substring(start, end - 1);
			}
		}
		return this.content.substring(start, end);
	}

	_generateLineTable() {
		const content = this.content;
		const lineTable = [0];
		for (let i = 0; i < content.length; i++) {
			switch (content[i]) {
				case '\r':
					lineTable.push((content[i + 1] === '\n' ? ++i : i) + 1);
					break;
				case '\n':
				case '\u2028':
				case '\u2029':
					lineTable.push(i + 1);
					break;
			}
		}
		return lineTable;
	}
}