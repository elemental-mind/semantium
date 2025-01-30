import { InstructionDefinition } from "../definition/instructions.js";
import { Semantic } from "../definition/semantic.js";

export abstract class InstructionChain<T>
{
    public firstElement?: InstructionChainElement;
    public lastElement?: InstructionChainElement;

    constructor(
        public semantic: Semantic
    ) { };

    registerInstructionUseAndReturnContinuations(instructionUse: InstructionChainElement)
    {
        this.addInstruction(instructionUse);

        let permittedContinuations;

        if(instructionUse instanceof StaticInstructionUse)
            permittedContinuations = this.semantic.getPermittedStaticContinuations(instructionUse.instruction, this);

        if(instructionUse instanceof ParametricInstructionUse)
            permittedContinuations = this.semantic.getPermittedParametricContinuations(instructionUse.instruction, this, instructionUse.parameters);

        return permittedContinuations;
    }

    private addInstruction(instruction: InstructionChainElement)
    {
        instruction.previous = this.lastElement;

        if (!this.firstElement)
            this.firstElement = this.lastElement = instruction;
        else
            this.lastElement = instruction;

        if (this.onInstruction)
            this.onInstruction(instruction);
    }

    fork(forkAfterElement: InstructionChainElement): InstructionChain<T>
    {
        let currentElement = this.lastElement;
        while (currentElement !== forkAfterElement)
            currentElement = currentElement?.previous;

        const replayArray = [];
        while (currentElement)
        {
            replayArray.push(currentElement);
            currentElement = currentElement.previous;
        }

        const forkedChain = this.semantic.generateNewInstructionChain();
        let replayElement;
        while (replayElement = replayArray.pop())
            forkedChain.addInstruction(replayElement);

        return forkedChain;
    }

    onInstruction?(instructionUse: StaticInstructionUse | ParametricInstructionUse) { };

    finalizeRecording?(): T
    {
        return this as unknown as T;
    };
}

export abstract class InstructionChainElement
{
    public previous?: InstructionChainElement;

    constructor(
        public instruction: InstructionDefinition
    ) { }
}

export class StaticInstructionUse extends InstructionChainElement { }

export class ParametricInstructionUse extends InstructionChainElement
{
    constructor(
        instruction: InstructionDefinition,
        public parameters: any[]
    )
    {
        super(instruction);
    }
}
