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

export class ArrayLiteral {
	constructor(elements) {
		this.type = 'ArrayLiteral';
		this.elements = elements;
	}
}

export class ObjectLiteral {
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

export class SuperNewExpression {
	constructor(args = null) {
		this.type = 'SuperNewExpression';
		this.arguments = args;
	}
}

export class SuperCallExpression {
	constructor(args = null) {
		this.type = 'SuperCallExpression';
		this.arguments = args;
	}
}

export class SuperPropertyExpression {
	constructor(prop, computed = true) {
		this.type = 'SuperMemberExpression';
		this.property = prop;
		this.computed = computed;
	}
}

export class NewExpression {
	constructor(constructor, args = null) {
		this.type = 'NewExpression';
		this.constructor = constructor;
		this.arguments = args;
	}
}

export class CallExpression {
	constructor(constructor, args = null) {
		this.type = 'CallExpression';
		this.constructor = constructor;
		this.arguments = args;
	}
}

export class MemberExpression {
	constructor(base, prop, computed = true) {
		this.type = 'MemberExpression';
		this.base = base;
		this.property = prop;
		this.computed = computed;
	}
}

export class TaggedTemplateExpression {
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

export class PostfixExpression {
	constructor(expr, operator) {
		this.type = 'PostfixExpression';
		this.operand = expr;
		this.operator = operator;
	}
}

export class UnaryExpression {
	constructor(expr, operator) {
		this.type = 'UnaryExpression';
		this.operand = expr;
		this.operator = operator;
	}
}

export class BinaryExpression {
	constructor(operator, left, right) {
		this.type = 'BinaryExpression';
		this.operator = operator;
		this.left = left;
		this.right = right;
	}
}

export class ConditionalExpression {
	constructor(test, trueExpr, falseExpr) {
		this.type = 'ConditionalExpression';
		this.test = test;
		this.true = trueExpr;
		this.false = falseExpr;
	}
}