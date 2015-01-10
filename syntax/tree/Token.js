export class Comment {
	constructor(type, range, value) {
		this.type = type;
		this.range = range;
		this.value = value;
	}
}

export class Token {
	constructor(type) {
		this.type = type;
	}
}

export class NumberLiteral extends Token {
	constructor(value) {
		super('Number');
		this.value = value;
	}

	isValidSimpleAssignmentTarget() {
		return false;
	}
}

export class StringLiteral extends Token {
	constructor(value) {
		super('String');
		this.value = value;
	}

	isValidSimpleAssignmentTarget() {
		return false;
	}
}

export class Identifier extends Token {
	constructor(value) {
		super('Identifier');
		this.value = value;
	}

	isValidSimpleAssignmentTarget() {
		return true;
	}
}