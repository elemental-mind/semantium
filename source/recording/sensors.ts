import { InstructionDefinition } from "../definition/instructions.js";
import { InstructionBlock, Semantic } from "../definition/semantic.js";
import { InstructionChain, InstructionChainElement, StaticInstructionUse, ParametricInstructionUse } from "./instructionChain.js";

export const SensorSym = Symbol();

export class Sensor
{
    protected requiresFork = false;
    protected origin?: InstructionChainElement;

    protected constructor(
        protected chain: InstructionChain<any>,
    )
    {
        this.origin = this.chain.lastElement;
    }

    public replaceChain(replacementChain: InstructionChain<any>)
    {
        this.chain = replacementChain;
        this.origin = replacementChain.lastElement;
    }

    protected checkMultiAccessAndForkChainIfNecessary(): InstructionChain<any>
    {
        let chain = this.chain;

        if (this.requiresFork)
            chain = this.chain.fork(this.origin);
        else
            this.requiresFork = true;

        return chain;
    }

    protected resolveNextSensor(chain: InstructionChain<any>, permittedContinuations: Array<typeof InstructionBlock<any>>, selectedInstruction: string)
    {
        const instruction = chain.semantic.findInstructionDefinition(permittedContinuations, selectedInstruction);

        if (!instruction)
            throw new Error("Unknown instruction: " + selectedInstruction);

        return instruction.getSensor(chain);
    }
}

export class RootSensor extends Sensor
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
        super(baseChain ?? semantic.generateNewInstructionChain());
    }

    get(base: any, property: string | symbol)
    {
        if(property === SensorSym)
            return this;

        return this.resolveNextSensor(this.chain.fork(), this.chain.semantic.initBlocks, property as string);
    }

    has(target: any, property: string)
    {
        return this.chain.semantic.findInstructionDefinition(this.chain.semantic.initBlocks, property) != undefined;
    }

    ownKeys(target: any)
    {
        const propNames = this.chain.semantic.initBlocks
            .map(block => this.chain.semantic.blockInstances.get(block)!)
            .flatMap(blockInstance => Object.keys(blockInstance));

        return propNames;
    }
}
export class NextInstructionSensor extends Sensor
{
    static Create(chain: InstructionChain<any>, permittedContinuations: Array<typeof InstructionBlock<any>>)
    {
        return new Proxy({}, new NextInstructionSensor(chain, permittedContinuations));
    }

    protected constructor(
        chain: InstructionChain<any>,
        private permittedContinuations: Array<typeof InstructionBlock<any>>,
    )
    {
        super(chain);
    }

    get(object: any, property: string | symbol)
    {
        if(property === SensorSym)
            return this;

        const chain = this.checkMultiAccessAndForkChainIfNecessary();
        return this.resolveNextSensor(chain, this.permittedContinuations, property as string);
    }

    apply()
    {
        throw new Error("Not expecting parameters at this point.");
    }
}

export class ParameterSensor extends Sensor
{
    static Create(chain: InstructionChain<any>, instruction: InstructionDefinition)
    {
        return new Proxy(function () { }, new ParameterSensor(chain, instruction));
    }

    private constructor(
        chain: InstructionChain<any>,
        private instruction: InstructionDefinition
    )
    {
        super(chain);
    }

    get(target: object, property: string | symbol)
    {
        if(property === SensorSym)
            return this;

        throw new Error("Parameters expected here!");
    }

    apply(target: any, thisArg: any, argArray: any[]): any
    {
        const chain = this.checkMultiAccessAndForkChainIfNecessary();
        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new ParametricInstructionUse(this.instruction, argArray));
        return NextInstructionSensor.Create(chain, permittedContinuations);
    }
}

export class HybridSensor extends Sensor
{
    static Create(chain: InstructionChain<any>, instruction: InstructionDefinition)
    {
        return new Proxy(function () { }, new HybridSensor(chain, instruction));
    }

    private constructor(
        chain: InstructionChain<any>,
        private instruction: InstructionDefinition
    )
    {
        super(chain);
    }

    get(target: any, property: string | symbol)
    {
        if(property === SensorSym)
            return this;

        const chain = this.checkMultiAccessAndForkChainIfNecessary();

        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new StaticInstructionUse(this.instruction));

        return this.resolveNextSensor(chain, permittedContinuations, property as string);
    }

    apply(target: any, thisArg: any, argArray: any[]): any
    {
        const chain = this.checkMultiAccessAndForkChainIfNecessary();

        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new ParametricInstructionUse(this.instruction, argArray));

        return NextInstructionSensor.Create(chain, permittedContinuations);
    }
}
