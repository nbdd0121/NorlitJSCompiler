import {
	Statement,
	StatementList
}
from './Statement';

export class Script {
	constructor(body) {
		this.type = 'Script';
		this.body = body;
	}

	lexicallyDeclaredNames() {
		return StatementList.topLevelLexicallyDeclaredNames(this.body);
	}

	varDeclaredNames() {
		return StatementList.topLevelVarDeclaredNames(this.body);
	}

	varScopedDeclarations() {
		return StatementList.topLevelVarScopedDeclarations(this.body);
	}
}

export class Module {
	constructor(body) {
		this.type = 'Module';
		this.body = body;
	}

	isStrict() {
		return true;
	}
}

export class ImportDeclaration {
	constructor(source, def = null, namespace = null) {
		this.type = 'ImportDeclaration';
		this.source = source;
		this.default = def;
		this.namespace = namespace;
	}
}

export class ExportFrom {
	constructor(source, list = null) {
		this.type = 'ExportFrom';
		this.source = source;
		this.list = list;
	}
}

export class ExportDeclaration {
	constructor(declaration) {
		this.type = 'ExportDeclaration';
		this.declaration = declaration;
	}
}

export class ExportDefault {
	constructor(declaration) {
		this.type = 'ExportDefault';
		this.declaration = declaration;
	}
}