import { Type, t_any } from './types';

// Function Types
// declared as (p1: t1, p2: t2) => rt

export interface ParameterTypeInfo {
  type: Type;
  required: boolean;
  spread?: boolean;
  hasDefault?: boolean;
}

export default class FunctionType extends Type {
  readonly params: ParameterTypeInfo[];
  readonly returnType: Type = t_any;

  constructor(name: string, params?: ParameterTypeInfo[]) {
    super(name);
    this.params = params || [];
  }

  addParam(type: Type, required: boolean, hasDefault?: boolean) {
    this.params.push({
      type,
      required,
      hasDefault,
    });
  }
}

export const t_Function = new FunctionType('Function', [
  {
    type: t_any,
    required: false,
    spread: true,
  },
]);
