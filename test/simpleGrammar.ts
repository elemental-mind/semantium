import { InstructionChainElement } from "../source/recording/instructionChain.ts";
import { ContinuesWith, Hybrid, InstructionBlock, InitialInstructionBlock, InstructionChain, StaticInstructionUse, ParametricInstructionUse } from "../source/semantium.ts";

export class StaticBlock extends InitialInstructionBlock<Sequence>
{
    A = ContinuesWith(TransitionBlock, Sequence);
    B = ContinuesWith(TransitionBlock, Sequence);
    C = ContinuesWith(TransitionBlock, Sequence);

    Q = ContinuesWith(Sequence);
    M = ContinuesWith(ComplexMemberBlock);
}

export class ParametricBlock extends InitialInstructionBlock<Sequence>
{
    X = (nmbr: number) => ContinuesWith(TransitionBlock, Sequence);
    Y = (text: string) => ContinuesWith(TransitionBlock, Sequence);
    Z = (toggle: Boolean) => ContinuesWith(TransitionBlock, Sequence);
}

export class HybridBlock extends InitialInstructionBlock<Sequence>
{
    D = Hybrid({
        accessed: ContinuesWith(TransitionBlock),
        called: () => ContinuesWith(TransitionBlock)
    });

    E = Hybrid({
        accessed: () => { this.chain.sequence += "[Modified through hybrid getter handler]"; return ContinuesWith(TransitionBlock); },
        called: (nmbr: number) => { this.chain.sequence += "[Modified through hybrid function handler]"; return ContinuesWith(TransitionBlock); }
    });

    F = Hybrid({
        accessed: ContinuesWith(ComplexMemberBlock, FinalizationBlock),
        called: () => ContinuesWith(TransitionBlock, FinalizationBlock)
    });
}

export class ComplexMemberBlock extends InstructionBlock<Sequence>
{
    foo = (obj: Object) => ContinuesWith(ComplexMemberBlock, TransitionBlock);
    bar = ContinuesWith(ComplexMemberBlock, TransitionBlock);
    get baz() 
    {
        this.chain.sequence += "[Modified through getter handler]";
        return ContinuesWith(StaticBlock);
    }
}

export class TransitionBlock extends InstructionBlock<Sequence>
{
    then = ContinuesWith(StaticBlock, ParametricBlock, HybridBlock, FinalizationBlock);
}

export class FinalizationBlock extends InstructionBlock<Sequence>
{
    result = ContinuesWith(Sequence);
    end = ContinuesWith(Sequence);
}





export class Sequence
{
    sequence = "";
}

export class SequenceRecorder extends InstructionChain<Sequence>
{
    sequence = "";

    onInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse): void
    {
        let instructionString;

        if (instructionUse instanceof ParametricInstructionUse)
            instructionString = `${instructionUse.instruction.word}(${instructionUse.parameters.join(",")})`;
        else
            instructionString = instructionUse.instruction.word;

        if (this.sequence === "")
            this.sequence = instructionString;
        else
            this.sequence = `${this.sequence}.${instructionString}`;
    }
}
