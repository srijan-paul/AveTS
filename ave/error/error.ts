import { TokenPosition } from '../lexer/token';
import chalk = require('chalk');

export enum ErrorType {
  TypeError,
  SyntaxError,
}

export interface AveError {
  message: string;
  startPos: TokenPosition;
  endPos: TokenPosition;
  type: ErrorType;
}

function getErrorTypeName(et: ErrorType) {
  return ['TypeError', 'SyntaxError'][et];
}

export function throwError(err: AveError, source: string) {
  const errType: string = getErrorTypeName(err.type);
  console.error(
    `${chalk.red.bold(errType)} at [line ${err.startPos.line}]: ${err.message}`
  );
}
