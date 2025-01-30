import { InstructionDefinition } from "../definition/instructions.js";
import { InstructionBlock, Semantic } from "../definition/semantic.js";
import { InstructionChain, InstructionChainElement, StaticInstructionUse, ParametricInstructionUse } from "./instructionChain.js";

class Sensor
{
    protected requiresFork = false;
    protected origin: InstructionChainElement;

    protected constructor(
        protected chain: InstructionChain<any>,
    )
    {
        this.origin = this.chain.lastElement!;
    }

    protected checkMultiAccessAndForkChainIfNecessary(): InstructionChain<any>
    {
        let chain = this.chain;

        if (this.requiresFork)
        {
            if (this.chain.fork)
            {
                chain = this.chain.fork(this.origin);
            }
        } else
        {
            this.requiresFork = true;
        }

        return chain;
    }

    protected resolveNextSensor(chain: InstructionChain<any>, permittedContinuations: Array<typeof InstructionBlock<any>>, selectedInstruction: string)
    {
        const instruction = chain.semantic.findInstructionDefinition(permittedContinuations, selectedInstruction)!;

        return instruction.getSensor(chain);
    }
}

export class RootSensor
{
    static Create(semantic: Semantic, chain?: any)
    {
        return new Proxy({}, new RootSensor(semantic, chain));
    }

    private constructor(
        public semantic: Semantic,
        public instructionChain?: any
    ) { }

    get(base: any, property: string)
    {
        const instructionDefinition = this.semantic.findInstructionDefinition(this.semantic.initBlocks, property);

        if (!instructionDefinition)
            throw new Error("Instruction is not an initial instruction!");

        const chain = this.getInstructionChainInstance();

        return instructionDefinition.getSensor(chain);
    }

    private getInstructionChainInstance()
    {
        if (this.instructionChain)
            return this.instructionChain;
        else
            return this.semantic.generateNewInstructionChain();
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

    get(object: any, property: string)
    {
        const chain = this.checkMultiAccessAndForkChainIfNecessary();
        return this.resolveNextSensor(chain, this.permittedContinuations, property);
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

    get()
    {
        throw new Error("Parameters expected here!");
    }

    apply(target: any, thisArg: any, argArray: any[]): any
    {
        const chain = this.checkMultiAccessAndForkChainIfNecessary();
        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new ParametricInstructionUse(this.instruction, argArray))
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

    get(target: any, property: string)
    {
        const chain = this.checkMultiAccessAndForkChainIfNecessary();

        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new StaticInstructionUse(this.instruction))

        return this.resolveNextSensor(chain, permittedContinuations, property);
    }

    apply(target: any, thisArg: any, argArray: any[]): any
    {
        const chain = this.checkMultiAccessAndForkChainIfNecessary();

        const permittedContinuations = chain.registerInstructionUseAndReturnContinuations(new ParametricInstructionUse(this.instruction, argArray))

        return NextInstructionSensor.Create(chain, permittedContinuations);
    }
}