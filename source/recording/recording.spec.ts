import assert from "assert";
import { ContinuesWith, Hybrid, InitialInstructionBlock, InstructionBlock, Semantic } from "../semantium.ts";
import { InstructionChain, InstructionChainElement, ParametricInstructionUse, StaticInstructionUse } from "./instructionChain.ts";
import { StaticBlock, ParametricBlock, HybridBlock, TransitionBlock, ComplexMemberBlock, FinalizationBlock, Sequence, SequenceRecorder } from "../../test/simpleGrammar.ts";

const testSemantic = new Semantic({
    blocks: [StaticBlock, ParametricBlock, HybridBlock, ComplexMemberBlock, TransitionBlock, FinalizationBlock],
    resultBuilder: SequenceRecorder,
    result: Sequence
});

const testAPI = testSemantic.root;

export class InitializationTests
{
    shouldYieldNewInstanceOnEachDictionaryAccess()
    {
        const firstAccess = testAPI.A;
        const secondAcces = testAPI.A;

        assert(firstAccess !== secondAcces);
    }

    shouldForkOnDestructuredWords()
    {
        const {
            A
        } = testAPI;

        const firstSequence = A.then.B;
        const secondSequence = A.then.B;

        assert(firstSequence !== secondSequence);
    }

    shouldHaveSubstitutableChain()
    {
        const baseChain = testAPI.A.then.B.then.M;

        const replacementChain = new SequenceRecorder(testSemantic);
        replacementChain.sequence = "[Substituted value]";

        const modifiedChain = Semantic.SubstituteInstructionChain(baseChain, replacementChain);

        const modifiedResult = modifiedChain.bar.then.A.then.Q.sequence;

        assert(modifiedResult === "[Substituted value].bar.then.A.then.Q");
    }

    shouldHaveCustomizableStartingChain()
    {
        class BaseRecorder extends SequenceRecorder
        {
            constructor(
                public baseSequence: string
            )
            {
                super(testSemantic);
                this.sequence = baseSequence;
            }

            fork(forkAfterElement?: InstructionChainElement)
            {
                const fork = new BaseRecorder(this.baseSequence);
                fork.replayInstructions(this, forkAfterElement);
                return fork;
            }
        }

        const baseChain = new BaseRecorder("BaseChain");

        const substituteAPI = testSemantic.primedWith(baseChain);

        const firstTest = substituteAPI.A.then.B.then.Q.sequence;
        const secondTest = substituteAPI.C.then.B.then.Q.sequence;

        assert(firstTest === "BaseChain.A.then.B.then.Q");
        assert(secondTest === "BaseChain.C.then.B.then.Q");
    }

    shouldAllowCustomContinuation()
    {
        const customBase = testSemantic.continuationWith([StaticBlock]);

        assert(customBase.A.then.Q.sequence === "A.then.Q");
        //@ts-expect-error
        assert.throws(() => { customBase.E; });
    }
}

export class InstructionChainHookTests
{
    shouldCallOnAddInstruction()
    {
        let onAddInstructionCount = 0;

        const { API, inspector } = this.#generateTestHarness();

        API.A.then.B;

        assert(inspector.staticUseCount === 3);
    }

    shouldSupplyStaticInstructionUse()
    {
        const { API, inspector } = this.#generateTestHarness();

        API.A.then.B;

        assert(inspector.staticUseCount === 3);
        assert(inspector.paraUseCount === 0);
    }

    shouldSupplyParametricInstructionUse()
    {
        const { API, inspector } = this.#generateTestHarness();

        API.A.then.C().then.D(100).then.B;

        assert(inspector.staticUseCount === 5);
        assert(inspector.paraUseCount === 2);
        assert.deepStrictEqual(inspector.suppliedParameters, [[], [100]]);
    }

    shouldSupplyProperInstructionUseWithHybridInstructions()
    {
        const { API, inspector } = this.#generateTestHarness();

        API.E.then.E(100).then.C().then.A;

        assert(inspector.staticUseCount === 5);
        assert(inspector.paraUseCount === 2);
        assert.deepStrictEqual(inspector.suppliedParameters, [[100], []]);
    }

    #generateTestHarness()
    {
        const inspector = {
            staticUseCount: 0,
            paraUseCount: 0,
            suppliedParameters: [] as any[]
        };

        class StaticBlock extends InitialInstructionBlock<any>
        {
            A = ContinuesWith(TransitionBlock);
            B = ContinuesWith(TransitionBlock);
        }

        class ParametricBlock extends InitialInstructionBlock<any>
        {
            C = () => ContinuesWith(TransitionBlock);
            D = (number: number) => ContinuesWith(TransitionBlock);
        }

        class HybridBlock extends InitialInstructionBlock<any>
        {
            E = Hybrid({
                called: (number: number) => ContinuesWith(TransitionBlock),
                accessed: ContinuesWith(TransitionBlock)
            });
        }

        class TransitionBlock extends InstructionBlock<any>
        {
            then = ContinuesWith(StaticBlock, ParametricBlock, HybridBlock);
        }

        class TestChain extends InstructionChain<any>
        {
            onInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse): void
            {
                if (instructionUse instanceof StaticInstructionUse)
                    inspector.staticUseCount++;

                if (instructionUse instanceof ParametricInstructionUse)
                {
                    inspector.paraUseCount++;
                    inspector.suppliedParameters.push(instructionUse.parameters);
                }
            }
        }

