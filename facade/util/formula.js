/**
 * 逻辑符号类型
 */
const TokenType = {
    open: 0,            //左括号
    close: 1,           //右括号
    separator: 2,       //逗号
    operator: 3,        //运算符
    func: 4,            //
    arg: 5,
    placeholder: 6,
    literal: 7,
    parent: 8
};

/**
 * 运算符定义对象，例如 + - * /
 */
class OperatorDefinition {
    constructor(symbol, name, precedence, func, rhsOnly){
        this.symbol = symbol;
        this.name = name;
        this.precedence = precedence;
        this.func = func;
        this.rhsOnly = rhsOnly === undefined ? false : rhsOnly;
    }
}

/**
 * 逻辑函数定义对象，例如 not equ 等等
 */
class FunctionDefinition {
    constructor (name, func, requiredArguments){
        this.name = name;
        this.func = func;
        this.requiredArguments = requiredArguments;
    }
}

/**
 * 表达式符号基类
 */
class Token {
    constructor(expr, offset, type){
        this.expr = expr;
        this.offset = offset;
        this.type = type;
    }

    computeValue() {
        throw new ParsingError("token value can not be computed", this);
    };
}

/**
 * 左括号
 */
class OpenToken extends Token {
    constructor(expr, offset){
        super(expr, offset, TokenType.open);
    }
}

/**
 * 右括号
 */
class CloseToken extends Token {
    constructor(expr, offset){
        super(expr, offset, TokenType.close);
    }
}

/**
 * 分隔符，例如 ','
 */
class SeparatorToken extends Token {
    constructor(expr, offset){
        super(expr, offset, TokenType.separator);        
    }
}

/**
 * 运算符
 */
class OperatorToken extends Token {
    constructor(expr, offset){
        super(expr, offset, TokenType.operator);
    }   
}

/**
 * 函数
 */
class FunctionToken extends  Token  {
    constructor(expr, offset){
        super(expr, offset, TokenType.func);
    }
};

/**
 * 参数
 */
class ArgumentToken extends Token {
    constructor(expr, offset){
        super(expr, offset, TokenType.arg);
    }
    computeValue() {
        return expr;
    }
}

/**
 * 占位符（变量）
 */
class PlaceholderToken extends Token {
    constructor(expr, offset){
        super(expr, offset, TokenType.placeholder);
    }
    computeValue (placeholderValues) {
        if (!!placeholderValues) {
            var value = placeholderValues[this.expr];
            if (value != undefined) {
                return value;
            }
        }
        throw new ParsingError("variable " + this.expr + " can not be resolved", this);
    };
}

class LiteralToken extends Token {
    constructor(expr, offset){
        super(expr, offset, TokenType.literal);
    }
    computeValue () {
        return this.expr;
    }
}

class OperatorParent extends Token  {
    constructor(operatorToken, lhsToken, rhsToken){
        var expr = [];
        if (!operatorToken.expr.rhsOnly) {
            expr.push(lhsToken.expr);
        }
        expr.push(operatorToken.expr);
        expr.push(rhsToken.expr);

        super(expr.join(" "), operatorToken.expr.rhsOnly ? operatorToken.offset : lhsToken.offset, TokenType.parent);

        this.operatorToken = operatorToken;
        this.lhsToken = lhsToken;
        this.rhsToken = rhsToken;
    }
    computeValue(placeholderValues) {
        if (this.operatorToken.expr.rhsOnly) {
            return this.operatorToken.expr.func(this.rhsToken.computeValue(placeholderValues));
        } else {
            return this.operatorToken.expr.func(this.lhsToken.computeValue(placeholderValues), this.rhsToken.computeValue(placeholderValues));
        }
    };
}

class FunctionParent extends Token  {
    constructor(functionToken, argumentToken){
        super([functionToken.expr, argumentToken.expr].join(" "), functionToken.offset, TokenType.parent);
        this.functionToken = functionToken;
        this.argumentToken = argumentToken;
    }
    computeValue (placeholderValues) {
        var args = this.argumentToken.computeValue(placeholderValues);
        var computedArgs = [];
        if (!Array.isArray(args)) {
            computedArgs.push(args);
        } else {
            for (var i = 0; i < args.length; ++i) {
                computedArgs.push(args[i].computeValue(placeholderValues));
            }
        }
        if (this.functionToken.expr.requiredArguments === computedArgs.length) {
            return this.functionToken.expr.func.apply(null, computedArgs);
        } else {
            throw new ParsingError(this.functionToken.expr.name + ": invalid number of arguments given (" + this.functionToken.expr.requiredArguments + " required but " + computedArgs.length + " specified)", (Array.isArray(args) && args.length > 0) ? args[args.length - 1] : this.argumentToken);
        }
    };
}     

