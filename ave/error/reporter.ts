import chalk = require("chalk");
import { AveError, AveInfo, getErrorTypeName } from "./error";

// finds the index of nth occurance of a character in a string,
// if not found, returns the length of the string instead
function nthIndex(s: string, c: string, n: number): number {
  for (let i = 0; i < s.length; i++) {
    if (s[i] == c) n--;
    if (n == 0) return i;
  }

  return s.length;
}

// return a colored string focusing on the error
function makeErrorLine(source: string, line: number) {
  const lineNumber = chalk.bgWhite.black(line + "| ");
  const lineContents = source.substring(
    nthIndex(source, "\n", line - 1) + (line == 1 ? 0 : 1),
    nthIndex(source, "\n", line)
  );

  return lineNumber + " " + lineContents;
}

// nth line of the source code in gray color
function makeLine(source: string, line: number) {
  const lineNumber = chalk.rgb(127, 140, 141)(line + "| ");
  const lineContents = source.substring(
    nthIndex(source, "\n", line - 1) + (line == 1 ? 0 : 1),
    nthIndex(source, "\n", line)
  );

  return lineNumber + " " + chalk.rgb(127, 140, 141)(lineContents);
}

function makeUnderLine(source: string, line: number, err: AveError): string {
  const lineLength =
    nthIndex(source, "\n", line) - nthIndex(source, "\n", line - 1) + 1;

  const text =
    " ".repeat(err.column + `${err.line}| `.length) +
    "^".repeat((err.endPos || 1) - err.startPos);

  return chalk.rgb(229, 80, 57)(text);
}

function makeErrorInfo(source: string, line: number, err: AveError) {
  const lines: string[] = [];

  // previous line (for easy identification of error locations)
  if (line - 1) lines.push(makeLine(source, line - 1));
  // line where the error happened
  lines.push(makeErrorLine(source, line));

  if (err.endPos) {
    lines.push(makeUnderLine(source, line, err));
  }

  return lines.join("\n");
}

export function throwError(err: AveError, source: string) {
  const errType: string = getErrorTypeName(err.type);
  const message = `\n${chalk.yellow(err.fileName)}:${err.line}:${
    err.column
  } - [${chalk.red(errType)}] ${err.message}`;

  console.error(message);
  console.log(makeErrorInfo(source, err.line, err));
}

export function throwInfo(info: AveInfo) {
  console.error(chalk.red("|* ") + info.message);
}
