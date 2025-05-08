import { EntryPointObject, ParalessConstructor, TransformContinuation, TransformInstructionBlock, TransformGenericInitInstructionBlock } from "./definitionTyping.ts";
import { InitialInstructionBlock, InstructionBlock } from "./semantic.ts";
import { InstructionChain } from "../semantium.ts";

/**
 * NOTE: These tests are not executed directly.
 * This file is type-checked by TypeScript compiler (tsc)
 * and any type error is interpreted as a test failure.
 */

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
    instructionChain: Result,
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

        const transformed = {} as EntryPointObject<typeof configuration>; // Should only expose Start methods

        transformed.beginsWith;
        //@ts-expect-error
        transformed.optional;

    }
}

class GenericResult<BaseType> extends InstructionChain<GenericResult<BaseType>>
{
    resultProp: BaseType | undefined;
}

class GenericStart<BaseType> extends InitialInstructionBlock<GenericResult<BaseType>>
{
    hybridMember = {
        whenAccessed: () => GenericContinuation<BaseType, { isHybridAccessed: true }>,
        whenCalled: <EmbeddedType extends any>(arg: EmbeddedType) => GenericContinuation<BaseType, EmbeddedType>
    };

    functionMember = <EmbeddedType>(arg: EmbeddedType) => GenericContinuation<BaseType, EmbeddedType>;

    propMember = GenericContinuation<BaseType, { isPropContinuation: true }>;
}

class GenericContinuation<BaseType, EmbeddedType> extends InstructionBlock<GenericResult<BaseType>>
{
    baseType: BaseType;
    embeddedType: EmbeddedType;
    continueMethod = (closure: (base: BaseType, embedded: EmbeddedType) => void) => GenericResult<BaseType>;
}

class TestBaseType
{
    foo: string;
    bar: number;
    baz: boolean;
}

class TestEmbeddedType
{
    blah: number
    blub: number
}

export class GenericSupportTests
{
    genericStartGetsTransformed()
    {
        const transformed = {} as TransformGenericInitInstructionBlock<GenericStart<TestBaseType>, typeof GenericResult>;
        transformed.hybridMember; // Should exist
        transformed.functionMember; // Should exist
        transformed.propMember; // Should exist
        //@ts-expect-error - Should not have members from other blocks
        transformed.nonExistentMember;
    }

    hybridContinuationGetsTransformed()
    {
        const transformed = {} as TransformGenericInitInstructionBlock<GenericStart<TestBaseType>, typeof GenericResult>;

        const testObject = new TestEmbeddedType();

        transformed.hybridMember.embeddedType.blah;
    }

    functionContinuationGetsTransformed()
    {
        const transformed = {} as TransformGenericInitInstructionBlock<GenericStart<TestBaseType>, typeof GenericResult>;

        const testObject = new TestEmbeddedType();

        transformed.functionMember(testObject).baseType.foo;
    }

    propertyTransformationGetsTransformed()
    {
        type TransformedStartBoolean = TransformGenericInitInstructionBlock<GenericStart<boolean>, typeof GenericResult<any>>;
        const startBoolean = {} as TransformedStartBoolean;
        const propContinuation = startBoolean.propMember;
        let baseBoolean: boolean = propContinuation.baseType;
        let embeddedProp: { isPropContinuation: true; } = propContinuation.embeddedType;
        propContinuation.continueMethod((base, embedded) =>
        {
            let checkBase: boolean = base;
            let checkEmbedded: { isPropContinuation: true; } = embedded;
            //@ts-expect-error
            checkBase = 123;
            //@ts-expect-error
            checkEmbedded = { wrong: true };
        });
        //@ts-expect-error
        propContinuation.baseType = 123;
        //@ts-expect-error
        propContinuation.embeddedType = { wrong: true };
        //@ts-expect-error
        propContinuation.continueMethod((base: number, embedded: any) => { });

    }
}