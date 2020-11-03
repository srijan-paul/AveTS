import Checker from "../checker/checker";
import JSGenerator from "../compiler/codegen/gen";
import Lexer from "../lexer/lexer";
import AveParser from "../parser/aveparser";

const src = `
record Wrapper<T>
  item: T

const k: Wrapper<num> =  { item: 5 }

func foo(a: Wrapper<num>): num
  return a.item + 1

`;

const parseTree = new AveParser(new Lexer("<test>", src).lex()).parse();
new Checker(parseTree).check();

const writer = new JSGenerator(parseTree.ast);
console.log(writer.generateJS());
