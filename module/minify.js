var NorlitJSCompiler = require("../compiler");

var minifyNumber = function() {
    function pickAlternative(array) {
        var minLength = Number.MAX_VALUE;
        var minA = null;
        for (var i = 0; i < array.length; i++) {
            var a = array[i];
            var heuristicLength = a.str.length + precedent.indexOf(a.p) / precedent.length * 2;
            if (heuristicLength < minLength) {
                minLength = heuristicLength;
                minA = a;
            }
        }
        return minA;
    }

    function fraction(x) {
        var abs = Math.abs(x);
        var sign = x / abs;

        function recursiveToFraction(number, stackDepth) {
            var integerPart = Math.floor(number);
            var decimalPart = number - integerPart;
            if (decimalPart < 0.0001 || stackDepth > 20) return [integerPart, 1];
            var num = recursiveToFraction(1 / decimalPart, stackDepth + 1);
            return [integerPart * num[0] + num[1], num[0]]
        }
        var fraction = recursiveToFraction(abs, 0);
        if (sign * fraction[0] / fraction[1] != x) {
            return null;
        }
        return {
            str: (sign == -1 ? '-' : '') + fraction[0] + "/" + fraction[1],
            p: '*'
        };
    }

    return function(num) {
        var p = num < 0 ? "UnaryExpression" : "PrimaryExpression";
        var alternatives = [];
        alternatives.push({
            str: function() {
                var str = num.toString().replace("e+", "e");
                if (str[0] == '0' && str[1] == '.') {
                    str = str.substr(1);
                }
                return str;
            }(),
            p: p
        });
        if (parseInt(num) == num) {
            alternatives.push({
                str: "0x" + num.toString(16).toUpperCase(),
                p: p
            });
        }
        alternatives.push({
            str: num.toExponential().replace("e+", "e"),
            p: p
        });
        var f = fraction(num);
        if (f) {
            alternatives.push(f);
        }
        return pickAlternative(alternatives);
    }
}();

function minifyString(str) {
    var single = "'";
    var double = '"';
    for (var i = 0; i < str.length; i++) {
        switch (str[i]) {
            case '\0':
                single += '\\0';
                double += '\\0';
                break;
            case '"':
                single += '"';
                double += '\\"';
                break;
            case "'":
                single += "\\'";
                double += "'";
                break;
            case '\\':
                single += '\\\\';
                double += '\\\\';
                break;
            case '\b':
                single += '\\b';
                double += '\\b';
                break;
            case '\f':
                single += '\\f';
                double += '\\f';
                break;
            case '\n':
                single += '\\n';
                double += '\\n';
                break;
            case '\r':
                single += '\\r';
                double += '\\r';
                break;
            case '\t':
                single += '\\t';
                double += '\\t';
                break;
            case '\v':
                single += '\\v';
                double += '\\v';
                break;
            default:
                switch (NorlitJSCompiler.CharType(str[i])) {
                    case 'LOWERCASE_LETTER':
                    case 'UPPERCASE_LETTER':
                    case 'OTHER_LETTER':
                    case 'DECIMAL_DIGIT_NUMBER':
                    case 'CONNECTOR_PUNCTUATION':
                    case 'MATH_SYMBOL':
                    case 'DASH_PUNCTUATION':
                    case 'OTHER_PUNCTUATION':
                    case 'END_PUNCTUATION':
                    case 'START_PUNCTUATION':
                    case 'MODIFIER_SYMBOL':
                    case 'SPACE_SEPARATOR':
                    case 'CURRENCY_SYMBOL':
                        single += str[i];
                        double += str[i];
                        break;
                    case 'CONTROL':
                    case 'FORMAT':
                    case 'LINE_SEPARATOR':
                    case 'PARAGRAPH_SEPARATOR':
                    case 'UNASSIGNED':
                    default:
                        {
                            var code = str[i].charCodeAt(0);
                            if (code < 0xFF) {
                                var escape = '\\x' + (0x100 + code).toString(16).substr(1).toUpperCase();
                            } else {
                                var escape = '\\u' + (0x10000 + code).toString(16).substr(1).toUpperCase();
                            }
                            single += escape;
                            double += escape;
                            break;
                        }
                }
        }
    }
    single += "'";
    double += '"';
    return {
        str: single.length > double.length ? double : single,
        p: 'PrimaryExpression'
    };
}

function isIdentifierName(str) {
    if (!str.length)
        return false;
    if (!NorlitJSCompiler.Lex.isIdentifierStart(str))
        return false;
    for (var i = 1; i < str.length; i++)
        if (!NorlitJSCompiler.Lex.isIdentifierPart(str))
            return false;
    return true;
}

