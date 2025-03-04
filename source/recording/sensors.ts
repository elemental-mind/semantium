import { InstructionDefinition } from "../definition/instructions.ts";
import { AccessType, ContinuationSet, Semantic } from "../definition/semantic.ts";
import { InstructionChain, InstructionChainElement, StaticInstructionUse, ParametricInstructionUse } from "./instructionChain.ts";

export const SensorSym = Symbol();

export class InstructionSensor
{
    protected origin?: InstructionChainElement;
    protected requiresFork = false;
    protected finalizationResult?: any;

    static FromContinuations(chain: InstructionChain<any>, permittedContinuations: ContinuationSet)
    {
        return new Proxy({}, new InstructionSensor(chain, permittedContinuations));
    }

    protected constructor(
        protected chain: InstructionChain<any>,
        protected permittedContinuations: ContinuationSet
    )
    {
        this.origin = this.chain.lastElement;
    }

    public replaceChain(replacementChain: InstructionChain<any>)
    {
        this.chain = replacementChain;
        this.origin = replacementChain.lastElement;
    }

    protected resolveApplicableChain(): InstructionChain<any>
    {
        if (this.requiresFork)
            return this.chain.fork(this.origin);

        this.requiresFork = true;
        return this.chain;
    }

    protected resolveResult()
    {
        this.finalizationResult = this.chain.finalizeRecording();

        return this.finalizationResult;
    }

    get(object: any, property: string | symbol)
    {
        if (property === SensorSym)
            return this;

        const accessResolution = this.permittedContinuations.resolvePropertyAccess(property as string);

        switch (accessResolution.type)
        {
            case AccessType.Instruction:
                const chain = this.resolveApplicableChain();
                return accessResolution.instruction!.getSensor(chain);
            case AccessType.Result:
                return this.resolveResult()[property];
            default:
                throw new Error("Unknown instruction: " + <string>property);
        }
    }

    apply(target: any, thisArg: any, argArray: any[])
    {
        throw new Error("Not expecting parameters at this point.");
    }

    has(target: any, property: string)
    {
        return this.ownKeys().includes(property);
    }

    ownKeys()
    {
        return [...this.permittedContinuations.instructions.keys()];
    }

    getOwnPropertyDescriptor(target: any, property: string)
    {
        const block = this.permittedContinuations.blockTypes
            .map(blockType => this.chain.semantic.blocks.get(blockType)!.instance)
            .find((block: any) => block[property] !== undefined);

        return Object.getOwnPropertyDescriptor(block, property);
    }
}

export class RootSensor extends InstructionSensor
{
    static Create(semantic: Semantic<any>, chain?: InstructionChain<any>)
    {
        return new Proxy({}, new RootSensor(semantic, chain));
    }

    private constructor(
        semantic: Semantic<any>,
        baseChain?: InstructionChain<any>
    )
    {
        super(baseChain ?? semantic.generateNewInstructionChain(), new ContinuationSet(semantic, semantic.initBlocks));
    }

    override get(base: any, property: string | symbol)
    {
        if (property === SensorSym)
            return this;

        const accessResolution = this.permittedContinuations.resolvePropertyAccess(property as string);

        switch (accessResolution.type)
        {
            case AccessType.Instruction:
                const chain = this.chain.fork();
                return accessResolution.instruction!.getSensor(chain);
            default:
                throw new Error("Unknown instruction: " + <string>property);
        }
    }
}

abstract class ParameterCapturing extends InstructionSensor
{
    protected constructor(
        chain: InstructionChain<any>,
        protected instruction: InstructionDefinition
    )
    {
        super(chain, new ContinuationSet(chain.semantic, []));
    }

    override apply(target: any, thisArg: any, argArray: any[]): any
    {
        const chain = this.resolveApplicableChain();
        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new ParametricInstructionUse(this.instruction, argArray));
        return InstructionSensor.FromContinuations(chain, permittedContinuations);
    }
}

export class ParameterSensor extends ParameterCapturing
{
    static Create(chain: InstructionChain<any>, instruction: InstructionDefinition)
    {
        return new Proxy(function () { }, new ParameterSensor(chain, instruction));
    }

    override get(target: object, property: string | symbol)
    {
        if (property === SensorSym)
            return this;

        throw new Error("Parameters expected here!");
    }
}

export class HybridSensor extends ParameterCapturing
{
    static Create(chain: InstructionChain<any>, instruction: InstructionDefinition)
    {
        return new Proxy(function () { }, new HybridSensor(chain, instruction));
    }

    override get(target: any, property: string | symbol)
    {
        if (property === SensorSym)
            return this;

        //Unlike with the other sensors, when we instantiate a Hybrid Sensor, we do not update the chain upon creation of the sensor, as we
        //don't know yet which instruction use will follow (either a parametric one or a static one). Thus, we need to do this now.
        //We are in this trap because API.static.static.hybrid.<TRIGGERINGACCESS> is accessed.
        //Our sensor sits at API.static.static.hybrid. But the chain is only updated to API.static.static.
        const chain = this.resolveApplicableChain();
        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new StaticInstructionUse(this.instruction));

        //Now the chain is updated to API.static.static.hybrid

        //We still need to actually process the <TRIGGERINGACCESS> access.
        const accessResolution = permittedContinuations.resolvePropertyAccess(property as string);

        switch (accessResolution.type)
        {
            case AccessType.Instruction:
                return accessResolution.instruction!.getSensor(chain);
            case AccessType.Result:
                return this.resolveResult()[property];
            default:
                throw new Error("Unknown instruction: " + <string>property);
        }
    }
}
