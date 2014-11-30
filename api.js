global.NorlitJSCompiler = require("./compiler.js");
var minify = require("./module/minify");
require("./scope/scope");
global.NorlitJSCompiler.minify = minify.minify;
global.NorlitJSCompiler.MinifyPass = minify.MinifyPass;