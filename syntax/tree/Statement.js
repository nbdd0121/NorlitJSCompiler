export class Statement {
	isDeclaration() {
		return false;
	}

	containsDuplicateLabels(labelSet) {
		return false;
	}

	containsUndefinedBreakTarget(labelSet) {
		return false;
	}

	containsUndefinedContinueTarget(iterationSet, labelSet) {
		return false;
	}

	varDeclaredNames() {
		console.log('varDeclaredNames default bypass: ' + this.type);
		return [];
	}

	varScopedDeclarations() {
		console.log('varScopedDeclarations default bypass: ' + this.type);
		return [];
	}
}

export class StatementList {
	static containsDuplicateLabels(body, labelSet) {
		for (let stmt of body) {
			if (stmt.containsDuplicateLabels(labelSet))
				return true;
		}
		return false;
	}

	static containsUndefinedBreakTarget(body, labelSet) {
		for (let stmt of body) {
			if (stmt.containsUndefinedBreakTarget(labelSet))
				return true;
		}
		return false;
	}

	static containsUndefinedContinueTarget(body, iterationSet, labelSet) {
		for (let stmt of this) {
			if (stmt.containsUndefinedContinueTarget(iterationSet, Object.create(null)))
				return true;
		}
		return false;
	}

	static lexicallyDeclaredNames() {
		const names = [];
		for (let stmt of body) {
			if (stmt.isDeclaration()) {
				Array.prototype.push.apply(names, stmt.boundNames());
			} else if (stmt instanceof LabelledStatement) {
				Array.prototype.push.apply(names, stmt.lexicallyDeclaredNames());
			}
		}
		return names;
	}

	static topLevelLexicallyDeclaredNames(body) {
		const names = [];
		for (let stmt of body) {
			if (stmt.isDeclaration() && stmt.type !== 'FunctionDeclaration') {
				Array.prototype.push.apply(names, stmt.boundNames());
			}
		}
		return names;
	}

	static topLevelVarDeclaredNames(body) {
		const names = [];
		for (let stmt of body) {
			if (stmt.isDeclaration()) {
				if (stmt.type === 'FunctionDeclaration')
					Array.prototype.push.apply(names, stmt.boundNames());
			} else {
				if (stmt instanceof LabelledStatement) {
					Array.prototype.push.apply(names, stmt.topLevelVarDeclaredNames());
				} else {
					Array.prototype.push.apply(names, stmt.varDeclaredNames());
				}
			}
		}
		return names;
	}

	static topLevelVarScopedDeclarations(body) {
		const declarations = [];
		for (let stmt of body) {
			if (stmt.isDeclaration()) {
				if (stmt.type === 'FunctionDeclaration') {
					declarations.push(stmt);
				}
			} else {
				if (stmt instanceof LabelledStatement) {
					Array.prototype.push.apply(declarations, stmt.topLevelVarScopedDeclarations());
				} else {
					Array.prototype.push.apply(declarations, stmt.varScopedDeclarations());
				}
			}
		}
		return declarations;
	}

	static varDeclaredNames() {
		const names = [];
		for (let stmt of body) {
			if (!stmt.isDeclaration()) {
				Array.prototype.push.apply(names, stmt.varDeclaredNames());
			}
		}
		return names;
	}
}

export class BlockStatement extends Statement {
	constructor(body) {
		this.type = 'BlockStatement';
		this.body = body;
	}

	containsDuplicateLabels(labelSet) {
		return StatementList.containsDuplicateLabels(this.body, labelSet);
	}

	containsUndefinedBreakTarget(labelSet) {
		return StatementList.containsUndefinedBreakTarget(this.body, labelSet);
	}

	containsUndefinedContinueTarget(iterationSet, labelSet) {
		return StatementList.containsUndefinedBreakTarget(this.body, iterationSet, labelSet);
	}

	lexicallyDeclaredNames() {
		return StatementList.lexicallyDeclaredNames(this.body);
	}


}

export class VariableDeclaration extends Statement {
	constructor(type, declarations) {
		this.type = 'VariableDeclaration';
		this.kind = type;
		this.declarations = declarations;
	}

	isDeclaration() {
		return this.kind !== 'var';
	}

	boundNames() {
		let names = [];
		for (let decl of this.declarations) {
			names = names.concat(decl.boundNames());
		}
		return names;
	}

	varDeclaredNames() {
		return this.boundNames();
	}

	varScopedDeclarations() {
		return [this];
	}
}

export class VariableDeclarator {
	constructor(name, init = null) {
		this.type = 'VariableDeclarator';
		this.name = name;
		this.initializer = init;
	}
	boundNames() {
		if (this.name.type === 'Identifier') {
			return this.name.value;
		} else {
			return this.name.boundNames();
		}
	}
}

export class EmptyStatement extends Statement {
	constructor() {
		this.type = 'EmptyStatement';
	}
}

export class ExpressionStatement extends Statement {
	constructor(expr) {
		this.type = 'ExpressionStatement';
		this.expression = expr;
	}
}

export class IfStatement extends Statement {
	constructor(test, trueStmt, falseStmt = null) {
		this.type = 'IfStatement';
		this.test = test;
		this.true = trueStmt;
		this.false = falseStmt;
	}
}

export class DoStatement extends Statement {
	constructor(body, test) {
		this.type = 'DoStatement';
		this.test = test;
		this.body = body;
	}
}

export class WhileStatement extends Statement {
	constructor(test, body) {
		this.type = 'WhileStatement';
		this.test = test;
		this.body = body;
	}
}

export class ForStatement extends Statement {
	constructor(init, test, inc, body) {
		this.type = 'ForStatement';
		this.init = init;
		this.test = test;
		this.inc = inc;
		this.body = body;
	}
}

export class ForInStatement extends Statement {
	constructor(init, collection, body) {
		this.type = 'ForInStatement';
		this.init = init;
		this.collection = collection;
		this.body = body;
	}
}

export class ForOfStatement extends Statement {
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

export class SwitchStatement extends Statement {
	constructor(expr, body) {
		this.type = 'SwitchStatement';
		this.expression = expr;
		this.body = body;
	}
}

export class ContinueStatement extends Statement {
	constructor(label = null) {
		this.type = 'ContinueStatement';
		this.label = label;
	}
}

export class BreakStatement extends Statement {
	constructor(label = null) {
		this.type = 'BreakStatement';
		this.label = label;
	}
}

export class ReturnStatement extends Statement {
	constructor(expr = null) {
		this.type = 'ReturnStatement';
		this.expression = expr;
	}
}

export class WithStatement extends Statement {
	constructor(base, body) {
		this.type = 'WithStatement';
		this.base = base;
		this.body = body;
	}
}

export class LabelledStatement extends Statement {
	constructor(label, body) {
		this.type = 'LabelledStatement';
		this.label = label;
		this.body = body;
	}
}

export class ThrowStatement extends Statement {
	constructor(expr) {
		this.type = 'ThrowStatement';
		this.expression = expr;
	}
}

export class TryStatement extends Statement {
	constructor(body, parameter, tryBlock, catchBlock) {
		this.type = 'TryStatement';
		this.body = body;
		this.parameter = parameter;
		this.try = tryBlock;
		this.catch = catchBlock;
	}
}

export class DebuggerStatement extends Statement {
	constructor() {
		this.type = 'DebuggerStatement';
	}
}

export class DirectiveStatement extends Statement {
	constructor(directive) {
		this.type = 'DirectiveStatement';
		this.directive = directive;
	}
}