import Lexer from './lexer/lexer';
import debug = require('./debug/debug');

const code: string = `const a = 1;
const b = 2.12e2;
const binNum = 0b1010;
func doThis(a)
  return a*a;`;

const lexer = new Lexer(code);
const tokens = lexer.lex();
debug.printTokens(tokens);
