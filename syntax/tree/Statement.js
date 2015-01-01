export class BlockStatement {
	constructor(body) {
		this.type = 'BlockStatement';
		this.body = body;
	}
}

export class VariableDeclaration {
	constructor(type, declarations) {
		this.type = 'VariableDeclaration';
		this.kind = type;
		this.declarations = declarations;
	}
}

export class VariableDeclarator {
	constructor(name, init) {
		this.type = 'VariableDeclarator';
		this.name = name;
		this.initializer = init;
	}
}

export class EmptyStatement {
	constructor() {
		this.type = 'EmptyStatement';
	}
}

export class ExpressionStatement {
	constructor(expr) {
		this.type = 'ExpressionStatement';
		this.expr = expr;
	}
}

export class IfStatement {
	constructor(test, trueStmt, falseStmt = null) {
		this.type = 'IfStatement';
		this.test = test;
		this.true = trueStmt;
		this.false = falseStmt;
	}
}

export class ContinueStatement {
	constructor(label = null) {
		this.type = 'ContinueStatement';
		this.label = label;
	}
}

export class BreakStatement {
	constructor(label = null) {
		this.type = 'BreakStatement';
		this.label = label;
	}
}

export class ReturnStatement {
	constructor(expr = null) {
		this.type = 'ReturnStatement';
		this.expression = expr;
	}
}

export class DebuggerStatement {
	constructor() {
		this.type = 'DebuggerStatement';
	}
}

export class DirectiveStatement {
	constructor(directive) {
		this.type = 'DirectiveStatement';
		this.directive = directive;
	}
}