import Lexer from './lexer/lexer';
import debug = require('./debug/debug');
import AveParser from './parser/aveparser';

const code: string = `bar + foo / 2`;

const lexer = new Lexer(code);
const tokens = lexer.lex();
const parser = new AveParser(tokens);
debug.printTokens(tokens);
console.log(parser.parse().toString());