        const API = Semantic.DefineAPI({
            blocks: [StaticBlock, ParametricBlock, HybridBlock, TransitionBlock],
            resultBuilder: TestChain,
            result: TestChain
        });

        return { API, inspector };
    }
}

export class BlockHookTests
{
    shouldCallOnUseInstruction()
    {
        let onUseInstructionCalled = false;

        class Base extends InitialInstructionBlock<Sequence>
        {
            A = ContinuesWith(TransBlock);
            B = ContinuesWith(TransBlock);

            onInstructionUse(instructionUseData: StaticInstructionUse | ParametricInstructionUse): void
            {
                onUseInstructionCalled = true;
            }
        }

        class TransBlock extends InstructionBlock<Sequence>
        {
            then = ContinuesWith(Base);
        }

        const { A } = Semantic.DefineAPI({
            blocks: [Base, TransBlock],
            resultBuilder: SequenceRecorder,
            result: Sequence
        });

        const seq = A.then.B;

        assert(onUseInstructionCalled);
    }
}

export class PropertyHookTests
{
    shouldCallPropertyGetters()
    {
        class Recorder extends InstructionChain<Recorder>
        {
            invocations = "";
        }

        class Base extends InitialInstructionBlock<Recorder>
        {
            A = ContinuesWith(Base, Recorder);
            get B() { this.chain.invocations += "B;"; return ContinuesWith(Base, Recorder); }
            get C() { this.chain.invocations += "C;"; return ContinuesWith(Base, Recorder); }
        }

        const { A } = Semantic.DefineAPI({
            blocks: [Base],
            resultBuilder: Recorder,
            result: Recorder
        });

        const seq = A.B.A.C.A.invocations;
        assert.strictEqual(seq, "B;C;");
    }

    shouldCallParametricHandlers()
    {
        class Recorder extends InstructionChain<Recorder>
        {
            invocations = "";
        }

        class Base extends InitialInstructionBlock<Recorder>
        {
            A = ContinuesWith(Base, Recorder);
            B = (a: number) => { this.chain.invocations += `B.Call(${a});`; return ContinuesWith(Base); };
            C = (a: number) => { this.chain.invocations += `C.Call(${a});`; return ContinuesWith(Base); };
        }

        const { A } = Semantic.DefineAPI({
            blocks: [Base],
            resultBuilder: Recorder,
            result: Recorder
        });

        const seq = A.B(5).A.C(10).A.invocations;
        assert.strictEqual(seq, "B.Call(5);C.Call(10);");
    }

    shouldCallHybridHandlers()
    {
        class Recorder extends InstructionChain<Recorder>
        {
            invocations: string = "";
        }

        class Base extends InitialInstructionBlock<Recorder>
        {
            A = ContinuesWith(Base, Recorder);

            B = Hybrid({
                accessed: () => { this.chain.invocations += "B.Get;"; return ContinuesWith(Base); },
                called: (a: number) => { this.chain.invocations += `B.Call(${a});`; return ContinuesWith(Base); }
            });

            C = Hybrid({
                accessed: () => { this.chain.invocations += "C.Get;"; return ContinuesWith(Base); },
                called: (a: number) => { this.chain.invocations += `C.Call(${a});`; return ContinuesWith(Base); }
            });
        }

        const { A } = Semantic.DefineAPI({
            blocks: [Base],
            resultBuilder: Recorder,
            result: Recorder
        });

        const seq = A.B.A.B(5).A.C.A.C(10).A.invocations;
        assert.strictEqual(seq, "B.Get;B.Call(5);C.Get;C.Call(10);");
    }
}

export class ForkingTests
{

    shouldCorrectlyForkBaseAPI()
    {
        class BlockA extends InitialInstructionBlock<Sequence>
        {
            A = ContinuesWith(BlockB, BlockC);
        }

        class BlockB extends InstructionBlock<Sequence>
        {
            B = ContinuesWith(Sequence);
        }

        class BlockC extends InstructionBlock<Sequence>
        {
            C = ContinuesWith(Sequence);
        }

        const { A } = Semantic.DefineAPI({
            blocks: [BlockA, BlockB, BlockC],
            resultBuilder: SequenceRecorder,
            result: Sequence
        });

        const chain1 = A.B;
        const chain2 = A.C;

        assert(chain1.sequence === "A.B");
        assert(chain2.sequence === "A.C");
    }

