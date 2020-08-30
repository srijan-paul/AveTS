import { Type } from "./types";

export default class ArrayType extends Type {
    // type of the element stored in this array.
    readonly elType: Type;
    readonly isArray = true;
    
    constructor(el : Type) {
        super(`Array<${el.tag}>`);
        this.elType = el;
    }
}