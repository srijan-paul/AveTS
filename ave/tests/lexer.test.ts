import Lexer from "../lexer/lexer";
import Token from "../lexer/token";
import debug = require("../debug/debug");
import TT = require("../lexer/tokentype");
import chalk = require("chalk");

// declaration to prevent the typescript compiler from croacking.

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchTokens(expected: TT[]): R;
    }
  }
}

expect.extend({
  toMatchTokens(received: Token[], expected: TT[]) {
    if (received.length != expected.length) {
      return {
        message: () =>
          `Expected ${expected.length} tokens but got ${received.length}.`,
        pass: false,
      };
    }

    for (let i = 0; i < expected.length; i++) {
      const type = expected[i];
      if (received[i].type != type) {
        return {
          message: () =>
            `Expected token '${chalk.greenBright(
              debug.tokenName(type)
            )}' but got '${chalk.redBright(
              debug.tokenName(received[i].type)
            )}'`,
          pass: false,
        };
      }
    }

    return {
      message: () => `tokens matched.`,
      pass: true,
    };
  },
});

function tokens(src: string) {
  return new Lexer("<test script>", src).lex().tokens;
}

// tests:

test("Lexer tests", () => {
  expect(tokens("1 + 2")).toMatchTokens([
    TT.LITERAL_NUM,
    TT.PLUS,
    TT.LITERAL_NUM,
    TT.EOF,
  ]);
});

test("scanning operators", () => {
  const src = "++ -- - + * % ** // ! ** or and ...";

  expect(tokens(src)).toMatchTokens([
    TT.PLUS_PLUS,
    TT.MINUS_MINUS,
    TT.MINUS,
    TT.PLUS,
    TT.STAR,
    TT.MOD,
    TT.POW,
    TT.FLOOR_DIV,
    TT.BANG,
    TT.POW,
    TT.OR,
    TT.AND,
    TT.SPREAD,
    TT.EOF,
  ]);
});

test("scanning strings", () => {
  expect(tokens(`"string 1" 'string 2'`)).toMatchTokens([
    TT.LITERAL_STR,
    TT.LITERAL_STR,
    TT.EOF,
  ]);
});

test("scanning numbers", () => {
  expect(
    tokens("123 123.5 124.2e3 0xff01 0b110101 15e10 11.5e-1")
  ).toMatchTokens([
    TT.LITERAL_NUM,
    TT.LITERAL_NUM,
    TT.LITERAL_NUM,
    TT.LITERAL_HEX,
    TT.LITERAL_BINARY,
    TT.LITERAL_NUM,
    TT.LITERAL_NUM,
    TT.EOF,
  ]);
});

test("ignoring comments", () => {
  expect(
    tokens(`#single line comment #* multi-line comment *# `)
  ).toMatchTokens([TT.EOF]);
});

it("is able to scan nested blocks properly.", () => {
  expect(
    tokens(`for e of a
  for i of e
    i = 1
`)
  ).toMatchTokens([
    TT.FOR,
    TT.NAME,
    TT.OF,
    TT.NAME,
    TT.INDENT,
    TT.FOR,
    TT.NAME,
    TT.OF,
    TT.NAME,
    TT.INDENT,
    TT.NAME,
    TT.EQ,
    TT.LITERAL_NUM,
    TT.DEDENT,
    TT.DEDENT,
    TT.EOF,
  ]);
});
