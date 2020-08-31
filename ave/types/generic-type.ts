import { Type } from './types';

export default class GenericType extends Type {
  readonly paramTypeCount: number;
  readonly isPrimitive = false;

  static areEquivalent(t1: GenericType, t2: GenericType) {
    return t1.id == t2.id;
  }

  constructor(tag: string, n: number) {
    super(tag);
    this.paramTypeCount = n;
  }

  create(...t: Type[]): GenericTypeInstance {
    if (t.length != this.paramTypeCount)
      throw new Error('incorrect number of arguments to generic type.');
    return new GenericTypeInstance(`${this.tag}`, this.id, ...t);
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

  constructor(tag: string, parentId: number, ...t: Type[]) {
    super(tag);
    this.typeCount = t.length;
    this.types = t;
    this.parentId = parentId;
  }

  toString() {
    return `${this.tag}<${this.types.map(e => e.toString()).join(',')}>`;
  }
}

export const t_Array = new GenericType('Array', 1);
