import Lexer from "../lexer/lexer";
import debug = require("../debug/debug");
import NodeKind = require("../parser/ast/nodekind");
import AveParser from "../parser/aveparser";
import TokenType = require("../lexer/tokentype");

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchAST(expected: UnknownNode[]): R;
    }
  }
}

expect.extend({
  toMatchAST(src: string, expected: UnknownNode[]) {
    const ast = toAST(src);
    const match = matchNodes(expected, ast);
    return {
      pass: match.pass,
      message: () => match.message,
    };
  },
});

function toAST(src: string) {
  const lexer = new Lexer("<test>", src);
  const parser = new AveParser(lexer.lex());
  return parser.parse().ast.body.statements;
}

type UnknownNode = { [k: string]: any };
type MatchResult = { pass: boolean; message: string };

/**
 * Returns `true` if all properties in `a` are also present in `b`.
 * @param {UnknownNode} a object whose properties are to be checked against
 * @param {UnknownNode} b object which is expected tp be the superset and contain all properties of `a`.
 */

function isSubsetOf(a: UnknownNode, b: UnknownNode): MatchResult {
  for (const [key, val] of Object.entries(a)) {
    if (!b.hasOwnProperty(key))
      return { pass: false, message: `missing key "${key}"` };
    const match = matchNodes(val, b[key]);
    if (!match.pass) {
      return {
        pass: false,
        message: `${key}: ${match.message}`,
      };
    }
  }
  // a is an empty object
  return { pass: true, message: "nodes match" };
}

/**
 * Matches two values `a` and `b`. The values can be arrays, object literals
 * strings or number literals.
 * @param a
 * @param b
 */
function matchNodes(a: any, b: any): MatchResult {
  if (typeof a != typeof b)
    return { pass: false, message: "conflicting types" };

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length > b.length)
      return {
        pass: false,
        message: `Expected at least ${a.length} elements`,
      };
    for (let i = 0; i < a.length; i++) {
      const match = matchNodes(a[i], b[i]);
      if (!match.pass) return match;
    }
    return { pass: true, message: "arrays match" };
  }

  if (typeof a == "object") {
    return isSubsetOf(a, b);
  }

  if (a == b) {
    return {
      pass: true,
      message: "values equal",
    };
  }

  return {
    pass: false,
    message: `Expected ${a} got ${b}`,
  };
}

// prettier-ignore
test("variable declarations", () => {
  expect(`let a = 1;`).toMatchAST([{
    kind: NodeKind.VarDeclaration,
    declarators: [{
      kind: NodeKind.VarDeclarator, name: "a", value: {
        kind: NodeKind.Literal,
        value: 1
    }},],
  }]);
});

test("assignment expression", () => {
  expect(`a = b = 1`).toMatchAST([
    {
      kind: NodeKind.ExprStmt,
      expr: {
        kind: NodeKind.AssignmentExpr,
        left: { kind: NodeKind.Identifier, name: "a" },
        right: {
          kind: NodeKind.AssignmentExpr,
          left: { kind: NodeKind.Identifier, name: "b" },
          right: { kind: NodeKind.Literal, value: 1 },
        },
      },
    },
  ]);
});

// prettier-ignore
test("parse precedence for operators.", () => {
  expect(`1 + 2 * -3`).toMatchAST([{
    kind: NodeKind.ExprStmt,
    expr: {
      kind: NodeKind.BinaryExpr,
      operator: { type: TokenType.PLUS },
      left: { kind: NodeKind.Literal, value: 1 },
      right: {
        kind: NodeKind.BinaryExpr,
        operator: { type: TokenType.STAR },
        right: { 
          kind: NodeKind.PrefixUnaryExpr,
          operator: { type: TokenType.MINUS },
          operand: { kind: NodeKind.Literal, value: 3 }
        }
      }
    }
  }]);
});
