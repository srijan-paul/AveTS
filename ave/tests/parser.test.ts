import Lexer from "../lexer/lexer";
import debug = require("../debug/debug");
import NodeKind = require("../parser/ast/nodekind");
import AveParser from "../parser/aveparser";

interface NodeInfo {
  kind: NodeKind;
  [_: string]: any;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchAST(expected: NodeInfo[]): R;
    }
  }
}

expect.extend({
  toMatchAST(src: string, expected: NodeInfo[]) {
    const ast = toAST(src);
    const match = matchSignature(expected, ast);
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

function isSubsetOf(a: UnknownNode, b: UnknownNode): MatchResult {
  for (const [key, val] of Object.entries(a)) {
    if (!b.hasOwnProperty(key))
      return { pass: false, message: `missing key "${key}"` };
    const match = matchSignature(val, b[key]);
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

function matchSignature(a: any, b: any): MatchResult {
  if (typeof a != typeof b)
    return { pass: false, message: "conflicting types" };

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length > b.length)
      return {
        pass: false,
        message: `Expected at least ${a.length} elements`,
      };
    for (let i = 0; i < a.length; i++) {
      const match = matchSignature(a[i], b[i]);
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
