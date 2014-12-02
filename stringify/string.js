var NorlitJSCompiler = require("../compiler");

module.exports = function(str, requiredQuote) {
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
    if (requiredQuote == '"') {
        return double;
    } else if (requiredQuote == "'") {
        return single;
    } else {
        return single.length > double.length ? double : single;
    }
}