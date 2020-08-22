import Lexer from '../lexer/lexer';
import { getDirectories, getFiles } from './helpers';
import debug = require('../debug/debug');
import fs = require('fs');
import util = require('util');
import chalk = require('chalk');

const lexTestDir: string = './test';

function runLexer(filePath: string) {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const lexer = new Lexer(fileContents);
  debug.printTokens(lexer.lex());
}

export default function runLexerTests() {
  // folders containing the test files
  const folderNames: string[] = getDirectories(lexTestDir);
  for (const f of folderNames) {
    const testFileNames: string[] = getFiles(lexTestDir + '/' + f);
    for (const fileName of testFileNames) {
      const path: string = lexTestDir + '/' + f + '/' + fileName;
      runLexer(path);
    }
  }
}

runLexerTests();
