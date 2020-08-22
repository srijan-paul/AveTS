export function isAlpha(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

export function isAlNum(c: string): boolean {
  return isAlpha(c) || isDigit(c);
}

export function isValidIdStart(c: string): boolean {
  return isAlpha(c) || c == '_' || c == '$';
}

export function isValidIdChar(c: string): boolean {
  return isAlNum(c) || c == '_';
}

export function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

export function isHexDigit(c: string): boolean {
  return isDigit(c) || (c >= 'a' && c <= 'f');
}

export function isBinDigit(c: string): boolean {
  return c == '0' || c == '1';
}
