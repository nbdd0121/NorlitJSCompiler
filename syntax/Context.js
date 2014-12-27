import StringUtil from 'util/StringUtil';

class Context {
	constructor() {

	}
	error(err) {
		const scanner = err.source;
		const [lineNum, column] = scanner.getPositionFromIndex(err.range[0]);
		const lineStart = err.range[0] - column;
		const lineEnd = scanner.getLineEndByStart(lineStart);
		const line = scanner.rawFromRange([lineStart, lineEnd]);
		console.log(err.toString() + ' at Line ' + lineNum + ":" + (column + 1));
		console.log(line);
		console.log(StringUtil.repeat(' ', column) + StringUtil.repeat('~', err.range[1] - err.range[0] - 1) + '^');
		throw 'Abort';
	}
}

export default Context;