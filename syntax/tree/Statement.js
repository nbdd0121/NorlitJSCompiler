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
	constructor(name, init = null) {
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
		this.expression = expr;
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

export class DoStatement {
	constructor(body, test) {
		this.type = 'DoStatement';
		this.test = test;
		this.body = body;
	}
}

export class WhileStatement {
	constructor(test, body) {
		this.type = 'WhileStatement';
		this.test = test;
		this.body = body;
	}
}

export class ForStatement {
	constructor(init, test, inc, body) {
		this.type = 'ForStatement';
		this.init = init;
		this.test = test;
		this.inc = inc;
		this.body = body;
	}
}

export class ForInStatement {
	constructor(init, collection, body) {
		this.type = 'ForInStatement';
		this.init = init;
		this.collection = collection;
		this.body = body;
	}
}

export class ForOfStatement {
	constructor(init, collection, body) {
		this.type = 'ForOfStatement';
		this.init = init;
		this.collection = collection;
		this.body = body;
	}
}

export class CaseClause {
	constructor(test, body) {
		this.type = 'CaseClause';
		this.test = test;
		this.body = body;
	}
}

export class SwitchStatement {
	constructor(expr, body) {
		this.type = 'SwitchStatement';
		this.expression = expr;
		this.body = body;
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

export class WithStatement {
	constructor(base, body) {
		this.type = 'WithStatement';
		this.base = base;
		this.body = body;
	}
}

export class LabelledStatement {
	constructor(label, body) {
		this.type = 'LabelledStatement';
		this.label = label;
		this.body = body;
	}
}

export class ThrowStatement {
	constructor(expr) {
		this.type = 'ThrowStatement';
		this.expression = expr;
	}
}

export class TryStatement {
	constructor(body, parameter, tryBlock, catchBlock) {
		this.type = 'TryStatement';
		this.body = body;
		this.parameter = parameter;
		this.try = tryBlock;
		this.catch = catchBlock;
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