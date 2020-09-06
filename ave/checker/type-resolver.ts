import Token from '../lexer/token';
import FunctionType from '../types/function-type';
import ObjectType from '../types/object-type';
import { Type, t_error, t_infer, t_undef } from '../types/types';
import Checker from './checker';

// resolves a type
// if the type is unresolved it looks
// for the type in the environment chain.
// if the type cannot be resolved,
// then the error is throw pointing to the provided token

export default function resolveType(
  type: Type,
  token: Token,
  checker: Checker
): Type {
  // return resolvePrimitiveType(type, token, checker);

  if (type.isPrimitive) {
    return resolvePrimitiveType(type, token, checker);
  }

  if (type instanceof FunctionType) {
    return resolveFunctionType(type, token, checker);
  }

  if (type instanceof ObjectType) {
    return resolveObjectType(type, token, checker);
  }

  return t_error;
}

function resolveFunctionType(
  t: FunctionType,
  token: Token,
  checker: Checker
): FunctionType {
  for (let p of t.params) {
    p.type = resolveType(p.type, token, checker);
  }

  t.returnType = resolveType(t.returnType, token, checker);

  return t;
}

function resolvePrimitiveType(
  type: Type,
  token: Token,
  checker: Checker
): Type {
  if (!type.unresolved) return type;
  let resolved = checker.env.findType(type.tag);
  if (!resolved) checker.error(`Cannot find type '${type.toString()}'`, token);
  return resolved || t_error;
}

function resolveObjectType(t: ObjectType, token: Token, checker: Checker) {
  t.properties.forEach((type: Type, key: string) => {
    t.properties.set(key, resolveType(type, token, checker));
  });

  return t;
}
