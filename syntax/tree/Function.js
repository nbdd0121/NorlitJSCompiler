export class FunctionExpression {
	constructor(generator, name, param, body) {
		this.type = 'FunctionExpression';
		this.generator = generator;
		this.name = name;
		this.parameters = param;
		this.body = body;
	}
}

export class FunctionDeclaration {
	constructor(generator, name, param, body) {
		this.type = 'FunctionExpression';
		this.generator = generator;
		this.name = name;
		this.parameters = param;
		this.body = body;
	}
}

export class ArrowFunction {
	constructor(param, body) {
		this.type = 'ArrowFunction';
		this.parameters = param;
		this.body = body;
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

export class ClassDeclaration {
	constructor(name, superClass, body) {
		this.type = 'ClassDeclaration';
		this.name = name;
		this.super = superClass;
		this.body = body;
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

export class GeneratorMethod {
	constructor(name, param, body, computed = false) {
		this.type = 'GeneratorMethod';
		this.name = name;
		this.parameters = param;
		this.body = body;
		this.computed = computed;
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