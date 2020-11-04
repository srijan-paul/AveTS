import Lexer from "../lexer/lexer";
import { getFiles } from "../util/util";
import fs = require("fs");
import chalk = require("chalk");
import AveParser from "../parser/aveparser";

// contains only files, no sub directories.
const parseTestDir = "./test/parser";

function runTests() {
  const fileNames: string[] = getFiles(parseTestDir);
  let count = 0;
  let failcount = 0;
  for (let f of fileNames) {
    const path = parseTestDir + "/" + f;
    if (testFile(path)) count++;
    else failcount++;
  }

  const result =
    failcount > 0
      ? `${failcount} ${
          failcount > 1 ? "tests" : "test"
        } ${chalk.bgRedBright.black("FAILED.")}`
      : "All parser tests " + chalk.bgGreenBright.black("PASSED.");

  console.log("\n", result);
}

function testFile(path: string) {
  console.log(chalk.green("Running parser on ") + chalk.yellow(path));

  const lexData = new Lexer(path, fs.readFileSync(path, "utf-8")).lex();
  const parseTree = new AveParser(lexData).parse();
  return !parseTree.hasError;
}

runTests();
