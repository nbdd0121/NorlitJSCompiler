import StringUtil from '../util/StringUtil';

class Context {
	constructor() {

	}
	error(err, range) {
		if (!range) {
			range = err.source.source.createRange(...err.range);
		}
		if (range.start.line === range.end.line) {
			console.log(`${range.source.name}: Line ${range.start.line + 1}:${range.start.column + 1}-${range.end.column + 1}: ${err}`);
			console.log(range.source.getLineText(range.start.line));
			console.log(
				StringUtil.repeat(' ', range.start.column) +
				StringUtil.repeat('~', range.end.offset - range.start.offset - 1) + '^'
			);
		} else {
			console.log(`${err} at Line ${range.start.line + 1}:${range.start.column + 1}-${range.end.line}:${range.end.column + 1}`);
			const endLineNum = range.end.line;
			/* First Line */
			{
				const text = range.source.getLineText(range.start.line);
				console.log(text);
				console.log(
					StringUtil.repeat(' ', range.start.column) +
					StringUtil.repeat('~', text.length - range.start.column + 1)
				);
			}
			for (let i = range.start.line + 1; i < endLineNum - 1; i++) {
				const text = range.source.getLineText(i);
				console.log(text);
				console.log(StringUtil.repeat('~', text.length + 1));
			}

			console.log(range.source.getLineText(endLineNum));
			console.log(StringUtil.repeat('~', range.end.column) + '^');
		}
		throw '1 error found. Parsing aborted.';
	}
}

export default Context;
