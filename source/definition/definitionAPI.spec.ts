import { InitialInstructionBlock, InstructionBlock, ContinuesWith, Hybrid, InstructionChain } from "../semantium.ts";

/**
 * NOTE: These tests are not executed directly.
 * This file is type-checked by TypeScript compiler (tsc)
 * and any type error is interpreted as a test failure.
 */

//#region Static Tests

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

const StaticConfiguration = {
    blocks: [Start, Continuation, End, OptionalModifier, MultiMatch],
    instructionChain: Result,
    result: Result
};

export class StaticDefinitionTests
{
    testMemberAccessAndCall()
    {
        const start = {} as Start;

        // Test static access
        start.beginsWith.optional;
        start.beginsWith.either;

        // Test called access
        start.beginsWith("word").followedBy;
        start.beginsWith("word").end;

        // Test chaining
        start.beginsWith("hello").followedBy("world").followedBy.optional.either("a", "b").end;

        // @ts-expect-error - Should not be able to access members of other blocks directly from Start
        start.followedBy;
        // @ts-expect-error - Should not be able to call members of other blocks directly from Start
        start.followedBy("word");

        const continuation = {} as Continuation;

        // Test static access
        continuation.followedBy.optional;
        continuation.followedBy.either;

        // Test called access
        continuation.followedBy("word").followedBy;
        continuation.followedBy("word").end;

        // @ts-expect-error - Should not be able to access members of other blocks directly from Continuation
        continuation.beginsWith;
    }

    testResultType()
    {
        const end = {} as End;

        // Test static Result access
        const result1 = end.end;
        result1.elements;
        result1.matchInSequence([]);

        // Test called Result access
        const result2 = end.endsWith("word");
        result2.elements;
        result2.matchInSequence([]);

        // @ts-expect-error - Should not be able to access instruction block members on Result
        result1.followedBy;
        // @ts-expect-error - Should not be able to call instruction block members on Result
        result2.followedBy("word");
    }

    testAPIObject()
    {
        
    }
}

//#endregion


// Test generic instruction blocks
class GenericResult<BaseType> extends InstructionChain<GenericResult<BaseType>>
{
    resultProp: BaseType | undefined;
}

class GenericStart<BaseType> extends InitialInstructionBlock<GenericResult<BaseType>>
{
    hybridMember = Hybrid({
        accessed: ContinuesWith(GenericContinuation<BaseType, { isHybridAccessed: true; }>),
        called: <EmbeddedType extends any>(arg: EmbeddedType) => ContinuesWith(GenericContinuation<BaseType, EmbeddedType>)
    });

    functionMember = <EmbeddedType>(arg: EmbeddedType) => ContinuesWith(GenericContinuation<BaseType, EmbeddedType>);

    propMember = ContinuesWith(GenericContinuation<BaseType, { isPropContinuation: true; }>);
}

class GenericContinuation<BaseType, EmbeddedType> extends InstructionBlock<GenericResult<BaseType>>
{
    baseType: BaseType;
    embeddedType: EmbeddedType;
    continueMethod = (closure: (base: BaseType, embedded: EmbeddedType) => void) => ContinuesWith(GenericResult<BaseType>);
}

class TestBaseType
{
    foo: string;
    bar: number;
    baz: boolean;
}

class TestEmbeddedType
{
    blah: number;
    blub: number;
}