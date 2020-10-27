import Token, { LocationData } from "../lexer/token";
import chalk = require("chalk");

export enum ErrorType {
  SyntaxError,
  TypeError,
  ReferenceError,
}

export interface AveError {
  message: string;
  startPos: number;
  endPos?: number;
  line: number;
  column: number;
  type: ErrorType;
  fileName: string;
}

export interface AveInfo {
  message: string;
  fileName: string;
}

export type ErrorReportFn = (err: AveError, src: string) => any;

export function getErrorTypeName(et: ErrorType) {
  return ["SyntaxError", "TypeError", "ReferenceError"][et];
}

export function makeInfo(message: string, fileName: string): AveInfo {
  return {
    message,
    fileName,
  };
}

export function errorFromToken(
  token: Token,
  message: string,
  fileName: string,
  type?: ErrorType
): AveError {
  return {
    type: type || ErrorType.SyntaxError,
    startPos: token.pos.start,
    endPos: token.pos.end,
    line: token.pos.line,
    column: token.pos.column,
    message: message,
    fileName,
  };
}