/**
 * 字符类型判断对象
 */
class Character {
    constructor (value){
        this.value = value;
    }

    isWhitespace() {
        return this.value === ' ' || this.value === '\t' || this.value === '\n';
    };
    isDigit() {
        return this.value >= '0' && this.value <= '9';
    };
    isDecimalPoint () {
        return this.value === '.';
    };
    isSeparator() {
        return this.value === ',';
    };
    isOpening() {
        return this.value === '(';
    };
    isClosing() {
        return this.value === ')';
    };
    isOperatorChar(operatorDefinitions) {
        for (var i1 = 0; i1 < operatorDefinitions.length; ++i1) {
            for (var i2 = 0; i2 < operatorDefinitions[i1].symbol.length; ++i2) {
                if (this.value === operatorDefinitions[i1].symbol.charAt(i2)) {
                    return true;
                }
            }
        }
        return false;
    };
    isSpecial(operatorDefinitions) {
        return this.isWhitespace() || this.isDecimalPoint() || this.isSeparator() || this.isOpening() || this.isClosing() || this.isOperatorChar(operatorDefinitions);
    };
};

/**
 * 解析错误信息对象
 */
class ParsingError {
    constructor(message, token){
        this.message = message;
        this.token = token;
    }
}

/**
 * 表达式计算器
 */
class FormulaEvaluator{
    constructor(extra){
        this.logicalOperatorDefinitions = [
            new OperatorDefinition("!", "negation", 1000, function(foo) {
                return !foo;
            }, true),
            new OperatorDefinition("&", "conunction", 900, function(foo, bar) {
                return foo && bar;
            }),
            new OperatorDefinition("|", "disjunction", 800, function(foo, bar) {
                return foo || bar;
            }),
            new OperatorDefinition("^", "exclusive disjunction", 800, function(foo, bar) {
                return (foo && !bar) || (!foo && bar);
            }),
            new OperatorDefinition("->", "consequence", 700, function(foo, bar) {
                return !(foo && !bar);
            }),
            new OperatorDefinition("=", "biconditional", 600, function(foo, bar) {
                return foo === bar;
            })
        ];

        this.arithmeticalOperatorDefinitions = [
            new OperatorDefinition("+", "sum", 1900, function(foo, bar) {
                return foo + bar;
            }),
            new OperatorDefinition("-", "difference", 1900, function(foo, bar) {
                return foo - bar;
            }),
            new OperatorDefinition("*", "product", 2000, function(foo, bar) {
                return foo * bar;
            }),
            new OperatorDefinition("/", "division", 2000, function(foo, bar) {
                return foo / bar;
            }),
            new OperatorDefinition("%", "modulo", 2000, function(foo, bar) {
                return foo % bar;
            }),
        ];

        this.logicalFunctionDefinitions = [
            new FunctionDefinition("not", function(foo) {
                return !foo;
            }, 1),
            new FunctionDefinition("and", function(foo, bar) {
                return foo && bar;
            }, 2),
            new FunctionDefinition("or", function(foo, bar) {
                return foo || bar;
            }, 2),
            new FunctionDefinition("xor", function(foo, bar) {
                return (foo && !bar) || (!foo && bar);
            }, 2),
            new FunctionDefinition("con", function(foo, bar) {
                return !(foo && !bar);
            }, 2),
            new FunctionDefinition("equ", function(foo, bar) {
                return foo === bar;
            }, 2)
        ];
        
        this.expr = undefined;
        this.tokens = undefined;
        this.compiledToken = undefined;
        this.placeholderValues = {};
        this.operatorDefinitions = [];
        this.functionDefinitions = [];

        this.operatorDefinitions = this.logicalOperatorDefinitions.concat(this.arithmeticalOperatorDefinitions);
        if(!!extra && extra.length > 0){
            // add additional operators or functions
            this.operatorDefinitions = this.operatorDefinitions.concat(extra.map(item=>{
                return new OperatorDefinition(item[0], item[1],item[2],item[3],item[4]);
            }));
        }
        this.functionDefinitions = this.logicalFunctionDefinitions;
    }

