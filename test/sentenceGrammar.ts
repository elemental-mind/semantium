import { InitialInstructionBlock, InstructionBlock, InstructionChain, Semantic } from "../source/semantium.ts";


export class Start extends InitialInstructionBlock<SentenceDefinition>
{
    beginsWith = { whenCalled: (word: string) => [Continuation, End], whenAccessed: [OptionalModifier, MultiMatch] };
}

export class AlternativeStart extends InitialInstructionBlock<SentenceDefinition>
{
    startsWith = (word: string) => [Continuation, End];
}

export class Continuation extends InstructionBlock<SentenceDefinition>
{
    followedBy = { whenCalled: (word: string) => { this.chain.wordSequence += word; return [Continuation, End]; }, whenAccessed: [OptionalModifier, MultiMatch] };
}

export class End extends InstructionBlock<SentenceDefinition>
{
    endsWith = { whenCalled: (word: string) => SentenceDefinition, whenAccessed: TerminationModifiers };
}

export class OptionalModifier extends InstructionBlock<SentenceDefinition>
{
    optional = { whenCalled: (word: string) => [MultiMatch, Continuation, End], whenAccessed: () => { this.chain.lastElementOptional = true; return MultiMatch; } };
}

export class MultiMatch extends InstructionBlock<SentenceDefinition>
{
    either = (...words: string[]) => [Continuation, End];
}

export class TerminationModifiers extends InstructionBlock<SentenceDefinition>
{
    either = (...words: string[]) => SentenceDefinition;
}






export class SentenceDefinition extends InstructionChain<SentenceDefinition>
{
    lastElementOptional: boolean;
    wordSequence: string;

    //@ts-ignore
    matches(text: string) : boolean
    {
        //Logic to detect when this sentence occurs
        //Do not implement - this is only conceptual
    }
}



export const sentenceBuilderConfig = {
    blocks: [Start, Continuation, End, OptionalModifier, MultiMatch, TerminationModifiers],
    result: SentenceDefinition
};




function concept()
{
    const { beginsWith } = Semantic.Define(sentenceBuilderConfig);

    const dayDescription =
        beginsWith("I feel")
            .followedBy.optional("really")
            .followedBy.either("great", "good", "bad", "shit")
            .endsWith("today");

    const wheatherBaseDescription =
        beginsWith.either("This", "Last")
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