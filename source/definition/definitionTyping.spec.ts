import { EntryPointObject, ParalessConstructor, TransformContinuation, TransformInstructionBlock } from "./definitionTyping.js";
import { InitialInstructionBlock, InstructionBlock } from "./semantic.ts";
import { InstructionChain } from "../semantium.ts";

export class Result<T = string> extends InstructionChain<Result<T>>
{
    elements: string;

    matchInSequence(sequence: T[])
    {
        //Logic to detect when this sentence occurs
    }
}

class Start extends InitialInstructionBlock<Result>
{
    beginsWith = { whenCalled: (word: string) => [Continuation, End], whenAccessed: [OptionalModifier, MultiMatch] };
}

class Continuation extends InstructionBlock<Result>
{
    followedBy = { whenCalled: (word: string) => [Continuation, End], whenAccessed: [OptionalModifier, MultiMatch] };
}

class End extends InstructionBlock<Result>
{
    end = Result;
    endsWith = (word: string) => Result;
}

class OptionalModifier extends InstructionBlock<Result>
{
    optional = { whenCalled: (word: string) => [MultiMatch, Continuation, End], whenAccessed: MultiMatch };
}

class MultiMatch extends InstructionBlock<Result>
{
    either = (...words: string[]) => [Continuation, End];
}

const configuration = {
    blocks: [Start, Continuation, End, OptionalModifier, MultiMatch],
    result: Result
};

export class MemberTransformations
{
    StaticWordsGetTransformed()
    {
        const transformed = {} as TransformInstructionBlock<End, typeof Result>;
        transformed.end;
    }

    ParametricWordsGetTransformed()
    {
        const transformed = {} as TransformInstructionBlock<End, typeof Result>;
        transformed.endsWith("word");
    }

    HybridWordsGetTransformed()
    {
        const transformed = {} as TransformInstructionBlock<Start, typeof Result>;
        transformed.beginsWith;
        transformed.beginsWith("word");
        transformed.beginsWith.optional;
        transformed.beginsWith.optional("word");
        transformed.beginsWith.either("word", "text");
        transformed.beginsWith.optional.either("word", "text");
    }
}

export class TransformContinuationTests
{
    ArrayWithoutResultShouldGetTransformed()
    {
        const transformed = {} as TransformContinuation<[typeof Continuation, typeof End], typeof Result>;

        //Continuation transformed
        transformed.followedBy;
        transformed.followedBy("word");
        transformed.followedBy.optional("word");
        transformed.followedBy.either("word", "text");
        transformed.followedBy.optional.either("word", "text");

        //End transformed
        transformed.end;
        transformed.endsWith;
    }

    ArrayWithResultShouldGetTransformed()
    {
        const transformed = {} as TransformContinuation<[typeof Continuation, typeof Result], typeof Result>;

        //Continuation transformed
        transformed.followedBy;
        transformed.followedBy("word");
        transformed.followedBy.optional("word");
        transformed.followedBy.either("word", "text");
        transformed.followedBy.optional.either("word", "text");

        //Result transformed
        transformed.elements;
        transformed.matchInSequence([]);
    }

    ContinuesWithContinuationShouldGetTransformed()
    {
        const transformed = {} as TransformContinuation<typeof Continuation, typeof Result>;

        //Continuation transformed
        transformed.followedBy;
        transformed.followedBy("word");
        transformed.followedBy.optional("word");
        transformed.followedBy.either("word", "text");
        transformed.followedBy.optional.either("word", "text");
    }

    ContinuesWithResultShouldGetTransformed()
    {
        const transformed = {} as TransformContinuation<typeof Result, typeof Result>;

        //Result transformed
        transformed.elements;
        transformed.matchInSequence([]);
    }
}

export class EntryPointObjectTests
{
    EntryPointObjectShouldGetTransformed()
    {
        const transformed = {} as EntryPointObject<typeof configuration>;

        //configuration transformed
        transformed.beginsWith("hello").followedBy("world").followedBy.optional("blah").endsWith("!");
    }
}

export class TypeTransformationTests
{
    ArrayToUnionTest()
    {
        type BlockArray = [typeof Start, typeof Continuation, typeof MultiMatch];
        type AsUnion = BlockArray[number]; // Should be Start | Continuation | MultiMatch
    }

    FilterBeginningTest()
    {
        type BlockUnion = typeof Start | typeof Continuation | typeof MultiMatch;
        type OnlyBeginning = BlockUnion & ParalessConstructor<InitialInstructionBlock<any>>; // Should be just Start
    }

    FullChainTest()
    {
        type Config = {
            blocks: Array<(typeof Start | typeof Continuation | typeof MultiMatch)>;
            result: typeof Result;
        };

        const transformed = {} as EntryPointObject<Config>; // Should only expose Start methods
        
        transformed.beginsWith;
        //@ts-expect-error
        transformed.optional;

    }
}
