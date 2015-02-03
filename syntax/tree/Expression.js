export class Expression {
	isValidSimpleAssignmentTarget() {
		return false;
	}

	isFunctionDefinition() {
		return false;
	}
}

export class ObjectPattern {
	constructor(elements) {
		this.type = 'ObjectPattern';
		this.elements = elements;
	}
}

export class ArrayPattern {
	constructor(elements) {
		this.type = 'ArrayPattern';
		this.elements = elements;
	}
}

export class DefaultParameter {
	constructor(pattern, defaultValue = null) {
		this.type = 'DefaultParameter';
		this.pattern = pattern;
		this.default = defaultValue;
	}
}

export class ArrayLiteral extends Expression {
	constructor(elements) {
		this.type = 'ArrayLiteral';
		this.elements = elements;
	}
}

export class ObjectLiteral extends Expression {
	constructor(elements) {
		this.type = 'ObjectLiteral';
		this.elements = elements;
	}
}

export class PropertyDefinition {
	constructor(key, value, computed = false) {
		this.type = 'PropertyDefinition';
		this.key = key;
		this.value = value;
		this.computed = computed;
	}
}

export class TemplateLiteral {
	constructor(literal, substitution) {
		this.type = 'TemplateLiteral';
		this.literal = literal;
		this.substitution = substitution;
	}
}

export class CoveredFormals {
	constructor(body) {
		this.type = 'CoveredFormals';
		this.body = body;
	}
}

export class CoverInitializedName {
	constructor(key, value) {
		this.type = 'CoverInitializedName';
		this.key = key;
		this.value = value;
	}
}

/* LeftHandSideExpression */

export class NewTargetExpression extends Expression {
	constructor(args = null) {
		this.type = 'NewTargetExpression';
	}
}

export class SuperCallExpression extends Expression {
	constructor(args = null) {
		this.type = 'SuperCallExpression';
		this.arguments = args;
	}
}

export class SuperPropertyExpression extends Expression {
	constructor(prop, computed = true) {
		this.type = 'SuperPropertyExpression';
		this.property = prop;
		this.computed = computed;
	}

	isValidSimpleAssignmentTarget() {
		return true;
	}
}

export class NewExpression extends Expression {
	constructor(constructor, args = null) {
		this.type = 'NewExpression';
		this.constructor = constructor;
		this.arguments = args;
	}
}

export class CallExpression extends Expression {
	constructor(constructor, args = null) {
		this.type = 'CallExpression';
		this.callee = constructor;
		this.arguments = args;
	}
}

export class MemberExpression extends Expression {
	constructor(base, prop, computed = true) {
		this.type = 'MemberExpression';
		this.base = base;
		this.property = prop;
		this.computed = computed;
	}

	isValidSimpleAssignmentTarget() {
		return true;
	}
}

export class TaggedTemplateExpression extends Expression {
	constructor(tag, template) {
		this.type = 'TaggedTemplateExpression';
		this.tag = tag;
		this.template = template;
	}
}

export class SpreadExpression {
	constructor(operand) {
		this.type = 'SpreadExpression';
		this.operand = operand;
	}
}

export class PostfixExpression extends Expression {
	constructor(expr, operator) {
		this.type = 'PostfixExpression';
		this.operand = expr;
		this.operator = operator;
	}
}

export class UnaryExpression extends Expression {
	constructor(expr, operator) {
		this.type = 'UnaryExpression';
		this.operand = expr;
		this.operator = operator;
	}
}

export class BinaryExpression extends Expression {
	constructor(operator, left, right) {
		this.type = 'BinaryExpression';
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
}

export class ConditionalExpression extends Expression {
	constructor(test, trueExpr, falseExpr) {
		this.type = 'ConditionalExpression';
		this.test = test;
		this.true = trueExpr;
		this.false = falseExpr;
	}
}