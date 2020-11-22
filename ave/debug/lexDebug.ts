import TokenType = require("../lexer/tokentype");
import Token from "../lexer/token";
import chalk = require("chalk");

// length of the longest token name
// (TOKEN_LITERAL_STR) used for
// formatting purposes when logging
// to console.
const MAX_TOKEN_LENGTH: number = 17;
// if a token's value / raw is too, long
// only a part of it is shown in the console.
const MAX_LOG_TEXT_LENGTH: number = 17;

export function printTokens(tokens: Token[]) {
  for (let token of tokens) printToken(token);
}

export function printToken(tok: Token) {
  console.log(coloredTokenInfo(tok));
}

export function coloredTokenInfo(token: Token) {
  let tokenText: string = chalk.rgb(
    96,
    163,
    188
  )(`TOKEN_${tokenName(token.type)}`);

  let padding: string = " ".repeat(
    MAX_TOKEN_LENGTH - tokenName(token.type).length + 2
  );

  // only show upto 17 characters if the raw text is too long
  // eg. a long string or a big number

  let rawText: string =
    token.raw.length > MAX_LOG_TEXT_LENGTH
      ? token.raw.substring(0, MAX_LOG_TEXT_LENGTH - 3) + "... "
      : token.raw;

  const rawPadding = " ".repeat(MAX_LOG_TEXT_LENGTH - rawText.length + 2);

  // color the text
  rawText = chalk.rgb(120, 224, 143)(rawText);

  const position: string = `[line ${token.pos.line}: ${token.pos.start}-${token.pos.end}]`;

  return `${tokenText + padding} raw: ${
    `'${rawText}'` + rawPadding
  } position: ${position}`;
}

export function tokenInfo(token: Token): string {
  return `TOKEN_${tokenName(token.type)}   raw: '${token.raw}' pos: [${
    "line " + token.pos.line
  } : ${token.pos.start}-${token.pos.end}]`;
}

//prettier-ignore

export function tokenName(t: TokenType): string {
  switch (t) {
    case TokenType.INDENT:         return 'INDENT';
    case TokenType.DEDENT:         return 'DEDENT';
    case TokenType.EOF:            return 'EOF';
    case TokenType.NEWLINE:        return 'NEWLINE';
    case TokenType.L_PAREN:        return 'L_PAREN';
    case TokenType.R_PAREN:        return 'R_PAREN';
    case TokenType.L_BRACE:        return 'L_BRACE';
    case TokenType.R_BRACE:        return 'R_BRACE';
    case TokenType.L_SQ_BRACE:     return 'L_SQ_BRACE';
    case TokenType.R_SQ_BRACE:     return 'R_SQ_BRACE';
    case TokenType.COMMA:          return 'COMMA';
    case TokenType.DOT:            return 'DOT';
    case TokenType.COLON:          return 'COLON';
    case TokenType.SEMI_COLON:     return 'SEMI_COLON';
    case TokenType.ARROW:          return 'ARROW';
    case TokenType.AT:             return 'AT';
    case TokenType.EQ_EQ:          return 'EQ_EQ';
    case TokenType.BANG_EQ:        return 'BANG_EQ';
    case TokenType.GREATER_EQ:     return 'GREATER_EQ';
    case TokenType.LESS_EQ:        return 'LESS_EQ';
    case TokenType.GREATER:        return 'GREATER';
    case TokenType.LESS:           return 'LESS';
    case TokenType.EQ:             return 'EQ';
    case TokenType.STAR_EQ:        return 'STAR_EQ';
    case TokenType.MINUS_EQ:       return 'MINUS_EQ';
    case TokenType.PLUS_EQ:        return 'PLUS_EQ';
    case TokenType.DIV_EQ:         return 'DIV_EQ';
    case TokenType.MOD_EQ:         return 'MOD_EQ';
    case TokenType.POW_EQ:         return 'POW_EQ';
    case TokenType.PLUS:           return 'PLUS';
    case TokenType.MINUS:          return 'MINUS';
    case TokenType.PLUS_PLUS:      return 'PLUS_PLUS';
    case TokenType.MINUS_MINUS:    return 'MINUS_MINUS';
    case TokenType.STAR:           return 'STAR';
    case TokenType.POW:            return 'POW';
    case TokenType.MOD:            return 'MOD';
    case TokenType.DIV:            return 'DIV';
    case TokenType.FLOOR_DIV:      return 'FLOOR_DIV';
    case TokenType.BANG:           return 'BANG';
    case TokenType.POUND:          return 'POUND';
    case TokenType.NOT:            return 'NOT';
    case TokenType.AMP:            return 'AMP';
    case TokenType.PIPE:           return 'PIPE';
    case TokenType.XOR:            return 'XOR';
    case TokenType.OR:             return 'OR';
    case TokenType.AND:            return 'AND';
    case TokenType.BREAK:          return 'BREAK';
    case TokenType.CONTINUE:       return 'CONTINUE';
    case TokenType.IF:             return 'IF';
    case TokenType.ELSE:           return 'ELSE';
    case TokenType.ELIF:           return 'ELIF';
    case TokenType.SWITCH:         return 'SWITCH';
    case TokenType.CASE:           return 'CASE';
    case TokenType.DEFAULT:        return 'DEFAULT';
    case TokenType.FALL:           return 'FALL';
    case TokenType.TO:             return 'TO';
    case TokenType.IS:             return 'IS';
    case TokenType.WHEN:           return 'WHEN';
    case TokenType.FUNC:           return 'FUNC';
    case TokenType.RETURN:         return 'RETURN';
    case TokenType.THIS:           return 'THIS';
    case TokenType.IN:             return 'IN';
    case TokenType.FOR:            return 'FOR';
    case TokenType.LET:            return 'LET';
    case TokenType.CONST:          return 'CONST';
    case TokenType.DO:             return 'DO';
    case TokenType.WHILE:          return 'WHILE';
    case TokenType.ENUM:           return 'ENUM';
    case TokenType.NEW:            return 'NEW';
    case TokenType.CLASS:          return 'CLASS';
    case TokenType.STATIC:         return 'STATIC';
    case TokenType.VAR:            return 'VAR';
    case TokenType.SET:            return 'SET';
    case TokenType.GET:            return 'GET';
    case TokenType.PASS:           return 'PASS';
    case TokenType.IMPORT:         return 'IMPORT';
    case TokenType.EXPORT:         return 'EXPORT';
    case TokenType.STRING:         return 'STR';
    case TokenType.NUMBER:         return 'NUM';
    case TokenType.BOOL:           return 'BOOL';
    case TokenType.OBJECT:         return 'OBJECT';
    case TokenType.LITERAL_NUM:    return 'LITERAL_NUM';
    case TokenType.LITERAL_STR:    return 'LITERAL_STR';
    case TokenType.LITERAL_HEX:    return 'LITERAL_HEX';
    case TokenType.LITERAL_BINARY: return 'LITERAL_BINARY';
    case TokenType.LITERAL_REGEXP: return 'LITERAL_REGEXP';
    case TokenType.TRUE:           return 'TRUE';
    case TokenType.FALSE:          return 'FALSE';
    case TokenType.NIL:            return 'NIL';
    case TokenType.NAME:           return 'NAME';
    case TokenType.ANY:            return 'ANY';
    case TokenType.RECORD:         return 'RECORD';
    case TokenType.SPREAD:         return 'SPREAD';
    case TokenType.TYPE:           return 'TYPE';
    default:
      return 'UNKNOWN';
  }
}
