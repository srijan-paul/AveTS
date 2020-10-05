import Lexer from '../lexer/lexer';
import Token from '../lexer/token';
import debug = require('../debug/debug');
import TokenType = require('../lexer/tokentype');
import chalk = require('chalk');

// declaration to prevent the typescript compiler from croacking.

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchTokens(expected: TokenType[]): R;
    }
  }
}

expect.extend({
  toMatchTokens(received: Token[], expected: TokenType[]) {
    if (received.length != expected.length) {
      return {
        message: () => `Expected ${expected.length} tokens but got ${received.length}.`,
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
            )}' but got '${chalk.redBright(debug.tokenName(received[i].type))}'`,
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
  return new Lexer('<test script>', src).lex().tokens;
}

// tests:

test('Lexer tests', () => {
  expect(tokens('1 + 2')).toMatchTokens([
    TokenType.LITERAL_NUM,
    TokenType.PLUS,
    TokenType.LITERAL_NUM,
    TokenType.EOF,
  ]);
});

test('scanning operators', () => {
  const src = '++ -- - + * % ** // ! ** or and ...';

  expect(tokens(src)).toMatchTokens([
    TokenType.PLUS_PLUS,
    TokenType.MINUS_MINUS,
    TokenType.MINUS,
    TokenType.PLUS,
    TokenType.STAR,
    TokenType.MOD,
    TokenType.POW,
    TokenType.FLOOR_DIV,
    TokenType.BANG,
    TokenType.POW,
    TokenType.OR,
    TokenType.AND,
    TokenType.SPREAD,
    TokenType.EOF,
  ]);
});

test('scanning strings', () => {
  expect(tokens(`"string 1" 'string 2'`)).toMatchTokens([
    TokenType.LITERAL_STR,
    TokenType.LITERAL_STR,
    TokenType.EOF,
  ]);
});

test('scanning numbers', () => {
  expect(tokens('123 123.5 124.2e3 0xff01 0b110101 15e10 11.5e-1')).toMatchTokens([
    TokenType.LITERAL_NUM,
    TokenType.LITERAL_NUM,
    TokenType.LITERAL_NUM,
    TokenType.LITERAL_HEX,
    TokenType.LITERAL_BINARY,
    TokenType.LITERAL_NUM,
    TokenType.LITERAL_NUM,
    TokenType.EOF,
  ]);
});

test('ignoring comments', () => {
  expect(tokens(`#single line comment #* multi-line comment *# `)).toMatchTokens([TokenType.EOF]);
});
