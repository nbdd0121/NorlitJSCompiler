global.NorlitJSCompiler = require("./compiler.js");
var minify = require("./module/minify");
global.NorlitJSCompiler.minify = minify.minify;
global.NorlitJSCompiler.MinifyPass = minify.MinifyPass;