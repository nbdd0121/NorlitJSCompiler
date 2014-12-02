var NorlitJSCompiler = require("../compiler");

var Node = NorlitJSCompiler.Node;
var ASTBuilder = NorlitJSCompiler.ASTBuilder;

function gatherDeclarations(body, scope, exclusive) {
    var firstIndex;
    for (var firstIndex = 0; firstIndex < body.length; firstIndex++) {
        if (body[firstIndex].type != 'DirectiveStatement')
            break;
    }
    for (var i = firstIndex; i < body.length; i++) {
        if (body[i].type == 'FunctionDeclaration') {
            var func = body[i];
            body.splice(i, 1);
            body.splice(firstIndex++, 0, func);
            exclusive.push(func.name);
        }
    }
    var declarations = [];
    for (var i = 0; i < scope.var.length; i++) {
        var name = scope.var[i];
        if (exclusive.indexOf(name) != -1) {
            continue;
        }
        var declarator = new Node('VariableDeclarator');
        declarator.name = name;
        declarator.init = undefined;
        declarations.push(declarator);
    }
    if (declarations.length) {
        var declaration = new Node('VariableDeclaration');
        declaration.declarations = declarations;
        body.splice(firstIndex, 0, declaration);
    }
}

NorlitJSCompiler.Pass.MoveVar = function(ast) {
    NorlitJSCompiler.Visitor.traverse(ast, {
        leave: function(ast, parent) {
            switch (ast.type) {
                case 'Program':
                    {
                        gatherDeclarations(ast.body, ast.scope, []);
                        break;
                    }
                case 'FunctionExpression':
                    {
                        gatherDeclarations(ast.body, ast.scope, ast.parameter.concat(ast.name));
                        break;
                    }
                case 'FunctionDeclaration':
                    {
                        gatherDeclarations(ast.body, ast.scope, ast.parameter.slice());
                        break;
                    }
                case 'VariableDeclaration':
                    {
                        var exprs = [];
                        for (var i = 0; i < ast.declarations.length; i++) {
                            var declarator = ast.declarations[i];
                            if (declarator.init) {
                                var node = new Node('AssignmentExpression');
                                node.operator = '=';
                                var id = new Node('Identifier');
                                id.name = declarator.name;
                                node.left = id;
                                node.right = declarator.init;
                                exprs.push(node);
                            }
                        }
                        if (!exprs.length) {
                            return Node.EMPTY;
                        } else if (exprs.length == 1) {
                            return ASTBuilder.wrapExpression(exprs[0]);
                        } else {
                            var expr = exprs[0];
                            for (var i = 1; i < exprs.length; i++) {
                                var bin = new Node('BinaryExpression');
                                bin.operator = ',';
                                bin.left = expr;
                                bin.right = exprs[i];
                                expr = bin;
                            }
                            return ASTBuilder.wrapExpression(expr);
                        }
                    }
                case 'ForStatement':
                    {
                        if (ast.init && ast.init.type == 'ExpressionStatement') {
                            ast.init = ast.init.expression;
                        }
                        break;
                    }
                case 'ForInStatement':
                    {
                        if (ast.var.type == 'VariableDeclarator') {
                            var id = new Node('Identifier');
                            id.name = ast.var.name;
                            ast.var = id;
                        }
                        break;
                    }
            }
        }
    });
}