var precedent = [
    'PrimaryExpression',
    '.',
    'LeftHandSideExpression',
    'PostfixExpression',
    'UnaryExpression',
    '*',
    '+',
    '<<',
    '<',
    '==',
    '&',
    '^',
    '|',
    '&&',
    '||',
    'ConditionalExpression',
    'AssignmentExpression',
    'Expression'
];

function wrap(obj, p, ns) {
    var oi = precedent.indexOf(obj.p);
    var pi = precedent.indexOf(p);
    if (oi == -1 || pi == -1) {
        console.log(obj);
        throw new Error('Unexpected precedence of ' + obj.p + ' or ' + p);
    }
    if (pi < oi || (ns && pi == oi)) {
        return {
            str: '(' + obj.str + ')',
            p: 'PrimaryExpression'
        };
    }
    return obj;
}

function eliminateSemicolon(inBlock) {
    if (inBlock[inBlock.length - 1] == ';') {
        return inBlock.substr(0, inBlock.length - 1);
    }
    return inBlock;
}

function generateStmtArray(array) {
    return array.map(minifyToString).join("");
}

function minifyToString(ast) {
    return minify(ast).str;
}

function minify(ast) {
    switch (ast.type) {
        case 'Constant':
            {
                switch (typeof(ast.value)) {
                    case 'number':
                        return minifyNumber(ast.value);
                    case 'object':
                        return {
                            str: "null",
                            p: 'PrimaryExpression'
                        }
                    case 'string':
                        return minifyString(ast.value);
                    case 'boolean':
                        return {
                            str: '!' + Number(!ast.value),
                            p: "UnaryExpression"
                        }
                    case 'undefined':
                        return {
                            str: 'void 0',
                            p: 'UnaryExpression'
                        };
                    default:
                        return {
                            str: ast.value + "",
                            p: 'PrimaryExpression'
                        };
                }
            }
        case 'Identifier':
            {
                return {
                    str: ast.name,
                    p: 'PrimaryExpression'
                };
            }
        case 'Symbol':
            {
                return {
                    str: ast.name,
                    p: 'PrimaryExpression'
                };
            }
        case 'ThisExpression':
            {
                return {
                    str: "this",
                    p: 'PrimaryExpression'
                };
            }
        case 'RegexpLiteral':
            {
                return {
                    str: "/" + ast.regexp + "/" + ast.flags,
                    p: 'PrimaryExpression'
                };
            }
        case 'ObjectInitializer':
            {
                return {
                    str: "{" + ast.elements.map(minifyToString).join(",") + "}",
                    p: 'PrimaryExpression'
                };
            }
        case 'Property':
            {
                var name = (isIdentifierName(ast.key) || +ast.key + "" == ast.key) ? ast.key : minifyString(ast.key).str;
                return {
                    str: name + ":" + wrap(minify(ast.value), 'AssignmentExpression').str
                };
            }
        case 'Getter':
            {
                var str = "get " + ast.key + "(){"
                str += eliminateSemicolon(generateStmtArray(ast.body));
                str += "}";
                return {
                    str: str,
                };
            }
        case 'Setter':
            {
                var str = "set " + ast.key + "(" + ast.parameter + "){"
                str += eliminateSemicolon(generateStmtArray(ast.body));
                str += "}";
                return {
                    str: str,
                };
            }
        case 'ArrayInitializer':
            {
                var str = "[";
                for (var i = 0; i < ast.elements.length; i++) {
                    if (i != 0) {
                        str += ",";
                    }
                    if (ast.elements[i] !== undefined) {
                        str += wrap(minify(ast.elements[i]), 'AssignmentExpression').str;
                    } else if (i == ast.elements.length - 1) {
                        str += ",";
                    }
                }
                return {
                    str: str + "]",
                    p: 'PrimaryExpression'
                };
            }
        case 'MemberExpression':
            {
                var base = wrap(minify(ast.base), 'LeftHandSideExpression');
                if (ast.property.type == 'Constant' && typeof(ast.property.value) == 'string' && isIdentifierName(ast.property.value)) {
                    if (typeof(ast.base) == 'number' && base.p == 'PrimaryExpression' &&
                        base.str.indexOf('.') == -1 && base.str.indexOf('E') == -1) {
                        base.str += " ";
                    }
                    return {
                        str: base.str + '.' + ast.property.value,
                        p: '.'
                    }
                } else {
                    return {
                        str: base.str + '[' + minify(ast.property, 'Expression').str + ']',
                        p: '.'
                    }
                }
            }
        case 'NewExpression':
            {
                var str = 'new ' + wrap(minify(ast.constructor), '.').str;
                str += "(" + ast.arguments.map(function(a) {
                    return wrap(minify(a), 'AssignmentExpression').str;
                }).join(",") + ")";
                return {
                    str: str,
                    p: "LeftHandSideExpression"
                };
            }
        case 'CallExpression':
            {
                var str = wrap(minify(ast.callee), 'LeftHandSideExpression').str + '(';
                for (var i = 0; i < ast.arguments.length; i++) {
                    if (i != 0) {
                        str += ",";
                    }
                    str += wrap(minify(ast.arguments[i]), 'AssignmentExpression').str;
                }
                return {
                    str: str + ")",
                    p: "LeftHandSideExpression"
                };
            }
        case 'PostfixExpression':
            {
                return {
                    str: wrap(minify(ast.operand), 'LeftHandSideExpression').str + ast.operator,
                    p: 'PostfixExpression'
                };
            }
        case 'UnaryExpression':
            {
                switch (ast.operator) {
                    case 'delete':
                    case 'void':
                    case 'typeof':
                        return {
                            str: ast.operator + " " + wrap(minify(ast.operand), 'UnaryExpression').str,
                            p: 'UnaryExpression'
                        };
                    case '+':
                    case '-':
                        var operand = wrap(minify(ast.operand), 'UnaryExpression').str;
                        if (operand[0] == ast.operator)
                            operand = ' ' + operand;
                        return {
                            str: ast.operator + operand,
                            p: 'UnaryExpression'
                        };
                    default:
                        return {
                            str: ast.operator + wrap(minify(ast.operand), 'UnaryExpression').str,
                            p: 'UnaryExpression'
                        };
                }
            }
        case 'BinaryExpression':
            {
                var type;
                switch (ast.operator) {
                    case '+':
                    case '-':
                        {
                            var right = wrap(minify(ast.right), '+', true).str;
                            if (right[0] == ast.operator)
                                right = ' ' + right;
                            return {
                                str: wrap(minify(ast.left), '+').str + ast.operator + right,
                                p: '+'
                            };
                        }
                    case '*':
                    case '/':
                    case '%':
                        type = '*';
                        break;
                    case '<<':
                    case '>>':
                    case '>>>':
                        type = '<<';
                        break;
                    case '<':
                    case '>':
                    case '<=':
                    case '>=':
                        type = '<';
                        break;
                    case 'instanceof':
                    case 'in':
                        return {
                            str: wrap(minify(ast.left), '<').str + " " + ast.operator + " " + wrap(minify(ast.right), '<', true).str,
                            p: '<'
                        };
                    case '==':
                    case '!=':
                    case '===':
                    case '!==':
                        type = '==';
                        break;
                    case '&':
                    case '^':
                    case '|':
                    case '&&':
                    case '||':
                        type = ast.operator;
                        break;
                    case ',':
                        type = 'Expression';
                        break;
                    default:
                        throw 'BinaryExpression ' + ast.operator;
                }
                return {
                    str: wrap(minify(ast.left), type).str + ast.operator + wrap(minify(ast.right), type, true).str,
                    p: type
                };
            }
        case 'ConditionalExpression':
            {
                return {
                    str: wrap(minify(ast.test), '||').str + "?" +
                        wrap(minify(ast.true), 'AssignmentExpression').str + ":" +
                        wrap(minify(ast.false), 'AssignmentExpression').str,
                    p: 'ConditionalExpression'
                };
            }
        case 'AssignmentExpression':
            {
                return {
                    str: wrap(minify(ast.left), 'AssignmentExpression', true).str + ast.operator + wrap(minify(ast.right), 'AssignmentExpression').str,
                    p: 'AssignmentExpression'
                };
            }
        case 'DebuggerStatement':
            {
                return {
                    str: "debugger;"
                };
            }
        case 'EmptyStatement':
            {
                return {
                    str: ";"
                };
            }
        case 'BlockStatement':
            {
                return {
                    str: "{" + eliminateSemicolon(generateStmtArray(ast.body)) + "}"
                };
            }
        case 'IfStatement':
            {
                var str = "if(" + minify(ast.test).str + ")" + minify(ast.true).str;
                if (ast.false !== undefined) {
                    str += "else " + minify(ast.false).str;
                }
                return {
                    str: str
                };
            }
        case 'WithStatement':
            {
                return {
                    str: "with(" + minify(ast.base).str + ")" + minify(ast.body).str
                };
            }
        case 'WhileStatement':
            {
                return {
                    str: "while(" + minify(ast.test).str + ")" + minify(ast.body).str
                };
            }
        case 'DoStatement':
            {
                return {
                    str: "do " + minify(ast.body).str + "while(" + minify(ast.test).str + ");"
                };
            }
        case 'ForStatement':
            {
                var str = "for(";
                if (ast.init !== undefined) {
                    if (ast.init && ast.init.type == 'VariableDeclaration')
                        str += minify(ast.init).str;
                    else
                        str += minify(ast.init).str + ";";
                } else {
                    str += ";";
                }
                if (ast.test !== undefined) str += minify(ast.test).str;
                str += ";";
                if (ast.inc !== undefined) str += minify(ast.inc).str;
                str += ")" + minify(ast.body).str;
                return {
                    str: str
                };
            }
        case 'ForInStatement':
            {
                var str = "for(";
                if (ast.var && ast.var.type == 'VariableDeclarator')
                    str += "var " + minify(ast.var).str;
                else
                    str += minify(ast.var).str;
                return {
                    str: str + " in " + minify(ast.container).str + ")" + minify(ast.body).str
                };
            }
        case 'TryStatement':
            {
                var str = "try " + minify(ast.body).str;
                if (ast.catch !== undefined) {
                    var param = ast.parameter;
                    if (param instanceof Object) {
                        param = param.name;
                    }
                    str += "catch(" + param + ")" + minify(ast.catch).str;
                }
                if (ast.finally !== undefined) {
                    str += "finally" + minify(ast.finally).str;
                }
                return {
                    str: str
                };
            }
        case 'SwitchStatement':
            {
                return {
                    str: "switch(" + minify(ast.expression).str + "){" +
                        eliminateSemicolon(generateStmtArray(ast.body)) + "}"
                };
            }
        case 'CaseClause':
            {
                if (ast.key === undefined) {
                    return {
                        str: "default:" + ast.body.map(minifyToString).join("")
                    };
                } else {
                    return {
                        str: "case " + minify(ast.key).str + ":" + ast.body.map(minifyToString).join("")
                    };
                }
            }
        case 'ReturnStatement':
            {
                if (ast.expression === undefined) {
                    return {
                        str: "return;"
                    };
                } else {
                    return {
                        str: "return " + minify(ast.expression).str + ";",
                    };
                }
            }
        case 'ThrowStatement':
            {
                return {
                    str: "throw " + minify(ast.expression).str + ";",
                };
            }
        case 'BreakStatement':
            {
                if (ast.label === undefined) {
                    return {
                        str: "break;"
                    };
                } else {
                    return {
                        str: "break " + ast.label + ";",
                    };
                }
            }
        case 'ContinueStatement':
            {
                if (ast.label === undefined) {
                    return {
                        str: "continue;"
                    };
                } else {
                    return {
                        str: "continue " + ast.label + ";",
                    };
                }
            }
        case 'LabeledStatement':
            {
                return {
                    str: ast.label + ":" + minify(ast.body).str
                };
            }
        case 'FunctionExpression':
        case 'FunctionDeclaration':
            {
                var str = "function";
                if (ast.name) {
                    str += " " + (ast.name instanceof Object ? ast.name.name : ast.name);
                }
                str += "(";
                str += ast.parameter.map(function(a) {
                    if (a instanceof Object) {
                        return a.name;
                    } else {
                        return a;
                    }
                }).join(",");
                str += "){";
                str += eliminateSemicolon(generateStmtArray(ast.body));
                str += "}";
                return {
                    str: str,
                    p: 'PrimaryExpression'
                };
            }
        case 'Program':
            {
                var str = "";
                for (var i = 0; i < ast.body.length; i++) {
                    str += minify(ast.body[i]).str;
                }
                return {
                    str: str
                };
            }
        case 'DirectiveStatement':
            {
                return {
                    str: ast.raw + ";"
                };
            }
        case 'ExpressionStatement':
            {
                var str = minify(ast.expression).str;
                if (typeof(ast.expression) == "string" || str.indexOf("function ") == 0 || str.indexOf("function(") == 0) {
                    return {
                        str: "(" + str + ");"
                    };
                } else {
                    return {
                        str: str.indexOf("function") == 0 ? "(" + str + ");" : str + ";"
                    };
                }
            }

        case 'VariableDeclaration':
            {
                var str = "var ";
                for (var i = 0; i < ast.declarations.length; i++) {
                    if (i != 0) {
                        str += ",";
                    }
                    str += minify(ast.declarations[i]).str;
                }
                return {
                    str: str + ";"
                };
            }
        case 'VariableDeclarator':
            {
                var name = ast.name;
                if (name instanceof Object) {
                    name = name.name;
                }
                if (ast.init !== undefined) {
                    return {
                        str: name + '=' + wrap(minify(ast.init), 'AssignmentExpression').str
                    };
                } else {
                    return {
                        str: name
                    };
                }
            }
        default:
            throw ast;
    }
}
var idStart = "_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
var idPart = "_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function variableName(id) {
    var text = idStart[id % idStart.length];
    id = Math.floor(id / idStart.length);
    for (; id; id = Math.floor(id / idPart.length)) {
        text += idPart[id % idPart.length];
    }
    return text;
}

