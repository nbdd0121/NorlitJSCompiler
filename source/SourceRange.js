import SourcePosition from './SourcePosition';

export default class SourceRange {
	constructor(source, start, end) {
		this.source = source;
		this.start = new SourcePosition(source, start);
		this.end = new SourcePosition(source, end);
	}
}
