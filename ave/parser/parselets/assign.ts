import Parser from "../parser";
import * as AST from '../ast/ast'
import { InfixParseFn } from "./parsefn";
import Precedence = require("../precedence");
import Token from "../../lexer/token";

// TODO valid L value check

export default function AssignmentParser(): InfixParseFn {
    return (parser: Parser, left: AST.Node, op: Token) => {
        const rhs = parser.parseExpression(Precedence.ASSIGN);
        return new AST.AssignExpr(left , op, rhs);
    }
}