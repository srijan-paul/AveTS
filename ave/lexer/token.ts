import TokenType = require('./tokentype');

export default interface Token {
  raw: string;
  type: TokenType;
  value: tokenvalue | null;
  pos: LocationData;
}

export interface LocationData {
  line: number;
  column: number;
  start: number;
  end: number;
}

export type tokenvalue = string | number | boolean;
