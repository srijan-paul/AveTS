import TokenType = require('../lexer/tokentype');
import ObjectType from './object-type';
import { Type, unresolvedType } from './types';

export default class GenericType extends Type {
  readonly isPrimitive = false;
  public readonly typeParams: Type[] = [];

  static areEquivalent(t1: GenericType, t2: GenericType) {
    return t1.id == t2.id;
  }

  constructor(tag: string, typeParams: Type[]) {
    super(tag);
    this.typeParams = typeParams.map(t => {
      // generic type parameters
      // are assumed to be resolved.
      t.unresolved = false;
      return t;
    });
  }

  public canAssign(t: Type): boolean {
    if (t instanceof GenericType) {
      return GenericType.areEquivalent(this, t);
    }
    return false;
  }

  public create(...t: Type[]): ObjectType {
    if (t.length != this.typeParams.length)
      throw new Error('incorrect number of arguments to generic type.');
    let instance = new ObjectType(`${this.tag}`);

    this.properties.forEach((type: Type, name: string) => {
      let _type = type.clone(); // TODO: remove the clone
      // replace all T, U, K etc with actual types
      // arguments.
      this.typeParams.forEach((e, i) => (_type = _type.substitute(e, t[i])));

      instance.defineProperty(name, _type);
    });
    return instance;
  }

  public hasTypeParam(t: Type): boolean {
    return this.typeParams.includes(t);
  }

  public getTypeParam(t: Type): Type | null {
    return this.typeParams[this.typeParams.indexOf(t)] || null;
  }

  public toString() {
    return `${this.tag}<${this.typeParams.join(', ')}>`;
  }
}

// This represents the "instance" of a generic type.
// For example, A possible instance of Array<T> is Array<str>

export class GenericTypeInstance extends Type {
  public isPrimitive = false;
  public readonly typeArgs: Type[];

  constructor(tag: string, args: Type[]) {
    super(tag);
    this.typeArgs = args;
  }

  public clone() {
    let args = this.typeArgs.map(t => t.clone());
    return new GenericTypeInstance(this.tag, args);
  }

  public susbtitute(ta: Type, tb: Type) {
    let copy = this.clone();

    for (let i = 0; i < copy.typeArgs.length; i++) {
      copy.typeArgs[i] = copy.typeArgs[i].substitute(ta, tb);
    }
    return copy;
  }

  public toString() {
    return `${this.tag}<${this.typeArgs.join(', ')}>`;
  }
}

export const t_Array = new GenericType('Array', [unresolvedType('T')]);
