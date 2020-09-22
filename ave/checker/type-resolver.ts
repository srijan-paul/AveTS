import Token from '../lexer/token';
import FunctionType from '../types/function-type';
import GenericType, { GenericTypeInstance } from '../types/generic-type';
import ObjectType from '../types/object-type';
import { Type, t_error, t_undef } from '../types/types';
import UnionType from '../types/union-type';
import Checker from './checker';

/**
 * Resolves a type. If the type is marked as 'unresolved' it
 * looks for the type in the checker's environment chain.
 * If the type cannot be resolved then an error is thrown pointing to the
 * provided token (if any).
 * @param type    {Type}    The type to resolve.
 * @param checker {Checker} The type checker to use.
 * @param token?  {Token}   The token at which the error to thrown when found.
 */

export default function resolveType(type: Type, checker: Checker, token?: Token): Type {
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

  if (type instanceof UnionType) {
    return resolveUnionType(type, checker, token);
  }

  return t_undef;
}

function resolveFunctionType(t: FunctionType, checker: Checker, token?: Token): FunctionType {
  for (let p of t.params) {
    p.type = resolveType(p.type, checker, token);
  }

  t.returnType = resolveType(t.returnType, checker, token);

  return t;
}

function resolvePrimitiveType(type: Type, checker: Checker, token?: Token): Type {
  if (!type.unresolved) return type;
  let resolved = checker.env.findType(type.tag);
  if (!resolved) errorOrWarn(`Cannot find type '${type.toString()}'`, checker, token);
  return resolved || t_error;
}

function resolveObjectType(t: ObjectType, checker: Checker, token?: Token) {
  t.properties.forEach((type: Type, key: string) => {
    t.properties.set(key, resolveType(type, checker, token));
  });

  return t;
}

function resolveGenericTypeInstance(type: GenericTypeInstance, checker: Checker, token?: Token) {
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

function resolveUnionType(type: UnionType, checker: Checker, token?: Token) {
  for (let i = 0; i < type.types.length; i++) {
    type.types[i] = resolveType(type.types[i], checker, token);
  }

  return type;
}

/**
 * If a 3rd argument is provided, makes the checker throw an error
 * at that Token, else throws a warning.
 * @param message The error message to be displayed.
 * @param checker The checker through the which the error is thrown.
 * @param token?  The token in the source code where the error is thrown.
 */
function errorOrWarn(message: string, checker: Checker, token?: Token) {
  if (token) checker.error(message, token);
  else checker.warn(message);
}
