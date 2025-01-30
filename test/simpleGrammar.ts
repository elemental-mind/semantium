import { InstructionBlock, InitialInstructionBlock, InstructionChain, StaticInstructionUse, ParametricInstructionUse } from "../source/semantium.js";

export class StaticBlock extends InitialInstructionBlock<Sequence>
{
    A = [TransitionBlock, Sequence];
    B = [TransitionBlock, Sequence];
    C = [TransitionBlock, Sequence];

    Q = Sequence;
    M = ComplexMemberBlock;
}

export class ParametricBlock extends InitialInstructionBlock<Sequence>
{
    X = (nmbr: number) => [TransitionBlock, Sequence];
    Y = (text: string) => [TransitionBlock, Sequence];
    Z = (toggle: Boolean) => [TransitionBlock, Sequence];
}

export class HybridBlock extends InitialInstructionBlock<Sequence>
{
    D = {
        whenAccessed: ComplexMemberBlock,
        whenCalled: () => TransitionBlock
    };
    
    E = {
        whenAccessed: () => [ComplexMemberBlock],
        whenCalled: (nmbr: number) => TransitionBlock
    };
    
    F = {
        whenAccessed: [ComplexMemberBlock, FinalizationBlock],
        whenCalled: () => [TransitionBlock, FinalizationBlock]
    };
}

export class ComplexMemberBlock extends InstructionBlock<Sequence>
{
    foo = (obj: Object) => [ComplexMemberBlock, TransitionBlock];
    bar = [ComplexMemberBlock, TransitionBlock];
    get baz() { return StaticBlock; }
}

export class TransitionBlock extends InstructionBlock<Sequence>
{
    then = [StaticBlock, ParametricBlock, HybridBlock, FinalizationBlock];
}

export class FinalizationBlock extends InstructionBlock<Sequence>
{
    result = Sequence;
    end = Sequence;
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
        this.sequence += instructionUse instanceof ParametricInstructionUse ? `.${instructionUse.instruction.word}(${instructionUse.parameters.join(",")})` : `.${instructionUse.instruction.word}`;
    }
}
