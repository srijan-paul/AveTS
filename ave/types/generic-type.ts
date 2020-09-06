import TokenType = require('../lexer/tokentype');
import { isValidAssignment, Type, unresolvedType } from './types';

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

  public create(...t: Type[]): GenericTypeInstance {
    if (t.length != this.typeParams.length)
      throw new Error('incorrect number of arguments to generic type.');
    let instance = new GenericTypeInstance(`${this.tag}`, this.id, ...t);

    this.properties.forEach((type: Type, name: string) => {
      let _type = type.clone(); // TODO: remove the clone
      // replace all T, U, K etc with actual types
      // arguments.
      this.typeParams.forEach(
        (e, i) => (_type = _type.substitute(e, this.typeParams[i]))
      );

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
}

export class GenericTypeInstance extends Type {
  readonly typeCount: number;
  readonly types: Type[];
  readonly parentId: number;
  isPrimitive = false;

  static areEquivalent(
    t1: GenericTypeInstance,
    t2: GenericTypeInstance
  ): boolean {
    if (t1.parentId != t2.parentId || t1.typeCount != t2.typeCount)
      return false;

    for (let i = 0; i < t1.types.length; i++) {
      if (t2.types[i] != t1.types[i]) return false;
    }

    return true;
  }

  static canAssign(t1: GenericTypeInstance, t2: GenericTypeInstance) {
    if (t1.parentId != t2.parentId || t1.typeCount != t2.typeCount)
      return false;

    for (let i = 0; i < t1.types.length; i++) {
      if (!isValidAssignment(t1.types[i], t2.types[i], TokenType.EQ))
        return false;
    }

    return true;
  }

  constructor(tag: string, parentId: number, ...t: Type[]) {
    super(tag);
    this.typeCount = t.length;
    this.types = t;
    this.parentId = parentId;
  }

  canAssign(t: Type): boolean {
    if (t instanceof GenericTypeInstance) {
      return GenericTypeInstance.canAssign(this, t);
    }

    // if it has all the properties
    // and methods defined in the interface
    // then it can be assigned.
    this.properties.forEach((type: Type, name: string) => {
      if (!t.hasProperty(name)) return false;
      let prop = <Type>t.getProperty(name);
      if (!type.canAssign(prop)) return false;
    });

    return true;
  }

  toString() {
    return `${this.tag}<${this.types.map(e => e.toString()).join(',')}>`;
  }
}

export const t_Array = new GenericType('Array', [unresolvedType('T')]);
