import Lexer from './lexer/lexer';
import debug = require('./debug/debug');
import AveParser from './parser/aveparser';
import util = require('util');
import Checker from './checker/checker';

const code: string = 
`a :bool = true;
a = !1 and 2
a = 1 or 2`;

const lexer = new Lexer('testfile.ave', code);
const lexedata = lexer.lex();
const parser = new AveParser(lexedata);
// debug.printTokens(lexedata.tokens);

const parsedata = parser.parse();
const checker = new Checker(parsedata);
checker.check();

console.log(parsedata.ast.toString());
// console.log(util.inspect(parsedata.ast, true, 100))
