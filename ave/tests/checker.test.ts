import Lexer from "../lexer/lexer";
import AveParser from "../parser/aveparser";
import Checker from "../checker/checker";
import { ParsedData } from "../parser/parser";

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveTypeError(errMsg: string): R;
      toBeCorrect(): R;
    }
  }
}

function parse(src: string) {
  const lexer = new Lexer("<test>", src);
  const parser = new AveParser(lexer.lex());
  const parseTree = parser.parse();
  return parseTree;
}

function typecheck(src: string) {
  const parseTree = parse(src);
  const checker = new Checker(parseTree);

  return checker.check();
}

expect.extend({
  toHaveTypeError(recieved: string, errMsg: string) {
    let pass = false;
    let msg = "No type error found";

    const checkedParseTree = typecheck(recieved);

    if (checkedParseTree.hasError) {
      const err = checkedParseTree.errors[0];
      if (err.message == errMsg) {
        pass = true;
        msg = "program has expected type error.";
      } else {
        msg = `Passed in: ${err.message}\nexpected: ${errMsg}`;
      }
    }

    return {
      pass,
      message: () => msg,
    };
  },

  toBeCorrect(src: string) {
    const checkedParseTree = typecheck(src);

    if (checkedParseTree.hasError) {
      return {
        pass: false,
        message: () =>
          `Expected no errors, got: ${checkedParseTree.errors[0].message}`,
      };
    }

    return { pass: true, message: () => "no errors" };
  },
});

describe("The Type cheker", () => {
  it("type checks incorrect assignments", () => {
    expect(`c := "this is a string"
c -= 3 #expect type error`).toHaveTypeError(
      "Cannot use operator '-=' on operand types 'num' and 'str'"
    );

    expect(
      `
start := 0

for i = start, 10, 1
  let a = 1 + i**2
  a = "a" # expect type error here

for i = 0, 10
  k := i + 1
`
    ).toHaveTypeError("Cannot assign type 'str' to type 'num'.");

    expect(`a := "a string literal" 
a += "aaa"

if a >= 1 #expect type error
    a := 1
`).toHaveTypeError(
      "Cannot use operator '>=' on operands of type 'str' and 'num'."
    );

    expect(`
let a = 1; 
let b = "A";
a = b;
`).toHaveTypeError("Cannot assign type 'str' to type 'num'.");
  });

  it("can type check loops", () => {
    expect(`
for i = 1, 2, '1'
  v += i
    `).toHaveTypeError("loop step must be a number.");

    expect(`
for i = 1, 20
  let k: num = i ** 2`).toBeCorrect();
  });

  it("can type check functions", () => {
    expect(
      `func foo(a: num, b: num): num
  return a ** b - 2
  
foo(1, false)`
    ).toHaveTypeError(
      "cannot assign argument of type 'bool' to parameter of type 'num'."
    );

    expect(
      `func foo(a: num, b: num): num
  return a ** b - 2
  
foo(1)`
    ).toHaveTypeError("Missing argument 'b' to function call.");
  });
});
