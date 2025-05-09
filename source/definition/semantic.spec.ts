import assert from "assert";
import { StaticBlock, ParametricBlock, HybridBlock, TransitionBlock, ComplexMemberBlock, FinalizationBlock, Sequence, SequenceRecorder } from "../../test/simpleGrammar.ts";
import { Semantic } from "../semantium.ts";

const testSemantic = Semantic.DefineAPI({
    blocks: [StaticBlock, ParametricBlock, HybridBlock, TransitionBlock, ComplexMemberBlock, FinalizationBlock],
    resultBuilder: SequenceRecorder,
    result: Sequence
});

const { A, B, M } = testSemantic;

export class DefinitionTests
{
    shouldHaveAllMembersOfInitialBlockDefined()
    {
        assert('A' in testSemantic);
        assert('B' in testSemantic);
        assert('C' in testSemantic);

        assert('M' in testSemantic);
        assert('Q' in testSemantic);

        assert('D' in testSemantic);
        assert('E' in testSemantic);
        assert('F' in testSemantic);

        assert('X' in testSemantic);
        assert('Y' in testSemantic);
        assert('Z' in testSemantic);

        assert(Object.keys(testSemantic).length === 11);
    }
}

export class SequenceTypingTests
{
    shouldAcceptValidSequences()
    {
        const seq1 = A.then.B.then.C;
        const seq2 = B.then.A.then.M.foo({}).then.C;
        const seq3 = M.foo({}).then.A.then.X(10).then.Y("text");
    }

    shouldRejectInvalidSequences()
    {
        assert.throws(() =>
        {
            //@ts-expect-error
            const seq = A.then.invalidWord;
        });
    }

    shouldProvideResultMembersOnFinalBlocks()
    {
        const resultA = A;
        assert(resultA.sequence !== undefined);

        const resultB = A.then.B;
        assert(resultB.sequence !== undefined);
    }
}