function wrapWithExprStmt(ast) {
    var replaceWrap = new NorlitJSCompiler.Node('ExpressionStatement');
    replaceWrap.expression = ast;
    return replaceWrap;
}

function wrapWithBlock(ast) {
    var replaceWrap = new NorlitJSCompiler.Node('BlockStatement');
    if (ast.type == 'EmptyStatement') {
        replaceWrap.body = [];
    } else {
        replaceWrap.body = [ast];
    }
    return replaceWrap;
}

exports.MinifyPass = {
    enter: function(node, parent) {
        switch (node.type) {
            case 'Program':
                {
                    node.scope.id = 0;
                    break;
                }
            case 'FunctionExpression':
            case 'FunctionDeclaration':
                {
                    var scope = node.scope;
                    var id = scope.outer.id;
                    if (scope.optimize) {
                        for (var i = 0; i < scope.var.length; i++) {
                            var symbol = scope.var[i];
                            var varName;
                            while (scope.outer.isDeclared(varName = variableName(id++)));
                            symbol.name = varName;
                        }
                    }
                    scope.id = id;
                    break;
                }
            case 'WithStatement':
                {
                    node.scope.id = node.scope.outer.id;
                }
            case 'TryStatement':
                {
                    if (node.scope !== undefined) {
                        var scope = node.scope;
                        var id = scope.outer.id;
                        if (scope.optimize) {
                            var symbol = scope.symbol;
                            var varName;
                            while (scope.outer.isDeclared(varName = variableName(id++)));
                            symbol.name = varName;
                            id++;
                        }
                        scope.id = id;
                    }
                    break;
                }
        }
    },
    leave: function(node, parent) {
        switch (node.type) {
            case 'ExpressionStatement':
                {
                    if (!(node.expression instanceof Object)) {
                        return new NorlitJSCompiler.Node('EmptyStatement');
                    }
                    break;
                }
            case 'IfStatement':
                {
                    if (node.false === undefined) {
                        if (node.true.type == 'ExpressionStatement') {
                            var replace = new NorlitJSCompiler.Node('BinaryExpression');
                            replace.operator = '&&';
                            replace.left = node.test;
                            replace.right = node.true.expression;
                            return wrapWithExprStmt(replace);
                        }
                    } else {
                        if (node.true.type == 'ExpressionStatement' && node.false.type == 'ExpressionStatement') {
                            var replace = new NorlitJSCompiler.Node('ConditionalExpression');
                            replace.test = node.test;
                            replace.true = node.true.expression;
                            replace.false = node.false.expression;
                            return wrapWithExprStmt(replace);
                        }
                    }
                    break;
                }
            case 'BlockStatement':
                {
                    for (var i = 0; i < node.body.length; i++) {
                        if (node.body[i].type == 'EmptyStatement') {
                            node.body.splice(i, 1);
                            i--;
                        }
                    }
                    if (node.body.length == 1) {
                        return node.body[0];
                    } else if (node.body.length == 0) {
                        return new NorlitJSCompiler.Node('EmptyStatement');
                    }
                    break;
                }
            case 'TryStatement':
                {
                    if (node.body !== undefined && node.body.type != 'BlockStatement') {
                        node.body = wrapWithBlock(node.body);
                    }
                    if (node.catch !== undefined && node.catch.type != 'BlockStatement') {
                        node.catch = wrapWithBlock(node.catch);
                    }
                    if (node.finally !== undefined && node.finally.type != 'BlockStatement') {
                        node.finally = wrapWithBlock(node.finally);
                    }
                    break;
                }
            case 'Program':
                {
                    for (var i = 0; i < node.body.length; i++) {
                        if (node.body[i].type == 'EmptyStatement') {
                            node.body.splice(i, 1);
                            i--;
                        }
                    }
                    break;
                }
        }

    },
    noLiteralVisit: true
};
exports.minify = minify;