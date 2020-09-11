import Token from '../lexer/token';
import FunctionType from '../types/function-type';
import GenericType, { GenericTypeInstance } from '../types/generic-type';
import ObjectType from '../types/object-type';
import { Type, t_error, t_undef } from '../types/types';
import Checker from './checker';

// resolves a type
// if the type is unresolved it looks
// for the type in the environment chain.
// if the type cannot be resolved,
// then the error is throw pointing to the provided token

export default function resolveType(
  type: Type,
  checker: Checker,
  token?: Token
): Type {

  if (type.isPrimitive) {
    return resolvePrimitiveType(type, checker, token);
  }

  if (type instanceof FunctionType) {
    return resolveFunctionType(type, checker, token);
  }

  if (type instanceof ObjectType) {
    return resolveObjectType(type, checker, token);
  }

  if (type instanceof GenericTypeInstance) {
    return resolveGenericTypeInstance(type, checker, token);
  }

  return t_undef;
}

function resolveFunctionType(
  t: FunctionType,
  checker: Checker,
  token?: Token
): FunctionType {
  for (let p of t.params) {
    p.type = resolveType(p.type, checker, token);
  }

  t.returnType = resolveType(t.returnType, checker, token);

  return t;
}

function resolvePrimitiveType(
  type: Type,
  checker: Checker,
  token?: Token
): Type {
  if (!type.unresolved) return type;
  let resolved = checker.env.findType(type.tag);
  if (!resolved)
    errorOrWarn(`Cannot find type '${type.toString()}'`, checker, token);
  return resolved || t_error;
}

function resolveObjectType(t: ObjectType, checker: Checker, token?: Token) {
  t.properties.forEach((type: Type, key: string) => {
    t.properties.set(key, resolveType(type, checker, token));
  });

  return t;
}

function resolveGenericTypeInstance(
  type: GenericTypeInstance,
  checker: Checker,
  token?: Token
) {
  let resolved = checker.env.findType(type.tag);

  if (!resolved) {
    const message = `Cannot find type name ${type.toString()}`;
    errorOrWarn(message, checker, token);
    return t_undef;
  }

  if (!(resolved instanceof GenericType)) {
    const message = `type '${type.toString()}' does not take any type arguments`;
    errorOrWarn(message, checker, token);
    return t_undef;
  }

  let args = [];
  for (let i = 0; i < type.typeArgs.length; i++) {
    args.push(resolveType(type.typeArgs[i], checker, token));
  }

  return resolved.create(...args);
}

// throws an error if a token is available for reporting
// else throws a warning.
function errorOrWarn(message: string, checker: Checker, token?: Token) {
  if (token) checker.error(message, token);
  else checker.warn(message);
}
