import { FusionOf } from "fusium-js";
import { Beginning, Finishing, InstructionBlock, InstructionRecorder } from "../source/semantium.js";
import { Instruction, Semantics } from "../source/components/definition.js";

//#region Language Blocks

export class BaseBlock extends FusionOf(Beginning, Finishing, InstructionBlock<Sequence>)
{
    A = TransitionBlock;
    B = TransitionBlock;
    C = TransitionBlock;

    M = ModifierBlock;

    X = (nmbr: number) => TransitionBlock;
    Y = (string: number) => TransitionBlock;
    Z = (bool: Boolean) => TransitionBlock;
}

export class AdditionalInitialBlock extends FusionOf(Beginning, InstructionBlock<Sequence>)
{
    Additional = TransitionBlock;
}

export class ModifierBlock extends InstructionBlock<Sequence>
{
    add = (obj: Object) => [ModifierBlock, TransitionBlock];
    register = [ModifierBlock, TransitionBlock];

    get toBase() { return BaseBlock; }
}

export class TransitionBlock extends InstructionBlock<Sequence>
{
    then = BaseBlock;
}

//#endregion

export class Sequence extends InstructionRecorder<Sequence>
{
    sequence = "";

    onAddInstruction(instruction: Instruction, instructionParameters?: any[]): void
    {
        this.sequence += instructionParameters ? `.${instruction.word}(${instructionParameters.join(",")})` : `.${instruction.word}`;
    }
}

export const dictionary = Semantics.Define([BaseBlock, ModifierBlock, TransitionBlock], Sequence);

export const {
    A, B, C, M, X, Y, Z
} = dictionary;
