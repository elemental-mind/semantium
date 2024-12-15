import { FusionOf } from "fusium-js";
import { Beginning, InstructionBlock, Semantics } from "../../source/components/definition.js";
import { SentenceDefinition } from "./builder.js";

class Start extends FusionOf(Beginning, InstructionBlock<SentenceDefinition>)
{
    beginsWith = { whenCalled: (word: string) => [Continuation, End], whenAccessed: [OptionalModifier, MultiMatch] };
}

class Continuation extends InstructionBlock<SentenceDefinition>
{
    followedBy = { whenCalled: (word: string) => { this.record.wordSequence += word; return [Continuation, End]; }, whenAccessed: [OptionalModifier, MultiMatch] };
}

class End extends FusionOf(InstructionBlock<SentenceDefinition>)
{
    endsWith = { whenCalled: (word: string) => SentenceDefinition, whenAccessed: TerminationModifiers };
}

class OptionalModifier extends InstructionBlock<SentenceDefinition>
{
    optional = { whenCalled: (word: string) => [MultiMatch, Continuation, End], whenAccessed: () => { this.record.lastElementOptional = true; return MultiMatch; } };
}

class MultiMatch extends InstructionBlock<SentenceDefinition>
{
    either = (...words: string[]) => [Continuation, End];
}

class TerminationModifiers extends FusionOf(InstructionBlock<SentenceDefinition>)
{
    either = (...words: string[]) => SentenceDefinition;
}

const configuration = {
    blocks: [Start, Continuation, End, OptionalModifier, MultiMatch, TerminationModifiers],
    result: SentenceDefinition
};

export const dictionary = Semantics.Define(configuration);

export const {
    beginsWith
} = dictionary;

const test = beginsWith.optional.either("word", "token").endsWith("ending");