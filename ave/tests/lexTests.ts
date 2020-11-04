import Lexer from "../lexer/lexer";
import { getDirectories, getFiles } from "../util/util";
import debug = require("../debug/debug");
import fs = require("fs");
import chalk = require("chalk");

const lexTestDir: string = "./test/lexer";

function runLexer(filePath: string) {
  console.log("running lexer on " + chalk.yellow(filePath), "\n");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const lexer = new Lexer(filePath, fileContents);
  debug.printTokens(lexer.lex().tokens);
  console.log("\n".repeat(3));
}

export default function runLexerTests() {
  // folders containing the test files
  let count = 0;

  const testFileNames: string[] = getFiles(lexTestDir);
  for (const fileName of testFileNames) {
    const path: string = lexTestDir + "/" + fileName;
    count++;
    runLexer(path);
  }

  console.log(
    chalk.black.bgGreenBright("LEXER TESTS COMPLETE"),
    `: ${count} files lexed.`
  );
}

runLexerTests();
