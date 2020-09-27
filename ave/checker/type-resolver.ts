import Token from '../lexer/token';
import FunctionType from '../types/function-type';
import GenericType, { GenericTypeInstance } from '../types/generic-type';
import ObjectType from '../types/object-type';
import { Type, t_error, t_undef } from '../types/types';
import UnionType from '../types/union-type';
import Checker from './checker';


export default class TypeResolver {
  private checker: Checker;
  // a cache that keeps track of objects that have already been visited 
  // to avoid infinitely recursing over recursing type definitions
  private visitedObjectTypes: Set<ObjectType> = new Set();

  constructor(checker: Checker) {
    this.checker = checker;
  }

  /**
   * If a 3rd argument is provided, makes the checker throw an error
   * at that Token, else throws a warning.
   * @param {string}  message The error message to be displayed.
   * @param {Checker} checker The checker through the which the error is thrown.
   * @param {Token}  token (?)  The token in the source code where the error is thrown.
   */

  private errorOrWarn(message: string, token?: Token) {
    if (token) this.checker.error(message, token);
    else this.checker.warn(message);
  }

  /**
   * Resolves a type. If the type is marked as 'unresolved' it
   * looks for the type in the checker's environment chain.
   * If the type cannot be resolved then an error is thrown pointing to the
   * provided token (if any).
   * @param type    {Type}    The type to resolve.
   * @param checker {Checker} The type checker to use.
   * @param token?  {Token}   The token at which the error to thrown when found.
   */

  public resolveType(type: Type, token?: Token): Type {
    if (type == null) throw new Error('Unhandled type edge case');

    if (type.isPrimitive) return this.resolvePrimitive(type, token);
    if (type instanceof UnionType) return this.resolveUnion(type, token);
    if (type instanceof GenericTypeInstance) return this.resolveGenericInstance(type, token);
    if (type instanceof ObjectType) return this.resovleObjectType(type, token);
    if (type instanceof FunctionType) return this.resolveFunctionType(type, token);
    return t_undef;
  }

  private resolvePrimitive(type: Type, token?: Token) {
    if (!type.unresolved) return type;
    let resolved = this.checker.env.findType(type.tag);
    if (!resolved) this.errorOrWarn(`Cannot find type '${type.toString()}'`, token);
    return resolved || t_error;
  }

  private resolveUnion(type: UnionType, token?: Token): UnionType {
    for (let i = 0; i < type.types.length; i++) {
      type.types[i] = this.resolveType(type.types[i], token);
    }

    return type;
  }

  private resolveFunctionType(t: FunctionType, token?: Token): FunctionType {
    for (let p of t.params) {
      p.type = this.resolveType(p.type, token);
    }

    t.returnType = this.resolveType(t.returnType, token);

    return t;
  }

  private resovleObjectType(t: ObjectType, token?: Token): ObjectType {
    if (this.visitedObjectTypes.has(t)) return t;
    this.visitedObjectTypes.add(t);
    
    t.properties.forEach((type: Type, key: string) => {
      t.properties.set(key, this.resolveType(type, token));
    });

    t.unresolved = false;
    return t;
  }

  private resolveGenericInstance(type: GenericTypeInstance, token?: Token): Type {
    let resolved = this.checker.env.findType(type.tag);

    if (!resolved) {
      const message = `Cannot find type name '${type}'`;
      this.errorOrWarn(message, token);
      return t_undef;
    }

    if (!(resolved instanceof GenericType)) {
      const message = `type '${type}' does not take any type arguments`;
      this.errorOrWarn(message, token);
      return t_undef;
    }

    let args = [];
    for (let i = 0; i < type.typeArgs.length; i++) {
      args.push(this.resolveType(type.typeArgs[i], token));
    }

    return resolved.create(...args);
  }
}
