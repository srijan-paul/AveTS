import Lexer from './lexer/lexer';
import debug = require('./debug/debug');

const code: string = `1 + 2 + 3`;

const lexer = new Lexer(code);
const tokens = lexer.lex();
debug.printTokens(tokens);
