import Token, { TokenPosition } from '../lexer/token';
import chalk = require('chalk');

export enum ErrorType {
  TypeError,
  SyntaxError,
}

export interface AveError {
  message: string;
  startPos: number;
  endPos?: number;
  line: number;
  column: number;
  type: ErrorType;
}

function getErrorTypeName(et: ErrorType) {
  return ['TypeError', 'SyntaxError'][et];
}

export function throwError(err: AveError, source: string) {
  const errType: string = getErrorTypeName(err.type);
  console.error(
    `${chalk.red(errType)} at [line ${err.line}: ${
      err.column
    }]: ${err.message}`
  );
}

export function errorFromToken(token: Token, message: string): AveError {
  return {
    type: ErrorType.SyntaxError,
    startPos: token.pos.start,
    endPos: token.pos.end,
    line: token.pos.line,
    column: token.pos.column,
    message: message
  }
}