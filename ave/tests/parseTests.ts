import Lexer from '../lexer/lexer';
import { getFiles } from './helpers';
import fs = require('fs');
import Checker from '../checker/checker';
import chalk = require('chalk');
import AveParser from '../parser/aveparser';

// contains only files, no sub directories.
const parseTestDir = './test/parser';

function runTests() {
  const fileNames: string[] = getFiles(parseTestDir);
  for (let f of fileNames) {
    const path = parseTestDir + '/' + f;
    testFile(path);
  }
}

function testFile(path: string) {
  console.log(chalk.green('Running parser on ') + chalk.yellow(path));

  const lexData = new Lexer(path, fs.readFileSync(path, 'utf-8')).lex();
  const parseTree = new AveParser(lexData).parse();
  new Checker(parseTree).check();
  // console.log(parseTree.ast.toString())
}

runTests();
console.log(chalk.cyan('Parser and type checker test suite complete.'))