    compile (exp) {
        if (typeof exp === "string" && exp.length) {
            // set expression
            this.expr = exp;
            this.tokenizeExpression();
            this.compileTokens();
            return this;
        } else {
            throw new ParsingError("the expression is empty/invalid");
        }
    };

    evaluate (data) {
        this.placeholderValues = data;
        if (this.compiledToken) {
            return this.compiledToken.computeValue(this.placeholderValues);
        } else {
            throw new ParsingError("the expression has not been compiled yet");
        }
    };

    matchFunction(startIndex) {
        for (var i = 0; i < this.functionDefinitions.length; ++i) {
            if (this.expr.indexOf(this.functionDefinitions[i].name, startIndex) === startIndex) {
                return this.functionDefinitions[i];
            }
        }
        return false;
    };

    matchOperator (startIndex) {
        for (var i = 0; i < this.operatorDefinitions.length; ++i) {
            if (this.expr.indexOf(this.operatorDefinitions[i].symbol, startIndex) === startIndex) {
                return this.operatorDefinitions[i];
            }
        }
        return false;
    };

    tokenizeExpression () {
        this.tokens = [];
        for (var i = 0; i < this.expr.length;) {
            var char = new Character(this.expr.charAt(i));
            if (char.isWhitespace()) {
                var end = i + 1;
                for (; end < this.expr.length && (new Character(this.expr.charAt(end))).isWhitespace(); ++end);
                i = end; /* discard whitespaces */
            } else if (char.isDigit() || char.isDecimalPoint()) {
                var end = i + 1;
                var decimalPointFound = char.isDecimalPoint();
                for (; end < this.expr.length; ++end) {
                    var char = new Character(this.expr.charAt(end));
                    if (!(char.isDigit() || (char.isDecimalPoint() && !decimalPointFound))) {
                        break;
                    }
                    decimalPointFound = decimalPointFound || char.isDecimalPoint();
                }
                this.tokens.push(new LiteralToken(parseFloat(this.expr.substring(i, end)), i)); /* add literal token */
                i = end;
            } else if (char.isOpening()) {
                this.tokens.push(new OpenToken(char.value, i++));
            } else if (char.isClosing()) {
                this.tokens.push(new CloseToken(char.value, i++));
            } else if (char.isSeparator()) {
                this.tokens.push(new SeparatorToken(char.value, i++));
            } else if (char.isOperatorChar(this.operatorDefinitions)) {
                var operator = this.matchOperator(i);
                if (operator) { /* is operator */
                    this.tokens.push(new OperatorToken(operator, i)); /* add operator token */
                    i += operator.symbol.length;
                } else { /* invalid placeholder (containing operator symbols) */
                    throw new ParsingError("invalid Character in placeholder", new PlaceholderToken(this.expr.substr(i, 1)));
                }
            } else { /* is placeholder or a function */
                var end = i + 1;
                for (; end < this.expr.length && !(new Character(this.expr.charAt(end))).isSpecial(this.operatorDefinitions); ++end);
                var func = this.matchFunction(i);
                if (func) { /* it is actually a function */
                    this.tokens.push(new FunctionToken(func, i)); /* add function token */
                } else { /* it is a placeholder */
                    this.tokens.push(new PlaceholderToken(this.expr.substring(i, end), i)); /* add placeholder token */
                }
                i = end;
            }
        }
    };

    compileTokens (tokens) {
        var copy = this.tokens.slice();
        this.dissolveBraces(copy);
        this.compiledToken = this.simplifyTokens(copy);
    };

