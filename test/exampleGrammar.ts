// Necessary imports
import { InitialInstructionBlock, InstructionBlock, InstructionChain, ParametricInstructionUse, Semantic, StaticInstructionUse } from "./../source/semantium.ts";

// Define the instruction blocks
class Subject extends InitialInstructionBlock<Sequence>
{
    John = Verb;
    Bob = Verb;
    Cathy = Verb;
}

class Verb extends InstructionBlock<Sequence>
{
    likes = Object;
    does = Object;
    has = [Possessions, Quantifiers];
}

class Object extends InstructionBlock<Sequence>
{
    art = [Conjunctor, Terminator];
    sports = [Conjunctor, Terminator];
}

class Conjunctor extends InstructionBlock<Sequence>
{
    and = Verb;
}

class Possessions extends InstructionBlock<Sequence>
{
    apples = [Conjunctor, Terminator];
    cars = [Conjunctor, Terminator];
}

class Quantifiers extends InstructionBlock<Sequence>
{
    atLeast = (count: number) => Possessions;
    notMoreThan = (count: number) => Possessions;
}

class Terminator extends InstructionBlock<Sequence>
{
    fullStop = [Subject, Sequence];
    exclamationMark = [Subject, Sequence];

    onInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse)
    {
        this.chain.sentenceCount++;
    }
}

// Define the sequence recorder
class Sequence extends InstructionChain<Sequence>
{
    sequence = "";
    sentenceCount = 0;

    onInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse): void
    {
        if (instructionUse.instruction.family !== Terminator)
        {
            this.sequence += " " + instructionUse.instruction.word;
        } else
        {
            switch (instructionUse.instruction.word)
            {
                case "fullStop":
                    this.sequence += ".";
                    break;
                case "exclamationMark":
                    this.sequence += "!";
                    break;
            }
        }

        if (instructionUse.instruction.family === Quantifiers)
        {
            this.sequence += " " + (instructionUse as ParametricInstructionUse).parameters[0];
        }
    }

    finalizeRecording(): Sequence
    {
        this.sequence = this.sequence.trim();
        return this;
    }
}

// Create the dictionary
const { John, Bob, Cathy } = Semantic.DefineAPI({
    blocks: [Subject, Verb, Object, Conjunctor, Possessions, Quantifiers, Terminator],
    instructionChain: Sequence,
    result: Sequence
});

// Use the grammar
const artsy = John.likes.art.fullStop;
const sporty = Cathy.does.sports.exclamationMark;
const multi = Cathy.does.sports.fullStop.Bob.likes.sports.fullStop;
const possession = John.has.atLeast(5).apples.and.does.sports.fullStop;