import { Instruction } from "./definition.js";
import { InstructionRecorder } from "./recording.js";

interface InstructionUse
{
    instruction: Instruction,
    parameters?: any[];
}

export class DefaultInstructionRecorder extends InstructionRecorder<InstructionUse[]>
{
    instructions: InstructionUse[] = [];

    onAddInstruction(instruction: Instruction, instructionParameters?: any[])
    {
        this.instructions.push({
            instruction,
            parameters: instructionParameters
        });
    }
}