import { InstructionRecorder } from "../../source/components/recording.js";

export class SentenceDefinition extends InstructionRecorder<SentenceDefinition>
{
    lastElementOptional: boolean;
    wordSequence: string;

    findInString()
    {
        //Logic to detect when this sentence occurs
    }
}