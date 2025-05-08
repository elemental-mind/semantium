import { ContinuesWith, Hybrid, InitialInstructionBlock, InstructionBlock, InstructionChain, Semantic } from "../source/semantium.ts";


export class Start extends InitialInstructionBlock<SentenceDefinition>
{
    beginsWith = Hybrid({
        called: (word: string) => ContinuesWith(Continuation, End),
        accessed: ContinuesWith(OptionalModifier, MultiMatch)
    });
}

export class AlternativeStart extends InitialInstructionBlock<SentenceDefinition>
{
    startsWith = (word: string) => ContinuesWith(Continuation, End);
}

export class Continuation extends InstructionBlock<SentenceDefinition>
{
    followedBy = Hybrid({
        called: (word: string) => { this.chain.wordSequence += word; return ContinuesWith(Continuation, End); },
        accessed: ContinuesWith(OptionalModifier, MultiMatch)
    });
}

export class End extends InstructionBlock<SentenceDefinition>
{
    endsWith = Hybrid({
        called: (word: string) => ContinuesWith(SentenceDefinition),
        accessed: ContinuesWith(TerminationModifiers)
    });
}

export class OptionalModifier extends InstructionBlock<SentenceDefinition>
{
    optional = Hybrid({
        called: (word: string) => ContinuesWith(MultiMatch, Continuation, End),
        accessed: () => { this.chain.lastElementOptional = true; return ContinuesWith(MultiMatch); }
    });
}

export class MultiMatch extends InstructionBlock<SentenceDefinition>
{
    either = (...words: string[]) => ContinuesWith(Continuation, End);
}

export class TerminationModifiers extends InstructionBlock<SentenceDefinition>
{
    either = (...words: string[]) => ContinuesWith(SentenceDefinition);
}

export class SentenceDefinition extends InstructionChain<SentenceDefinition>
{
    lastElementOptional: boolean;
    wordSequence: string;

    //@ts-ignore
    matches(text: string): boolean
    {
        //Logic to detect when this sentence occurs
        //Do not implement - this is only conceptual
    }
}

export const sentenceBuilderConfig = {
    blocks: [Start, Continuation, End, OptionalModifier, MultiMatch, TerminationModifiers] as const,
    resultBuilder: SentenceDefinition,
    result: SentenceDefinition
};

function concept()
{
    const grammarAPI = Semantic.DefineAPI(sentenceBuilderConfig);
    // Access initial blocks directly from grammarAPI

    const dayDescription =
        grammarAPI.beginsWith("I feel")
            .followedBy.optional("really")
            .followedBy.either("great", "good", "bad", "shit")
            .endsWith("today");

    const wheatherBaseDescription =
        grammarAPI.beginsWith.either("This", "Last")
            .followedBy("month")
            .followedBy.either("was", "is")
            .followedBy.optional.either("really", "mildly");

    const rainyDescription = wheatherBaseDescription.endsWith("rainy");
    const sunnyDescription = wheatherBaseDescription.endsWith("sunny");

    console.log(rainyDescription.matches("This month was really rainy."));
    console.log(sunnyDescription.matches("This month was really rainy."));
    console.log(rainyDescription.matches("This month was really sunny."));
    console.log(sunnyDescription.matches("This month was really sunny."));
}