    shouldCorrectlyForkWhenUsingParametricInstructions()
    {
        class Start extends InitialInstructionBlock<Sequence>
        {
            start = ContinuesWith(Options);
        }

        class Options extends InstructionBlock<Sequence>
        {
            either = (...options: string[]) => ContinuesWith(Sequence, Options);
        }

        const { start } = Semantic.DefineAPI({
            blocks: [Start, Options],
            resultBuilder: SequenceRecorder,
            result: Sequence
        });

        const chain1 = start.either("A", "B").sequence;
        const chain2 = start.either("C", "D").sequence;

        const intermediate = start.either("E");
        const chain3 = intermediate.sequence;
        const chain4 = intermediate.either("F").sequence;

        const fork1 = intermediate.either;
        const fork3 = fork1("F.1").sequence;
        const fork4 = fork1("F.2").sequence;

        assert(chain1 === "start.either(A,B)");
        assert(chain2 === "start.either(C,D)");
        assert(chain3 === "start.either(E)");
        assert(chain4 === "start.either(E).either(F)");
        assert(fork3 === "start.either(E).either(F.1)");
        assert(fork4 === "start.either(E).either(F.2)");
    }

    shouldCorrectlyForkWhenUsingHybridInstructions()
    {
        class Recorder extends InstructionChain<any>
        {
            sequence = "";
        }

        class Start extends InitialInstructionBlock<Recorder>
        {
            get start() { this.chain.sequence = "start"; return ContinuesWith(HybridBlock); }
        }

        class HybridBlock extends InstructionBlock<Recorder>
        {
            H = Hybrid({
                accessed: () => { this.chain.sequence += ".H[get]"; return ContinuesWith(HybridBlock, Recorder); },
                called: (value: string) => { this.chain.sequence += `.H("${value}")`; return ContinuesWith(HybridBlock, Recorder); }
            });
        }

        const { start } = Semantic.DefineAPI({
            blocks: [Start, HybridBlock],
            resultBuilder: Recorder,
            result: Recorder
        });

        const intermediate1 = start.H;
        const chain1 = intermediate1.sequence;
        const chain2 = intermediate1.H.sequence;
        const intermediate2 = intermediate1.H("value");
        const chain3 = intermediate2.sequence;
        const chain4 = intermediate2.H.sequence;
        const chain5 = intermediate2.H("value2").sequence;

        const fork1 = intermediate1.H;
        const fork3 = fork1("Fork").sequence;
        const fork4 = fork1.H.sequence;

        assert(chain1 === "start.H[get]");
        assert(chain2 === "start.H[get].H[get]");
        assert(chain3 === "start.H[get].H(\"value\")");
        assert(chain4 === "start.H[get].H(\"value\").H[get]");
        assert(chain5 === "start.H[get].H(\"value\").H(\"value2\")");

        assert(fork3 === "start.H[get].H(\"Fork\")");
        assert(fork4 === "start.H[get].H[get].H[get]");
    }
}

class FinalizationTracker extends InstructionChain<FinalizationTracker>
{
    finalizations = 0;

    fork(forkAfterElement?: InstructionChainElement): InstructionChain<FinalizationTracker>
    {
        return this;
    }

    finalizeRecording()
    {
        this.finalizations++;
        return this;
    }
}

export class FinalizationTests
{

    shouldFinalizeWhenResultTypeIsReturned()
    {
        class Base extends InitialInstructionBlock<FinalizationTracker>
        {
            A = ContinuesWith(Base);
            B = ContinuesWith(Base, FinalizationTracker);
            C = ContinuesWith(FinalizationTracker);
        }

        const API = Semantic.DefineAPI({
            blocks: [Base],
            resultBuilder: FinalizationTracker,
            result: FinalizationTracker
        });

        const finalizationCount1 = API.A.B.C.finalizations;

        assert(finalizationCount1 === 1);

        const finalizationCount2 = API.B.finalizations;

        assert(finalizationCount2 === 2);
    }


    shouldNotFinalizeIfResultTypeIsNotReturned()
    {
        class Base extends InitialInstructionBlock<FinalizationTracker>
        {
            A = ContinuesWith(Base);
            B = ContinuesWith(Base);
            C = ContinuesWith(Base);

            X = ContinuesWith(FinalizationTracker);
        }

        const API = Semantic.DefineAPI({
            blocks: [Base],
            resultBuilder: FinalizationTracker,
            result: FinalizationTracker
        });

        //@ts-expect-error
        assert.throws(() => API.A.B.finalizations);
    }

    shouldFinalizeOnStaticAndParametricMembers()
    {
        class Base extends InitialInstructionBlock<FinalizationTracker>
        {
            A = ContinuesWith(Base);
            B = Hybrid({
                accessed: ContinuesWith(Base, FinalizationTracker),
                called: () => ContinuesWith(Base, FinalizationTracker)
            });
            C = () => ContinuesWith(Base, FinalizationTracker);
        }

        const API = Semantic.DefineAPI({
            blocks: [Base],
            resultBuilder: FinalizationTracker,
            result: FinalizationTracker
        });

        const finalizationCount1 = API.A.B.A.B.finalizations;

        assert(finalizationCount1 === 1);

        const finalizationCount2 = API.A.B.A.B().finalizations;

        assert(finalizationCount2 === 2);

        const finalizationCount3 = API.A.B.C().finalizations;

        assert(finalizationCount3 === 3);
    }
}
