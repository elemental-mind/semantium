import { FusionOf } from "fusium-js";
import { Beginning, InstructionBlock, Finishing, Semantics } from "../../source/components/definition.js";
import { SentenceDefinition } from "./builder.js";

class Start extends FusionOf(Beginning, Finishing, InstructionBlock<SentenceDefinition>)
{
    beginsWith = { whenCalled: (word: string) => [Continuation, End], whenAccessed: [OptionalModifier, MultiMatch] };
}

class Continuation extends InstructionBlock<SentenceDefinition>
{
    followedBy = { whenCalled: (word: string) => [Continuation, End], whenAccessed: [OptionalModifier, MultiMatch] };
}

class End extends FusionOf(Finishing, InstructionBlock<SentenceDefinition>)
{
    endsWith = { whenCalled: (word: string) => SentenceDefinition, whenAccessed: TerminationModifiers };
}

class OptionalModifier extends InstructionBlock<SentenceDefinition>
{
    optional = (word: string) => [MultiMatch, Continuation, End];
}

class MultiMatch extends InstructionBlock<SentenceDefinition>
{
    either = (...words: string[]) => [Continuation, End];
}

class TerminationModifiers extends FusionOf(Finishing, InstructionBlock<SentenceDefinition>)
{
    either = (...words: string[]) => SentenceDefinition;
}

export const dictionary = Semantics.Define([Start, Continuation, End, OptionalModifier, MultiMatch, TerminationModifiers], SentenceDefinition);

export const {
    beginsWith
} = dictionary;