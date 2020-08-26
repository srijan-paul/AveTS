import Lexer from '../lexer/lexer';
import { getDirectories, getFiles } from './helpers';
import debug = require('../debug/debug');
import fs = require('fs');
import util = require('util');
import chalk = require('chalk');

const lexTestDir: string = './test';

function runLexer(filePath: string) {
  console.log('running lexer on ' + chalk.yellow(filePath), '\n');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const lexer = new Lexer(fileContents);
  debug.printTokens(lexer.lex().tokens);
  console.log('\n'.repeat(3));
}

export default function runLexerTests() {
  // folders containing the test files
  let count = 0;
  const folderNames: string[] = getDirectories(lexTestDir);
  for (const f of folderNames) {
    const testFileNames: string[] = getFiles(lexTestDir + '/' + f);
    for (const fileName of testFileNames) {
      const path: string = lexTestDir + '/' + f + '/' + fileName;
      count++;
      runLexer(path);
    }
  }

  console.log(
    chalk.black.bgGreenBright('LEXER TESTS COMPLETE'),
    `: ${count} files lexed.`
  );
}

runLexerTests();
