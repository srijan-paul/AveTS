import Parser from '../parser';
import * as AST from '../ast/ast';
import { InfixParseFn } from './parsefn';
import Precedence = require('../precedence');
import Token from '../../lexer/token';
import NodeKind = require('../ast/nodekind');

// TODO valid L value check
/**
 * Returns true if the argument is a valid syntactic assignment target.
 * @param lval The left hand side AST Node of the assignment expression.
 * @returns boolean.
 */
function isValidAssignTarget(lval: AST.Node): boolean {
  return lval.kind == NodeKind.Identifier || lval.kind == NodeKind.MemberAcessExpr;
}

/**
 * Parses an assignment expression.
 * @param parser The Parser to draw tokens from.
 * @param left   Left side expression of the assignment expression.
 * @param op     assignment operator token. /=, *=. -=, += etc.
 *
 * @returns AST.BinaryExpr
 */
export const AssignmentParser: InfixParseFn = (parser, left, op) => {
  const rhs = parser.parseExpression(Precedence.ASSIGN);
  if (!isValidAssignTarget(left)) parser.error('Invalid assignment target.', left.token as Token);
  return new AST.AssignExpr(left, op, rhs);
};
