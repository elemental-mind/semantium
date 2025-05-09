// Necessary imports
import { ContinuesWith, InitialInstructionBlock, InstructionBlock, InstructionChain, ParametricInstructionUse, Semantic, StaticInstructionUse } from "./../source/semantium.ts";

// Define the instruction blocks
class Subject extends InitialInstructionBlock<Sequence>
{
    John = ContinuesWith(Verb);
    Bob = ContinuesWith(Verb);
    Cathy = ContinuesWith(Verb);
}

class Verb extends InstructionBlock<Sequence>
{
    likes = ContinuesWith(Object);
    does = ContinuesWith(Object);
    has = ContinuesWith(Possessions, Quantifiers);
}

class Object extends InstructionBlock<Sequence>
{
    art = ContinuesWith(Conjunctor, Terminator);
    sports = ContinuesWith(Conjunctor, Terminator);
}

class Conjunctor extends InstructionBlock<Sequence>
{
    and = ContinuesWith(Verb);
}

class Possessions extends InstructionBlock<Sequence>
{
    apples = ContinuesWith(Conjunctor, Terminator);
    cars = ContinuesWith(Conjunctor, Terminator);
}

class Quantifiers extends InstructionBlock<Sequence>
{
    atLeast = (count: number) => ContinuesWith(Possessions);
    notMoreThan = (count: number) => ContinuesWith(Possessions);
}

class Terminator extends InstructionBlock<Sequence>
{
    fullStop = ContinuesWith(Subject, Sequence);
    exclamationMark = ContinuesWith(Subject, Sequence);

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
const grammarAPI = Semantic.DefineAPI({
    blocks: [Subject, Verb, Object, Conjunctor, Possessions, Quantifiers, Terminator],
    resultBuilder: Sequence,
    result: Sequence
});

// Use the grammar
const artsy = grammarAPI.John.likes.art.fullStop;
const sporty = grammarAPI.Cathy.does.sports.exclamationMark;
const multi = grammarAPI.Cathy.does.sports.fullStop.Bob.likes.sports.fullStop;
const possession = grammarAPI.John.has.atLeast(5).apples.and.does.sports.fullStop;