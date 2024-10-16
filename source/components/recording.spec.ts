import assert from "assert";
import { A, B, X, M, Sequence } from "../../test/simpleGrammar.js";
import { InstructionRecorder } from "./recording.js";
import { Beginning, Finishing, Instruction, InstructionBlock } from "./definition.js";
import { Semantics } from "../semantium.js";
import { BaseBlock, ModifierBlock, TransitionBlock } from "../../test/simpleGrammar.js";
import { FusionOf } from "fusium-js";

export class InitializationTests
{
    shouldYieldNewInstanceOnEveryCallToInitial()
    {
        const seq1 = A.then.B;
        const seq2 = A.then.B;
        assert.notStrictEqual(seq1, seq2);
    }
}

export class RecorderHooksTests
{
    shouldCallOnAddInstruction()
    {
        let onAddInstructionCalled = false;

        class TestRecorder extends InstructionRecorder<any>
        {
            onAddInstruction(instruction: Instruction, instructionParameters?: any[]): void
            {
                onAddInstructionCalled = true;
            }
        }

        const { A } = Semantics.Define([BaseBlock, ModifierBlock, TransitionBlock], TestRecorder);

        const seq = A.then.B;

        assert(onAddInstructionCalled);
    }

    shouldCallOnAddInstructionWithParameters()
    {
        let onAddInstructionCalled = false;
        let recordedParameters: any[] | undefined;

        class TestRecorder extends Sequence
        {
            onAddInstruction(instruction: Instruction, instructionParameters?: any[]): void
            {
                onAddInstructionCalled = true;

                if (instructionParameters)
                    recordedParameters = instructionParameters;
            }
        }

        const { X } = Semantics.Define([BaseBlock, ModifierBlock, TransitionBlock], TestRecorder);

        const seq = X(42).then.B;

        assert(onAddInstructionCalled);
        assert.deepStrictEqual(recordedParameters, [42]);
    }
}

export class BlockHookTests
{
    shouldCallOnUseInstruction()
    {
        let onUseInstructionCalled = false;

        class Base extends FusionOf(Beginning, InstructionBlock<Sequence>)
        {
            A = TransBlock;
            B = TransBlock;

            onUseInstruction(instruction: Instruction)
            {
                onUseInstructionCalled = true;
                super.onUseInstruction(instruction);
            }
        }

        class TransBlock extends InstructionBlock<Sequence>
        {
            then = Base;
        }

        const { A } = Semantics.Define([Base, TransBlock], Sequence);

        const seq = A.then.B;

        assert(onUseInstructionCalled);
    }

    shouldCallOnUseParametric()
    {
        let onUseParametricInstructionCalled = false;
        let recordedParameters: any[] | undefined;

        class Base extends FusionOf(Beginning, InstructionBlock<Sequence>)
        {
            B = TransBlock;
            X = (parameter: number) => TransBlock;

            protected onUseParametricInstruction(instruction: Instruction, parameters: any[]): void
            {
                onUseParametricInstructionCalled = true;
                super.onUseInstruction(instruction);

                recordedParameters = parameters;
            }
        }

        class TransBlock extends InstructionBlock<Sequence>
        {
            then = Base;
        }

        const { X } = Semantics.Define([Base, TransBlock], Sequence);

        const seq = X(42).then.B;

        assert(onUseParametricInstructionCalled);
        assert.deepStrictEqual(recordedParameters, [42]);
    }
}

export class PropertyHookTests
{
    shouldHandlePropertyGetter()
    {
        class Sequence{
            sequence = "";
        }

        class Base extends FusionOf(Beginning, InstructionBlock<Sequence>, Finishing)
        {
            B = TransBlock;
            X = (parameter: number) => TransBlock;
            get P()
            {
                this.record.sequence += "P";
                return TransBlock;
            }
        }

        class TransBlock extends InstructionBlock<Sequence>
        {
            get then()
            {
                this.record.sequence += ";";
                return Base;
            }
        }

        const { P } = Semantics.Define([Base, TransBlock], Sequence);

        const seq = P.then.P;
        assert.strictEqual(seq.sequence, "P;P");
    }
}

export class FinalizationTests
{
    shouldCallFinalizeRecordingOnAccessingResult()
    {
        let finalizeRecordingCalled = false;

        class TestRecorder extends InstructionRecorder<any>
        {
            finalizeRecording(): any
            {
                finalizeRecordingCalled = true;
                return { finalResult: 1234 };
            }
        }

        const { A } = Semantics.Define([BaseBlock, ModifierBlock, TransitionBlock], TestRecorder);

        const seq = A.then.B;

        assert(!finalizeRecordingCalled);

        // Accessing a property should trigger finalization
        const result = seq.finalResult;

        assert(finalizeRecordingCalled);
        assert.strictEqual(result, 1234);

        // Accessing other properties should not call finalizeRecording again
        finalizeRecordingCalled = false;
        const anotherResult = seq.anotherProp;

        assert(!finalizeRecordingCalled);
    }
}