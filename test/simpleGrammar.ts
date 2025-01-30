import { InstructionBlock, InitialInstructionBlock, InstructionChain, StaticInstructionUse, ParametricInstructionUse } from "../source/semantium.js";

//#region Language Blocks

export class BaseBlock extends InitialInstructionBlock<Sequence>
{
    A = [TransitionBlock, Sequence];
    B = [TransitionBlock, Sequence];
    C = [TransitionBlock, Sequence];

    Q = Sequence;
    M = ComplexMemberBlock;

    X = (nmbr: number) => [TransitionBlock, Sequence];
    Y = (string: number) => [TransitionBlock, Sequence];
    Z = (bool: Boolean) => [TransitionBlock, Sequence];
}

export class MultiInitTestBlock extends InitialInstructionBlock<Sequence>
{
    DummyMember = TransitionBlock;
}

export class ComplexMemberBlock extends InstructionBlock<Sequence>
{
    add = (obj: Object) => [ComplexMemberBlock, TransitionBlock];
    register = [ComplexMemberBlock, TransitionBlock];

    get toBase() { return BaseBlock; }
}

export class TransitionBlock extends InstructionBlock<Sequence>
{
    then = BaseBlock;
}

//#endregion

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
