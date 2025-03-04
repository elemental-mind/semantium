import { InstructionDefinition } from "../definition/instructions.ts";
import { Semantic } from "../definition/semantic.ts";

export abstract class InstructionChain<T = any>
{
    public firstElement?: InstructionChainElement;
    public lastElement?: InstructionChainElement;

    constructor(
        public semantic: Semantic<any>
    ) { };

    registerInstructionUseAndReturnContinuations(instructionUse: InstructionChainElement)
    {
        this.addInstruction(instructionUse);
        return this.semantic.triggerInstructionUseHooksAndGetPermittedContinuations(instructionUse, this);
    }

    private addInstruction(instruction: InstructionChainElement)
    {
        instruction.previous = this.lastElement;

        if (!this.firstElement)
            this.firstElement = this.lastElement = instruction;
        else
            this.lastElement = instruction;

        this.onInstruction(instruction);
    }

    fork(forkAfterElement?: InstructionChainElement)
    {
        const forkedChain = this.semantic.generateNewInstructionChain() as InstructionChain<T>;
        forkedChain.replayInstructions(this, forkAfterElement);
        return forkedChain;
    }

    onInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse) { };

    finalizeRecording(): T
    {
        return this as unknown as T;
    };

    protected replayInstructions(copyFrom: InstructionChain<any>, lastIncludedInstructionInReplay?: InstructionChainElement)
    {
        let currentElement = copyFrom.lastElement;
        
        if (lastIncludedInstructionInReplay)
            while (currentElement !== lastIncludedInstructionInReplay)
                currentElement = currentElement?.previous;

        const replayArray : InstructionChainElement[] = [];
        while (currentElement)
        {
            replayArray.push(currentElement);
            currentElement = currentElement.previous;
        }

        let replayElement: InstructionChainElement;
        while (replayElement = replayArray.pop()!)
            this.registerInstructionUseAndReturnContinuations(replayElement);
    }
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
