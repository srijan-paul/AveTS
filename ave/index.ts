import Lexer from './lexer/lexer';
import debug = require('./debug/debug');
import AveParser from './parser/aveparser';
import util = require('util')
import Checker from './checker/checker';

const code: string = 

`let foo: num = 4;
foo = "abcde";
let bar: str = "jssucks"
bar = 12.5`;

const lexer = new Lexer('testfile.ave', code);
const lexedata = lexer.lex();
const parser = new AveParser(lexedata);
// debug.printTokens(lexedata.tokens);

const parsedata = parser.parse();
const checker = new Checker(parsedata);
checker.check();

console.log(parsedata.ast.toString());
// console.log(util.inspect(ast, true, 100))
