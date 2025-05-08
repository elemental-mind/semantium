import { InstructionChain, StaticInstructionUse } from "../recording/instructionChain.ts";
import { HybridSensor, InstructionSensor, ParameterSensor } from "../recording/sensors.ts";
import { InstructionBlock } from "./definitionAPI.ts";
import type { Semantic } from "./semantic.ts";

export abstract class InstructionDefinition
{
    static From(
        semantic: Semantic<any, any, any>,
        family: typeof InstructionBlock<any>,
        blockInstance: InstructionBlock<any>,
        word: string)
    {
        const definition: any = blockInstance[word as keyof InstructionBlock<any>];

        if ("acessed" in definition && "called" in definition)
            return new HybridInstructionDefinition(semantic, family, word);
        if (definition instanceof Array || (typeof definition === "function" && definition.prototype instanceof InstructionBlock) || definition === semantic.definition.result)
            return new StaticInstructionDefinition(semantic, family, word);
        if (typeof definition === "function")
            return new ParametricInstructionDefinition(semantic, family, word);
        else
            throw new Error("Unsupported definition member!");
    }

    constructor(public readonly semantic: Semantic<any, any, any>, public readonly family: typeof InstructionBlock<any>, public readonly word: string) { }

    abstract getSensor(chain: InstructionChain<any>): any;
}

export class StaticInstructionDefinition extends InstructionDefinition
{
    getSensor(chain: InstructionChain<any>): any
    {
        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new StaticInstructionUse(this));
        return InstructionSensor.FromContinuations(chain, permittedContinuations);
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