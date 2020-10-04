import Lexer from '../lexer/lexer';
import Token from '../lexer/token';
import debug = require('../debug/debug');
import TokenType = require('../lexer/tokentype');

type TT = TokenType;

expect.extend({
  toMatchTokens(received: Token[], expected: TT[]) {

    if (received.length != expected.length) {
      return {
        message: () => `Expected ${expected.length} tokens but got ${received.length}.`,
        pass: false,
      };
    }

    expected.forEach((type, index) => {
      if (received[index].type != type) {
        return {
          message: () =>
            `Expected '${debug.tokenName(type)}' but got '${debug.tokenName(
              received[index].type
            )}'`,
          pass: false,
        };
      }
    });

    return {
      message: () => `tokens matched.`,
      pass: true,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchTokens(expected: TT[]): R;
    }
  }
}

test('Lexer tests', () => {
  const lexer = new Lexer('<test lexer>', '1 + 2');

  expect(lexer.lex().tokens).toMatchTokens([
    TokenType.LITERAL_NUM,
    TokenType.PLUS,
    TokenType.LITERAL_NUM,
    TokenType.EOF,
  ]);
});
