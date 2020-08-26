export default class SymbolTable {
  private readonly mSymbols : Map<string, any>
  
  constructor() {
    this.mSymbols = new Map();
  }

  define(name: string, data: any): boolean {
    if (this.mSymbols.has(name)) return false;
    this.mSymbols.set(name, data);
    return true;
  }

  has(name: string): boolean {
    return this.mSymbols.has(name);
  }

  undefine(name: string) {
    this.mSymbols.delete(name);
  }
}