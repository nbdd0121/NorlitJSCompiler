import {
	Expression
}
from './Expression';

import {
	Statement,
	StatementList
}
from './Statement';

export class FormalParameters {
	static boundNames(param) {
		const names = [];
		for (let arg of param) {
			switch (arg.type) {
				case 'SpreadExpression':
					names.push(arg.operand.value);
					break;
				case 'Identifier':
					names.push(arg.value);
					break;
				case 'DefaultParameter':
					if (arg.pattern.type === 'Identifier')
						names.push(arg.pattern.value);
					else
						Array.prototype.push.apply(names, arg.pattern.boundNames());
					break;
				default:
					Array.prototype.push.apply(names, arg.boundNames());
					break;
			}
		}
		return names;
	}

	static isSimpleParameterList(param) {
		for (let arg of param) {
			if (arg.type !== 'Identifier') return false;
		}
		return true;
	}

	static containsExpression(param) {
		for (let arg of param) {
			if (arg.type === 'Identifier') continue;
			else if (arg.type === 'DefaultParameter') return true;
			else return arg.containsExpression();
		}
		return false;
	}
}

export class FunctionExpression {
	constructor(generator, name, param, body) {
		this.type = 'FunctionExpression';
		this.generator = generator;
		this.name = name;
		this.parameters = param;
		this.body = body;
	}
}

export class FunctionDeclaration extends Statement {
	constructor(generator, name, param, body) {
		this.type = 'FunctionDeclaration';
		this.generator = generator;
		this.name = name;
		this.parameters = param;
		this.body = body;
	}

	boundNames() {
		if (this.name)
			return [this.name.value];
		else
			return ['*default*'];
	}

	isDeclaration() {
		return true;
	}
}

export class ArrowFunction extends Expression {
	constructor(param, body) {
		this.type = 'ArrowFunction';
		this.parameters = param;
		this.body = body;
	}

	isFunctionDefinition() {
		return true;
	}
}

export class ClassExpression {
	constructor(name, superClass, body) {
		this.type = 'ClassExpression';
		this.name = name;
		this.super = superClass;
		this.body = body;
	}
}

export class ClassDeclaration extends Statement {
	constructor(name, superClass, body) {
		this.type = 'ClassDeclaration';
		this.name = name;
		this.super = superClass;
		this.body = body;
	}

	isDeclaration() {
		return true;
	}
}

export class MethodDefinition {
	constructor(generator, name, param, body, computed = false) {
		this.type = 'MethodDefinition';
		this.generator = generator;
		this.name = name;
		this.parameters = param;
		this.body = body;
		this.computed = computed;
	}
}

export class YieldExpression extends Expression {
	constructor(expr = null, forEach = false) {
		this.type = 'YieldExpression';
		this.expression = expr;
		this.forEach = forEach;
	}
}

export class GetterDefinition {
	constructor(name, body, computed = false) {
		this.type = 'GetterDefinition';
		this.name = name;
		this.body = body;
		this.computed = computed;
	}
}

export class SetterDefinition {
	constructor(name, param, body, computed = false) {
		this.type = 'SetterDefinition';
		this.name = name;
		this.parameter = param;
		this.body = body;
		this.computed = computed;
	}
}