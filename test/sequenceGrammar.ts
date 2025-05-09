import { ContinuesWith, Hybrid, InitialInstructionBlock, InstructionBlock, InstructionChain, Semantic } from "../source/semantium.ts";

class Result<T = string> extends InstructionChain<Result<T>>
{
    elements: string;

    matchInSequence(sequence: T[])
    {
        //Logic to detect when this sentence occurs
    }
}

class Start extends InitialInstructionBlock<Result>
{
    beginsWith = Hybrid({
        accessed: ContinuesWith(OptionalModifier, MultiMatch),
        called: (word: string) => ContinuesWith(Continuation, End)
    });
}

class Continuation extends InstructionBlock<Result>
{
    followedBy = Hybrid({
        accessed: ContinuesWith(OptionalModifier, MultiMatch),
        called: (word: string) => ContinuesWith(Continuation, End)
    });
}

class End extends InstructionBlock<Result>
{
    end = ContinuesWith(Result);
    endsWith = (word: string) => ContinuesWith(Result);
}

class OptionalModifier extends InstructionBlock<Result>
{
    optional = Hybrid({
        accessed: ContinuesWith(MultiMatch),
        called: (word: string) => ContinuesWith(MultiMatch, Continuation, End)
    });
}

class MultiMatch extends InstructionBlock<Result>
{
    either = (...words: string[]) => ContinuesWith(Continuation, End);
}

export const sequenceAPI = Semantic.DefineAPI({
    blocks: [Start, Continuation, End, OptionalModifier, MultiMatch],
    resultBuilder: Result,
    result: Result
});