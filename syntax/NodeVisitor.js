class NodeVisitor {

	_visitArray(arr) {
		let ret;
		for (let i = 0; i < arr.length; i++) {
			ret = this.visitNode(arr[i]);
			if (ret) {
				arr[i] = ret;
			}
		}
	}

	visitConstantLiteral() {}

	visitThisExpression() {}

	visitIdentifier() {}

	visitRegularExpression() {}

	visitNoSubstitutionTemplate(template) {}

	visitObjectPattern(expr) {
		throw new Error('TODO');
	}
	visitArrayPattern(expr) {
		throw new Error('TODO');
	}

	visitDefaultParameter(def) {
		let ret;
		ret = this.visitNode(def.pattern);
		if (ret) {
			def.pattern = ret;
		}
		ret = this.visitNode(def.default);
		if (ret) {
			def.default = ret;
		}
	}

	visitArrayLiteral(lit) {
		this._visitArray(lit.elements);
	}

	visitObjectLiteral(lit) {
		this._visitArray(lit.elements);
	}

	visitPropertyDefinition(def) {
		def.key = this.visitNode(def.key) || def.key;
		def.value = this.visitNode(def.value) || def.value;
	}

	visitTemplateLiteral(expr) {
		this._visitArray(expr.substitution);
	}

	visitCoverFormals(cover) {
		throw new Error('CoverFormals should not appear in the AST');
	}

	visitCoverInitializedName(cover) {
		throw new Error('CoverInitializedName should not appear in the AST');
	}

	visitSuperNewExpression(expr) {
		this._visitArray(expr.arguments);
	}

	visitSuperCallExpression(expr) {
		this._visitArray(expr.arguments);
	}

	visitSuperPropertyExpression(expr) {
		throw new Error('TODO');
	}

	visitNewExpression(expr) {
		expr.constructor = this.visitNode(expr.constructor) || expr.constructor;
		this._visitArray(expr.arguments);
	}

	visitCallExpression(expr) {
		expr.callee = this.visitNode(expr.callee) || expr.callee;
		this._visitArray(expr.arguments);
	}

	visitMemberExpression(expr) {
		let ret;
		ret = this.visitNode(expr.base);
		if (ret) {
			expr.base = ret;
		}
		ret = this.visitNode(expr.property);
		if (ret) {
			expr.property = ret;
		}
	}

	visitTaggedTemplateExpression(expr) {
		expr.tag = this.visitNode(expr.tag) || expr.tag;
		expr.template = this.visitNode(expr.template) || expr.template;
	}
	visitSpreadExpression(expr) {
		expr.operand = this.visitNode(expr.operand) || expr.operand;
	}

	visitPostfixExpression(expr) {
		let ret;
		ret = this.visitNode(expr.operand);
		if (ret) {
			expr.operand = ret;
		}
	}

	visitUnaryExpression(expr) {
		let ret;
		ret = this.visitNode(expr.operand);
		if (ret) {
			expr.operand = ret;
		}
	}

	visitBinaryExpression(expr) {
		let ret;
		ret = this.visitNode(expr.left);
		if (ret) {
			expr.left = ret;
		}
		ret = this.visitNode(expr.right);
		if (ret) {
			expr.right = ret;
		}
	}


	visitConditionalExpression(expr) {
		expr.test = this.visitNode(expr.test) || expr.test;
		expr.true = this.visitNode(expr.true) || expr.true;
		expr.false = this.visitNode(expr.false) || expr.false;
	}


	visitBlockStatement(stmt) {
		this._visitArray(stmt.body);
	}

	visitVariableDeclaration(decl) {
		for (let i = 0; i < decl.declarations.length; i++) {
			const ret = this.visitVariableDeclarator(decl.declarations[i]);
			if (ret) {
				decl.declarations[i] = ret;
			}
		}
	}

	visitVariableDeclarator(decl) {
		let ret;
		ret = this.visitNode(decl.name);
		if (ret) {
			decl.name = ret;
		}
		ret = this.visitNode(decl.initializer);
		if (ret) {
			decl.initializer = ret;
		}
	}

	visitEmptyStatement(stmt) {}

	visitExpressionStatement(stmt) {
		const ret = this.visitNode(stmt.expression);
		if (ret) {
			stmt.expression = ret;
		}
	}

	visitIfStatement(stmt) {
		stmt.test = this.visitNode(stmt.test) || stmt.test;
		stmt.true = this.visitNode(stmt.true) || stmt.true;
		stmt.false = this.visitNode(stmt.false) || stmt.false;
	}

	visitDoStatement(stmt) {
		stmt.body = this.visitNode(stmt.body) || stmt.body;
		stmt.test = this.visitNode(stmt.test) || stmt.test;
	}

	visitWhileStatement(stmt) {
		stmt.test = this.visitNode(stmt.test) || stmt.test;
		stmt.body = this.visitNode(stmt.body) || stmt.body;
	}

	visitForStatement(stmt) {
		stmt.init = this.visitNode(stmt.init) || stmt.init;
		stmt.test = this.visitNode(stmt.test) || stmt.test;
		stmt.inc = this.visitNode(stmt.inc) || stmt.inc;
		stmt.body = this.visitNode(stmt.body) || stmt.body;
	}

	visitForInStatement(stmt) {
		stmt.init = this.visitNode(stmt.init) || stmt.init;
		stmt.collection = this.visitNode(stmt.collection) || stmt.collection;
		stmt.body = this.visitNode(stmt.body) || stmt.body;
	}

	visitForOfStatement(stmt) {
		stmt.init = this.visitNode(stmt.init) || stmt.init;
		stmt.collection = this.visitNode(stmt.collection) || stmt.collection;
		stmt.body = this.visitNode(stmt.body) || stmt.body;
	}

	visitCaseClause(stmt) {
		stmt.test = this.visitNode(stmt.test) || stmt.test;
		this._visitArray(stmt.body);
	}

	visitSwitchStatement(stmt) {
		stmt.expression = this.visitNode(stmt.expression) || stmt.expression;
		this._visitArray(stmt.body);
	}

	visitContinueStatement(stmt) {}

	visitBreakStatement(stmt) {}

	visitReturnStatement(stmt) {
		stmt.expression = this.visitNode(stmt.expression) || stmt.expression;
	}

	visitWithStatement(stmt) {
		stmt.base = this.visitNode(stmt.base) || stmt.base;
		stmt.body = this.visitNode(stmt.body) || stmt.body;
	}

	visitLabelledStatement(stmt) {
		stmt.body = this.visitNode(stmt.body) || stmt.body;
	}

	visitThrowStatement(stmt) {
		stmt.body = this.visitNode(stmt.body) || stmt.body;
		stmt.parameter = this.visitNode(stmt.parameter) || stmt.parameter;
		stmt.catch = this.visitNode(stmt.catch) || stmt.catch;
		stmt.finally = this.visitNode(stmt.finally) || stmt.finally;
	}

	visitTryStatement(stmt) {
		throw new Error('TODO');
	}

	visitDebuggerStatement(stmt) {}

	visitDirectiveStatement(stmt) {
		const ret = this.visitNode(stmt.directive);
		if (ret) {
			stmt.directive = ret;
		}
	}

	visitFunction(func) {
		let ret = this.visitNode(func.name);
		if (ret) {
			func.name = ret;
		}
		this._visitArray(func.parameters);
		this._visitArray(func.body);
	}

	visitFunctionExpression(func) {
		return this.visitFunction(func);
	}

	visitFunctionDeclaration(func) {
		return this.visitFunction(func);
	}

	visitArrowFunction(func) {
		this._visitArray(func.parameters);
		this._visitArray(func.body);
	}

	visitClass(clazz) {
		this.visitNode(clazz.name);
		this.visitNode(clazz.super);
		for (let i = 0; i < clazz.body.length; i++) {
			this.visitNode(clazz.body[i]);
		}
	}

	visitClassExpression(clazz) {
		return this.visitClass(clazz);
	}

	visitClassDeclaration(clazz) {
		return this.visitClass(clazz);
	}

	visitYieldExpression(expr) {
		expr.expression = this.visitNode(expr.expression) || expr.expression;
	}

	visitMethodDefinition(method) {
		method.name = this.visitNode(method.name) || method.name;
		this._visitArray(method.parameters);
		this._visitArray(method.body);
	}

	visitGetterDefinition(method) {
		method.name = this.visitNode(method.name) || method.name;
		this._visitArray(method.body);
	}

	visitSetterDefinition(method) {
		method.name = this.visitNode(method.name) || method.name;
		method.parameter = this.visitNode(method.parameter) || method.parameter;
		this._visitArray(method.body);
	}

	visitModule(module) {
		this._visitArray(module.body);
	}

	visitImportDeclaration() {}

	visitExportDeclaration(decl) {
		const ret = this.visitNode(decl.declaration);
		if (ret) {
			decl.declaration = ret;
		}
	}

	visitNode(node) {
		if (!node) {
			return;
		}
		switch (node.type) {
			case 'true':
			case 'false':
			case 'null':
			case 'String':
			case 'Number':
				return this.visitConstantLiteral(node);
			case 'this':
				return this.visitThisExpression(node);
			case 'Identifier':
				return this.visitIdentifier(node);
			case 'RegularExpression':
				return this.visitRegularExpression(node);
			case 'NoSubstitutionTemplate':
				return this.visitNoSubstitutionTemplate(node);
			case 'Expression':
				return this.visitExpression(node);
			case 'ObjectPattern':
				return this.visitObjectPattern(node);
			case 'ArrayPattern':
				return this.visitArrayPattern(node);
			case 'DefaultParameter':
				return this.visitDefaultParameter(node);
			case 'ArrayLiteral':
				return this.visitArrayLiteral(node);
			case 'ObjectLiteral':
				return this.visitObjectLiteral(node);
			case 'PropertyDefinition':
				return this.visitPropertyDefinition(node);
			case 'TemplateLiteral':
				return this.visitTemplateLiteral(node);
			case 'CoveredFormals':
				return this.visitCoverFormals(node);
			case 'CoverInitializedName':
				return this.visitCoverInitializedName(node);
			case 'SuperNewExpression':
				return this.visitSuperNewExpression(node);
			case 'SuperCallExpression':
				return this.visitSuperCallExpression(node);
			case 'SuperPropertyExpression':
				return this.visitSuperPropertyExpression(node);
			case 'NewExpression':
				return this.visitNewExpression(node);
			case 'CallExpression':
				return this.visitCallExpression(node);
			case 'MemberExpression':
				return this.visitMemberExpression(node);
			case 'TaggedTemplateExpression':
				return this.visitTaggedTemplateExpression(node);
			case 'SpreadExpression':
				return this.visitSpreadExpression(node);
			case 'PostfixExpression':
				return this.visitPostfixExpression(node);
			case 'UnaryExpression':
				return this.visitUnaryExpression(node);
			case 'BinaryExpression':
				return this.visitBinaryExpression(node);
			case 'ConditionalExpression':
				return this.visitConditionalExpression(node);

			case 'BlockStatement':
				return this.visitBlockStatement(node);
			case 'VariableDeclaration':
				return this.visitVariableDeclaration(node);
			case 'EmptyStatement':
				return this.visitEmptyStatement(node);
			case 'ExpressionStatement':
				return this.visitExpressionStatement(node);
			case 'IfStatement':
				return this.visitIfStatement(node);
			case 'DoStatement':
				return this.visitDoStatement(node);
			case 'WhileStatement':
				return this.visitWhileStatement(node);
			case 'ForStatement':
				return this.visitForStatement(node);
			case 'ForInStatement':
				return this.visitForInStatement(node);
			case 'ForOfStatement':
				return this.visitForOfStatement(node);
			case 'CaseClause':
				return this.visitCaseClause(node);
			case 'SwitchStatement':
				return this.visitSwitchStatement(node);
			case 'ContinueStatement':
				return this.visitContinueStatement(node);
			case 'BreakStatement':
				return this.visitBreakStatement(node);
			case 'ReturnStatement':
				return this.visitReturnStatement(node);
			case 'WithStatement':
				return this.visitWithStatement(node);
			case 'LabelledStatement':
				return this.visitLabelledStatement(node);
			case 'ThrowStatement':
				return this.visitThrowStatement(node);
			case 'TryStatement':
				return this.visitTryStatement(node);
			case 'DebuggerStatement':
				return this.visitDebuggerStatement(node);
			case 'DirectiveStatement':
				return this.visitDirectiveStatement(node);

			case 'FunctionExpression':
				return this.visitFunctionExpression(node);
			case 'FunctionDeclaration':
				return this.visitFunctionDeclaration(node);
			case 'ArrowFunction':
				return this.visitArrowFunction(node);
			case 'ClassExpression':
				return this.visitClassExpression(node);
			case 'ClassDeclaration':
				return this.visitClassDeclaration(node);
			case 'YieldExpression':
				return this.visitYieldExpression(node);
			case 'MethodDefinition':
				return this.visitMethodDefinition(node);
			case 'GetterDefinition':
				return this.visitGetterDefinition(node);
			case 'SetterDefinition':
				return this.visitSetterDefinition(node);
			case 'Module':
				return this.visitModule(node);
			case 'ImportDeclaration':
				return this.visitImportDeclaration(node);
			case 'ExportDeclaration':
				return this.visitExportDeclaration(node);
			default:
				//debugger;
				console.log(node);
				console.log(`Unsupported ${node.type}`);
				throw 'Abort';
		}
	}
}

export default NodeVisitor;