import Parser from "../parser";
import * as AST from '../ast/ast'
import { InfixParseFn } from "./parsefn";
import Precedence = require("../precedence");
import Token from "../../lexer/token";
import NodeKind = require("../ast/nodekind");

// TODO valid L value check

function isValidAssignTarget(lval: AST.Node): boolean {
    return lval.kind == NodeKind.Identifier;
}

export default function AssignmentParser(): InfixParseFn {
    return (parser: Parser, left: AST.Node, op: Token) => {
        const rhs = parser.parseExpression(Precedence.ASSIGN);
        if (!isValidAssignTarget(left)) parser.error('Invalid assignment target.', left.token as Token);
        return new AST.AssignExpr(left , op, rhs);
    }
}