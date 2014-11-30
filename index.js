var NorlitJSCompiler = require("./compiler.js");

var str;
if (process.argv[2]) {
	str = process.argv[2];
} else {
	str = "/dev/stdin";
}

var fs = require('fs');
var c = fs.readFileSync(str).toString();

var minifier = require("./module/minify");

require("./scope/scope");

try {
	var context = new NorlitJSCompiler.Context(false);
	var ast = NorlitJSCompiler.Parser(c, context);
	NorlitJSCompiler.ScopeAnalysis(ast);
	ast = NorlitJSCompiler.ASTPass.applyAll(ast);
	ast = NorlitJSCompiler.ASTPass.apply(ast, minifier.MinifyPass);
	console.log(minifier.minify(ast).str);
	//console.log(JSON.stringify(ast));
} catch (e) {
	console.log(e.stack);
	console.log(e);
}