import TokenType = require("../lexer/tokentype");
import ObjectType from "./object-type";
import { Type, unresolvedType } from "./types";

type TypeCacheEntry = [Type[], ObjectType];

class TypeCache {
  private entries: TypeCacheEntry[] = [];

  private keyMatches(k1: Type[], k2: Type[]) {
    if (k1.length != k2.length) return false;

    for (let i = 0; i < k1.length; i++) {
      if (k1[i] != k2[i]) return false;
    }

    return true;
  }

  public add(typeArgs: Type[], type: ObjectType) {
    this.entries.push([typeArgs, type]);
  }

  public get(typeArgs: Type[]): ObjectType | null {
    for (let entry of this.entries) {
      const key = entry[0];
      const value = entry[1];
      if (this.keyMatches(key, typeArgs)) return value;
    }

    return null;
  }
}

export default class GenericType extends Type {
  public readonly isPrimitive = false;
  private readonly instanceCache: TypeCache = new TypeCache();
  public readonly typeParams: Type[] = [];

  static areEquivalent(t1: GenericType, t2: GenericType) {
    return t1.id == t2.id;
  }

  constructor(tag: string, typeParams: Type[]) {
    super(tag);
    this.typeParams = typeParams.map((t) => {
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

  public create(...typeArgs: Type[]): ObjectType {
    if (typeArgs.length != this.typeParams.length)
      throw new Error("incorrect number of arguments to generic type.");

    let cached = this.instanceCache.get(typeArgs);
    if (cached != null) return cached;

    let instance = new ObjectType(this.tag, typeArgs);

    this.properties.forEach((type: Type, name: string) => {
      let _type = type.clone(); // TODO: remove the clone

      // First it needs to replace any recursive references to itself.
      // For example, in the following code snippet:
      // ```
      // record LLNode<T>
      //   next: LLNode<T> | nil
      //   value: T
      // ```
      // when we "create" an instance of this object type :
      // ```
      // let a: Foo<num> =
      //    next: nil
      //    value: 123
      // ```
      // As soon as the checker sees the `Foo<num>`, it will
      // try to instantiate the type by calling this `create` method
      // with t_num as an argument. The way we get around the recursion
      // is in the substitution part, We replace all mentions of any
      // ObjectType with the tag "Foo" , which is generic and has
      // the type arguments which match the ones provided to this method
      // (in this case, `t_num`), by a reference to
      // itself.
      //
      // to account for this special case in substitution, we add an `if` check
      // in the `GenericTypeInstance`'s susbtitute method.

      // replace all T, U, K etc with actual types
      // arguments.
      this.typeParams.forEach(
        (e, i) => (_type = _type.substitute(e, typeArgs[i]))
      );

      _type = _type.substitute(instance, instance); // This function call may seem weird
      // so here is an explanation:
      // the way type substitution works with objects is, if both the paramters
      // are generic objects (which in this case, they will be), the first argument
      // is treated as a type to check for similarity against, and the second type
      // is treated as the type to replace it with.
      //
      // So what we are saying by calling `_type.substitute(Foo<T>, Foo<T>)` is:
      // replace any ObjecType that has the tag `Foo` and type argument 'T' with
      // a *reference* to the actual Foo<T> that we are building here, hence completing
      // the recursive type.
      instance.defineProperty(name, _type);
    });

    this.instanceCache.add(typeArgs, instance);
    return instance;
  }

  public hasTypeParam(t: Type): boolean {
    return this.typeParams.includes(t);
  }

  public getTypeParam(t: Type): Type | null {
    return this.typeParams[this.typeParams.indexOf(t)] || null;
  }

  public toString() {
    return `${this.tag}<${this.typeParams.join(", ")}>`;
  }
}

// This represents the "instance" of a generic type.
// For example, A possible instance of Array<T> is Array<str>

export class GenericTypeInstance extends ObjectType {
  public isPrimitive = false;
  public readonly typeArgs: Type[];

  constructor(tag: string, args: Type[]) {
    super(tag);
    this.typeArgs = args;
  }

  public clone() {
    let args = this.typeArgs.map((t) => t.clone());
    return new GenericTypeInstance(this.tag, args);
  }

  public susbtitute(ta: Type, tb: Type) {
    // this if check accounts for when we are
    // attempting to replace recursive type references.
    // For mroe information, see the comment in 'create'
    // method at 'generic-type.ts
    if (ta instanceof ObjectType && this.matches(ta)) {
      return tb;
    }

    let copy = this.clone();

    for (let i = 0; i < copy.typeArgs.length; i++) {
      copy.typeArgs[i] = copy.typeArgs[i].substitute(ta, tb);
    }
    return copy;
  }

  public toString() {
    return `${this.tag}<${this.typeArgs.join(", ")}>`;
  }
}

export const t_Array = new GenericType("Array", [unresolvedType("T")]);
