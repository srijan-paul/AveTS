import Token from '../../lexer/token';
import Parser from '../parser';
import {InfixParseFn} from './parsefn';
import * as AST from '../ast/ast'
import Precedence = require('../precedence');

const MemberExprParser: InfixParseFn = (parser: Parser, left: AST.Expression, dot: Token) => {
    const property = parser.parseExpression(Precedence.MEM_ACCESS + 1);
    return new AST.MemberAccessExpr(dot, left, property);
}

export = MemberExprParser;