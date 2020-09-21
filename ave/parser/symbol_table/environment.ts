import { Type } from '../../types/types';
import SymbolTable, { SymbolData } from './symtable';

/* Environment:
  An Enviroment is a mapping of a name (string) to some 
  metadata that the type checker needs.
  the metadata here, is :
    data type of the symbol (declType),
    current data type of the symbol (currentType),
    type of declaration (block/function scoped/ constant)
    variable name / name of the symbol (name)
*/

export default class Environment {
  private readonly symTable: SymbolTable;
  private readonly parent: Environment | null;
  private child?: Environment;
  private typedefs: Map<string, Type> = new Map();

  constructor(parent?: Environment) {
    this.symTable = new SymbolTable();
    this.parent = parent || null;
  }

  extend(): Environment {
    this.child = new Environment(this);
    return this.child;
  }

  pop(): Environment {
    if (!this.parent) throw new Error('attempt to pop root environment.');
    return <Environment>this.parent;
  }

  /**
   * 
   * @param name {string}     Name of the symbol.
   * @param data {SymbolData} The data assosciated with the symbol.
   */

  define(name: string, data: SymbolData): boolean {
    return this.symTable.define(name, data);
  }

  has(name: string) {
    return this.symTable.has(name);
  }

  defineType(name: string, t: Type) {
    this.typedefs.set(name, t);
  }

  undefineType(name: string) {
    this.typedefs.delete(name);
  }

  find(name: string): SymbolData | null {
    if (this.symTable.has(name)) {
      return <SymbolData>this.symTable.get(name);
    }

    if (this.parent) return this.parent.find(name);
    return null;
  }

  findType(name: string): Type | null {
    if (this.typedefs.has(name)) {
      return <Type>this.typedefs.get(name);
    }
    if (this.parent) return this.parent.findType(name);
    return null;
  }

  undefine(name: string) {
    this.symTable.undefine(name);
  }
}
