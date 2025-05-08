import type { ParametricInstructionUse, StaticInstructionUse } from "../recording/instructionChain.ts";

type AnyConstructor = new (...args: any[]) => any;
type ConstructorTuple = ReadonlyArray<AnyConstructor>;
type MapConstructorsToInstances<T extends ConstructorTuple> = { [K in keyof T]: T[K] extends AnyConstructor ? InstanceType<T[K]> : never; };
type Intersect<Tuple> = Tuple extends [infer Head, ...infer Tail] ? Head & Intersect<Tail> : unknown;

type HybridDefinition<AccessedType, CalledType extends Function> = {
    accessed: AccessedType,
    called: CalledType,
};

export class InstructionBlock<T> 
{
    //@ts-ignore
    protected chain!: T = null;

    onInstructionUse(instructionUseData: StaticInstructionUse | ParametricInstructionUse) { }
}

export class InitialInstructionBlock<T> extends InstructionBlock<T>
{
    //We declare a virtual member here solely for type matching purposes.
    declare private _initInstructionBlock: void;
}

export function ContinuesWith<T extends ConstructorTuple>(...constructors: T)
{
    return constructors as Intersect<MapConstructorsToInstances<T>>;
}

export function Hybrid<AccessedType, CalledType extends Function>(definition: HybridDefinition<AccessedType, CalledType>)
{
    return definition as unknown as AccessedType & CalledType;
}