import Lexer from "../lexer/lexer";
import AveParser from "../parser/aveparser";
import Checker from "../checker/checker";

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveTypeError(errMsg: string): R;
    }
  }
}

function parse(src: string) {
  const lexer = new Lexer("<test>", src);
  const parser = new AveParser(lexer.lex());
  const parseTree = parser.parse();
  return parseTree;
}

expect.extend({
  toHaveTypeError(recieved: string, errMsg: string) {
    let pass = false;
    let msg = "No type error found";

    const parseTree = parse(recieved);
    const checker = new Checker(parseTree);

    const checkedParseTree = checker.check();

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
  });

  expect(`a := "a string literal" 
a += "aaa"

if a >= 1 #expect type error
    a := 1
`).toHaveTypeError(
    "Cannot use operator '>=' on operands of type 'str' and 'num'."
  );
});
