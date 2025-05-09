import { sequenceAPI } from "../../test/sequenceGrammar.ts";
import { genericAPI, ModifyTarget } from "../../test/genericGrammar.ts";

/**
 * NOTE: These tests are not executed directly.
 * This file is type-checked by TypeScript compiler (tsc)
 * and any type error is interpreted as a test failure.
 */

export class StaticDefinitionTests
{
    testMemberAccessAndCall()
    {
        // Test static access
        sequenceAPI.beginsWith.optional;
        sequenceAPI.beginsWith.either;

        // Test called access
        sequenceAPI.beginsWith("word").followedBy;
        sequenceAPI.beginsWith("word").end;

        // Test chaining
        sequenceAPI.beginsWith("hello").followedBy("world").followedBy.optional.either("a", "b").end;

        // @ts-expect-error - Should not be able to access members of other blocks directly from Start
        sequenceAPI.followedBy;
        // @ts-expect-error - Should not be able to call members of other blocks directly from Start
        sequenceAPI.followedBy("word");
        // @ts-expect-error - Should not be able to access 'end' directly from Start block
        sequenceAPI.end;

        const continuation = sequenceAPI.beginsWith("blah");

        // Test static access
        continuation.followedBy.optional;
        continuation.followedBy.either;

        // Test called access
        continuation.followedBy("word").followedBy;
        continuation.followedBy("word").end;

        // @ts-expect-error - Should not be able to access members of other blocks directly from Continuation
        continuation.beginsWith;
        // @ts-expect-error - Should not be able to call 'beginsWith' from a continuation
        continuation.beginsWith("fail");
        // @ts-expect-error - Accessing a property that doesn't exist after a chain
        sequenceAPI.beginsWith("word").nonExistentPropertyAfterChain;
    }

    testResultType()
    {
        // Test static Result access
        const result1 = sequenceAPI.beginsWith("word").end;
        result1.elements;
        result1.matchInSequence([]);

        // Test called Result access
        const result2 = sequenceAPI.beginsWith("word").endsWith("word");
        result2.elements;
        result2.matchInSequence([]);

        // @ts-expect-error - Should not be able to access instruction block members on Result
        result1.followedBy;
        // @ts-expect-error - Should not be able to call instruction block members on Result
        result2.followedBy("word");
        // @ts-expect-error - Result should not have 'beginsWith'
        result1.beginsWith("again");
        // @ts-expect-error - Result should not have 'endsWith' (it's already a result)
        result2.endsWith("again");
    }
}

export class GenericTests
{
    testClassTransforms()
    {
        const modifiedClass = genericAPI.transformClass(ModifyTarget)
            .add("directProperty").withValue(1) // type: number
            .add.property("indirectProperty", { prop: 123 }) // type: { prop: number }
            .add.property.named("fluentProperty").setTo("value") // type: string
            .add("directMethod").withFunctionBody("return null") // type: () => null
            .add.method("indirectMethod", "", "return null") // type: () => null
            .add.method.named("fluentMethod").withParameters("").withBody("return null") // type: () => null
            .finalize.modificationResult;

        modifiedClass.directProperty.toFixed();
        modifiedClass.indirectProperty.prop;
        modifiedClass.fluentProperty.charAt(0);
        modifiedClass.directMethod();
        modifiedClass.indirectMethod();
        modifiedClass.fluentMethod();

        // Negative tests for modifiedClass
        // @ts-expect-error - Cannot access non-existent property
        modifiedClass.nonExistentProperty;
        // @ts-expect-error - Calling a number property as a function
        modifiedClass.directProperty();
        // @ts-expect-error - Using string method on a number property
        modifiedClass.directProperty.charAt(0);
        // @ts-expect-error - Accessing a sub-property that doesn't exist
        modifiedClass.indirectProperty.nonExistentSubProp;


        const builderOnlyFinalize = genericAPI.transformClass(ModifyTarget).finalize;
        // @ts-expect-error - Cannot use 'add' after 'finalize' (builderOnlyFinalize is MutationBuilder)
        builderOnlyFinalize.add;

        const builderInProgress = genericAPI.transformClass(ModifyTarget);
        // @ts-expect-error - Incorrect chain: .add.property.named(...).withValue(...) should be .setTo(...)
        builderInProgress.add.property.named("wrongFluentProp").withValue("someValue");
        // @ts-expect-error - Incorrect chain: .add.method.named(...).withBody(...) should be .withParameters(...).withBody(...)
        builderInProgress.add.method.named("wrongFluentMethod").withBody("return 123;");

        // @ts-expect-error - Trying to use 'setTo' after .add.property(name, value) which returns ModificationBase
        genericAPI.transformClass(ModifyTarget).add.property("someProp", "initial").setTo("value");

        // @ts-expect-error - Trying to use 'withParameters' after .add.method(name, params, body) which returns ModificationBase
        genericAPI.transformClass(ModifyTarget).add.method("someMethod", "", "").withParameters("");
    }

    testClosureResultTransforms()
    {
        const modifiedResult = genericAPI.transformClosureResult(() => new ModifyTarget())
            .add("directProperty").withValue(1) // type: number
            .add.property("indirectProperty", { prop: 123 }) // type: { prop: number }
            .add.property.named("fluentProperty").setTo("value") // type: string
            .add("directMethod").withFunctionBody("return null") // type: () => null
            .add.method("indirectMethod", "", "return null") // type: () => null
            .add.method.named("fluentMethod").withParameters("").withBody("return null") // type: () => null
            .finalize.modificationResult;

        modifiedResult.directProperty.toFixed();
        modifiedResult.indirectProperty.prop;
        modifiedResult.fluentProperty.charAt(0);
        modifiedResult.directMethod();
        modifiedResult.indirectMethod();
        modifiedResult.fluentMethod();

        // Negative tests for modifiedResult
        // @ts-expect-error - Cannot access non-existent property
        modifiedResult.nonExistentProperty;
        // @ts-expect-error - Calling a number property as a function
        modifiedResult.directProperty();
        // @ts-expect-error - Using string method on a number property
        modifiedResult.directProperty.charAt(0);
        // @ts-expect-error - Accessing a sub-property that doesn't exist
        modifiedResult.indirectProperty.nonExistentSubProp;

        const builderOnlyFinalize = genericAPI.transformClosureResult(() => new ModifyTarget()).finalize;
        // @ts-expect-error - Cannot use 'add' after 'finalize'
        builderOnlyFinalize.add;

        const builderInProgress = genericAPI.transformClosureResult(() => new ModifyTarget());
        // @ts-expect-error - Incorrect chain: .add.property.named(...).withValue(...) should be .setTo(...)
        builderInProgress.add.property.named("wrongFluentProp").withValue("someValue");
        // @ts-expect-error - Incorrect chain: .add.method.named(...).withBody(...) should be .withParameters(...).withBody(...)
        builderInProgress.add.method.named("wrongFluentMethod").withBody("return 123;");

        // @ts-expect-error - Trying to use 'setTo' after .add.property(name, value) which returns ModificationBase
        genericAPI.transformClosureResult(() => new ModifyTarget()).add.property("someProp", "initial").setTo("value");

        // @ts-expect-error - Trying to use 'withParameters' after .add.method(name, params, body) which returns ModificationBase
        genericAPI.transformClosureResult(() => new ModifyTarget()).add.method("someMethod", "", "").withParameters("");
    }
}