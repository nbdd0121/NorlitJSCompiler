import NodeVisitor from './NodeVisitor';

import {
	ObjectPattern,
	ArrayPattern,

	SpreadExpression,
	BinaryExpression
}
from './tree/Expression';

class TreeValidator extends NodeVisitor {
	constructor(ctx) {
		this.context = ctx;
	}

	visitPostfixExpression(expr) {
		super.visitPostfixExpression(expr);
		if (!expr.operand.isValidSimpleAssignmentTarget()) {
			throw new ReferenceError('Invalid left-hand side expression in postfix operation');
		}
	}

	visitUnaryExpression(expr) {
		super.visitUnaryExpression(expr);
		switch (expr.operator) {
			case '++':
			case '--':
				if (!expr.operand.isValidSimpleAssignmentTarget()) {
					throw new ReferenceError('Invalid left-hand side expression in unary operation');
				}
				break;
			case 'delete':
				// delete IdentifierReference creates Error in strict mode
				break;
		}
	}

	visitBinaryExpression(expr) {
		super.visitBinaryExpression(expr);
		switch (expr.operator) {
			case '*=':
			case '/=':
			case '%=':
			case '+=':
			case '-=':
			case '<<=':
			case '>>=':
			case '>>>=':
			case '&=':
			case '^=':
			case '|=':
				if (!expr.left.isValidSimpleAssignmentTarget()) {
					throw new ReferenceError('Invalid left-hand side expression in assignment operation');
				}
				break;
			case '=':
				if (!(expr.left instanceof ObjectPattern) &&
					!(expr.left instanceof ArrayPattern) &&
					!expr.left.isValidSimpleAssignmentTarget()) {
					throw new ReferenceError('Invalid left-hand side expression in assignment operation');
				}
				break;
		}
	}

	visitCoverFormals(cover) {
		if (cover.body.length === 0) {
			throw new SyntaxError('Unexpected cover formals as parenthesis expression');
		}
		let expr = null;
		for (let i = 0; i < cover.body.length; i++) {
			const element = cover.body[i];
			if (element instanceof SpreadExpression) {
				throw new SyntaxError('Unexpected spread expression in cover formals');
			}
			if (expr) {
				const comma = new BinaryExpression(',', expr, element);
				comma.range = [expr.range[0], element.range[1]];
				expr = comma;
			} else {
				expr = cover.body[i];
			}
		}
		this.visitNode(expr);
		return expr;
	}
}

export default TreeValidator;