    simplifyTokens (tokens, offset, length) {
        if (offset === undefined) {
            offset = 0;
        }
        if (length === undefined || (offset + length) > tokens.length) {
            length = tokens.length;
        }
        /* from groups by eliminating separators */
        var tokenGroups = [];
        var currentGroup = [];
        for (var i = offset; i < offset + length; ++i) {
            var token = tokens[i];
            switch (token.type) {
                case TokenType.separator:
                    if (currentGroup.length) {
                        tokenGroups.push(currentGroup);
                    } else {
                        throw new ParsingError("unexpected separator token", token);
                    }
                    currentGroup = []
                    break;
                case TokenType.open:
                    /* open tokens should have been eliminated already */
                    throw new ParsingError("unexpected opening token", token);
                case TokenType.close:
                    /* close tokens should have been eliminated already */
                    throw new ParsingError("unexpected closing token", token);
                default:
                    currentGroup.push(token);
            }
        }
        if (currentGroup.length) {
            tokenGroups.push(currentGroup);
        } else if (tokenGroups.length) {
            throw new ParsingError("unexpected seaparator token at end", tokens[length - 1]);
        } else {
            return new ArgumentToken([], offset);
        }
        /* simplify each group */
        for (var gi = 0; gi < tokenGroups.length; ++gi) {
            var tokenGroup = tokenGroups[gi];
            /* replace functions and arguments with function parents */
            for (var i = tokenGroup.length - 1; i >= 0; --i) {
                var token = tokenGroup[i];
                if (token.type === TokenType.func) {
                    if (i < tokenGroup.length - 1) {
                        var parentToken = new FunctionParent(token, tokenGroup[i + 1]);
                        tokenGroup.splice(i, 2, parentToken); /* replace the function token and the next token (argument) with the parent token */
                    } else {
                        throw new ParsingError(token.expr.requiredArguments + " argument(s) expected", token);
                    }
                }
            }
            /* replace operators, lvalues and rvalues with operator parents */
            for (var highestPrecedenceIndex, highestPrecedence;;) {
                highestPrecedenceIndex = -1;
                highestPrecedence = 0;
                for (var i = 0; i < tokenGroup.length; ++i) {
                    var token = tokenGroup[i];
                    if (token.type === TokenType.operator) {
                        var precedence = token.expr.precedence;
                        if (highestPrecedenceIndex < 0 || precedence > highestPrecedence) {
                            highestPrecedenceIndex = i;
                            highestPrecedence = precedence;
                        }
                    }
                }
                if (highestPrecedenceIndex >= 0) {
                    var operatorToken = tokenGroup[highestPrecedenceIndex];
                    var operatorDef = operatorToken.expr;
                    if (highestPrecedenceIndex + 1 < tokenGroup.length) {
                        var lvalue = undefined;
                        var rvalue = tokenGroup[highestPrecedenceIndex + 1];
                        var first = highestPrecedenceIndex;
                        var length = 2;
                        if (!operatorDef.rhsOnly) {
                            if (highestPrecedenceIndex > 0) {
                                lvalue = tokenGroup[highestPrecedenceIndex - 1];
                                --first;
                                ++length;
                            } else {
                                throw new ParsingError("lvalue expected", operatorToken);
                            }
                        }
                        var parentToken = new OperatorParent(operatorToken, lvalue, rvalue);
                        tokenGroup.splice(first, length, parentToken); /* replace the operator token and value tokens with the parent token */
                    } else {
                        throw new ParsingError("rvalue expected", operatorToken);
                    }
                } else {
                    break;
                }
            }
            /* only one token should be left */
            if (tokenGroup.length !== 1) {
                throw new ParsingError("operator expected", tokenGroup[1]);
            }
        }
        /* return results */
        if (tokenGroups.length > 1) {
            /* there are more groups -> return an argument token */
            var args = [];
            for (var gi = 0; gi < tokenGroups.length; ++gi) {
                args.push(tokenGroups[gi][0]);
            }
            return new ArgumentToken(args, tokenGroups[0][0].offset);
        } else {
            /* there is only a singe group -> return the simplified token */
            return tokenGroups[0][0];
        }
    };

    dissolveBraces (tokens, offset, length) {
        if (offset === undefined) {
            offset = 0;
        }
        if (length === undefined || (offset + length) > tokens.length) {
            length = tokens.length;
        }
        var openIndexes = [];
        for (var i = offset;
            (i < offset + length) && i < (tokens.length); ++i) {
            var token = tokens[i];
            switch (token.type) {
                case TokenType.open:
                    openIndexes.push(i);
                    break;
                case TokenType.close:
                    if (openIndexes.length) {
                        var openIndex = openIndexes.pop();
                        var simplified = this.simplifyTokens(tokens, openIndex + 1, i - openIndex - 1);
                        tokens.splice(openIndex, i - openIndex + 1, simplified);
                        if (openIndexes.length) {
                            i = openIndexes[openIndexes.length - 1];
                        } else {
                            i = -1;
                        }
                    } else {
                        throw new ParsingError("unexpected closing token", token);
                    }
                    break;
            }
        }
    };
};

module.exports = FormulaEvaluator;