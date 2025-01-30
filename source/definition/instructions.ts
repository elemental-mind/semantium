import { InstructionChain, StaticInstructionUse } from "../recording/instructionChain.js";
import { HybridSensor, NextInstructionSensor, ParameterSensor } from "../recording/sensors.js";
import { InstructionBlock, Semantic } from "./semantic.js";

export abstract class InstructionDefinition
{
    static From(
        semantic: Semantic,
        family: typeof InstructionBlock<any>,
        word: string)
    {
        const definition: any = semantic.blockInstances.get(family)![word as keyof InstructionBlock<any>];

        if ("whenAccessed" in definition && "whenCalled" in definition)
            return new HybridInstructionDefinition(semantic, family, word);
        if (definition instanceof Array || (typeof definition === "function" && definition.prototype instanceof InstructionBlock))
            return new StaticInstructionDefinition(semantic, family, word);
        if (typeof definition === "function")
            return new ParametricInstructionDefinition(semantic, family, word);
        else
            throw new Error("Unsupported definition member!");
    }

    constructor(public readonly semantic: Semantic, public readonly family: typeof InstructionBlock<any>, public readonly word: string) { }

    abstract getSensor(chain: InstructionChain<any>): any;
}

export class StaticInstructionDefinition extends InstructionDefinition
{
    getSensor(chain: InstructionChain<any>): any
    {
        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new StaticInstructionUse(this));
        return NextInstructionSensor.Create(chain, permittedContinuations);
    }
}

export class ParametricInstructionDefinition extends InstructionDefinition
{
    getSensor(chain: InstructionChain<any>): any
    {
        return ParameterSensor.Create(chain, this);
    }
}

export class HybridInstructionDefinition extends InstructionDefinition
{
    getSensor(chain: InstructionChain<any>): any
    {
        return HybridSensor.Create(chain, this);
    }
}