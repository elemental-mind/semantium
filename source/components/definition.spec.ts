import assert from "assert";
import { BaseBlock, ModifierBlock, TransitionBlock, AdditionalInitialBlock, Sequence, A, B, M, } from "../../test/simpleGrammar.js";
import { Semantics } from "../semantium.js";

export class DefinitionTests
{
    shouldHaveAllMembersOfInitialBlockDefined()
    {
        const singleInitDefinition = Semantics.Define([BaseBlock, ModifierBlock, TransitionBlock], Sequence);
        
        assert('A' in singleInitDefinition);
        assert('B' in singleInitDefinition);
        assert('C' in singleInitDefinition);
        assert('M' in singleInitDefinition);
        assert('X' in singleInitDefinition);
        assert('Y' in singleInitDefinition);
        assert('Z' in singleInitDefinition);
        assert(Object.keys(singleInitDefinition).length === 7);
    }

    shouldHaveAllMembersOfMultipleInitialBlocksDefined()
    {
        const multiInitDefinition = Semantics.Define([BaseBlock, AdditionalInitialBlock, TransitionBlock, ModifierBlock], Sequence);

        assert('A' in multiInitDefinition);
        assert('B' in multiInitDefinition);
        assert('C' in multiInitDefinition);
        assert('M' in multiInitDefinition);
        assert('X' in multiInitDefinition);
        assert('Y' in multiInitDefinition);
        assert('Z' in multiInitDefinition);
        assert('Additional' in multiInitDefinition);
        assert(Object.keys(multiInitDefinition).length === 8);
    }
}

export class SequenceTypingTests
{
    shouldAcceptValidSequences()
    {
        const seq1 = A.then.B.then.C;
        const seq2 = B.then.A.then.M.add({}).then.C;
        const seq3 = M.add({}).then.A.then.X(10).then.Y(100);
    }

    shouldRejectInvalidSequences()
    {
        //@ts-ignore
        assert.throws(() => {const seq = A.then.invalidWord }, Error);
    }

    shouldProvideResultMembersOnFinalBlocks()
    {
        const resultA = A
        assert(resultA.sequence !== undefined);

        const resultB = A.then.B;
        assert(resultB.sequence !== undefined);
    }
}