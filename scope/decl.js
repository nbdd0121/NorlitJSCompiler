var NorlitJSCompiler = require("../compiler");

var Scope = {

};

function Symbol(name, scope) {
	this.name = name;
	this.scope = scope;
}

Symbol.prototype.type = "Symbol";
Scope.Symbol = Symbol;

function DeclScope(outer) {
	this.optimize = true;
	this.outer = outer;
	this.var = [];
}
Scope.DeclScope = DeclScope;

function WithScope(outer) {
	this.optimize = false;
	this.outer = outer;
	outer.disableOptimize();
}
Scope.WithScope = WithScope;

function CatchScope(outer, param) {
	this.optimize = true;
	this.outer = outer;
	this.symbol = new Symbol(param);
}
Scope.CatchScope = CatchScope;

function GlobalScope() {
	this.optimize = false;
	this.outer = null;
	this.var = [];
}
Scope.GlobalScope = GlobalScope;

DeclScope.prototype.declare = GlobalScope.prototype.declare = function(name) {
	for (var i = 0; i < this.var.length; i++) {
		if (this.var[i].name == name) {
			return this.var[i];
		}
	}
	var symbol = new Symbol(name);
	this.var.push(symbol);
	return symbol;
};

WithScope.prototype.declare = function(name) {
	return this.outer.declare(name);
}

CatchScope.prototype.declare = function(name) {
	return this.outer.declare(name);
}

DeclScope.prototype.resolve = function(name) {
	for (var i = 0; i < this.var.length; i++) {
		if (this.var[i].name == name) {
			return this.var[i];
		}
	}
	return this.outer.resolve(name);
}

WithScope.prototype.resolve = function(name) {
	return null;
}

CatchScope.prototype.resolve = function(name) {
	if (this.symbol.name == name) {
		return this.symbol;
	}
	return this.outer.resolve(name);
}

GlobalScope.prototype.resolve = function(name) {
	return undefined;
}

DeclScope.prototype.isDeclared = function(name) {
	for (var i = 0; i < this.var.length; i++) {
		if (this.var[i].name == name) {
			return true;
		}
	}
	return this.outer.isDeclared(name);
}

WithScope.prototype.isDeclared = function(name) {
	return this.outer.isDeclared(name);
}

CatchScope.prototype.isDeclared = function(name) {
	if (this.symbol.name == name) {
		return true;
	}
	return this.outer.isDeclared(name);
}

GlobalScope.prototype.isDeclared = function(name) {
	for (var i = 0; i < this.var.length; i++) {
		if (this.var[i].name == name) {
			return true;
		}
	}
	return false;
}

DeclScope.prototype.disableOptimize =
	WithScope.prototype.disableOptimize =
	CatchScope.prototype.disableOptimize =
	GlobalScope.prototype.disableOptimize = function() {
		if (this.optimize) {
			this.optimize = false;
			if (this.outer)
				this.outer.disableOptimize();
		}
	}

NorlitJSCompiler.Scope = Scope;