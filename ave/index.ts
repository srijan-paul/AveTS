import Lexer from './lexer/lexer';
import debug = require('./debug/debug');

const lexer = new Lexer('\'Heelow\\n\' + and + 123.1e2 0b101 0xffea1');
const tokens = lexer.lex();
debug.printTokens(tokens);
