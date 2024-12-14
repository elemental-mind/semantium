import { Trait } from "fusium-js";
import { Finishing, Instruction, InstructionBlock, Semantics } from "./definition.js";

export abstract class InstructionRecorder<T> extends Trait
{
    protected onAddInstruction?(instruction: Instruction, instructionParameters?: any[]) { };
    protected finalizeRecording?(): T
    {
        return this as unknown as T;
    };
}

export class InitSensor
{
    constructor(
        public semanticDefinition: Semantics,
        public initialInstruction: Instruction
    ) { }

    get(target: {}, prop: string, receiver: any): any
    {
        if (this.initialInstruction.isParametric)
            throw new Error("This instruction expects parameters.");

        //@ts-ignore
        const handler = new FlowSensor(this.semanticDefinition, new this.semanticDefinition.definition.recorder(), [this.initialInstruction.family]);
        const flowSensor = new Proxy(function () { } as any, handler);
        handler.proxy = flowSensor;

        return flowSensor[this.initialInstruction.word][prop];
    }

    apply(target: {}, thisArg: any, argumentsList: any[]): any
    {
        if (!this.initialInstruction.isParametric)
            throw new Error("This instruction is not parametric.");

        //@ts-ignore
        const handler = new FlowSensor(this.semanticDefinition, new this.semanticDefinition.definition.recorder(), [this.initialInstruction.family]);
        const flowSensor = new Proxy(function () { } as any, handler);
        handler.proxy = flowSensor;

        return flowSensor[this.initialInstruction.word](...argumentsList);
    }
}

export class FlowSensor
{
    public proxy: any;
    private candidateBlocks: Set<typeof InstructionBlock>;

    private awaitingParameters = false;
    private parameterRecorder?: {
        instruction: Instruction;
        fct: Function;
        handlingBlock: InstructionBlock<any>;
    };

    private finalAccessPermitted = false;

    private isFinalized = false;
    private finalizationResult?: any;

    constructor(
        public semanticDefinition: Semantics,
        public recorder: InstructionRecorder<any>,
        permittedDescendents: (typeof InstructionBlock)[]
    )
    {
        this.candidateBlocks = new Set(permittedDescendents);
    };

    get(target: {}, prop: string, receiver: any): any
    {
        if (this.isFinalized)
            return this.finalizationResult[prop];

        if (this.awaitingParameters)
            throw new Error("Must provide parameters to parametric grammar element before proceeding with next word!");

        const instructionBlockCandidates = this.semanticDefinition.instructionCatalogue
            .get(prop)?.filter(instruction => this.candidateBlocks.has(instruction.family));

        if (!instructionBlockCandidates || instructionBlockCandidates.length === 0)
        {
            if (!this.finalAccessPermitted)
                throw new Error("Word not permitted at this position.");

            //We assume the caller wants to access the result of the instructionRecorder
            if (!this.isFinalized)
            {
                //@ts-expect-error
                if (this.recorder.finalizeRecording)
                    //@ts-expect-error
                    this.finalizationResult = this.recorder.finalizeRecording();
                else
                    this.finalizationResult = this.recorder;

                this.isFinalized = true;
            }

            return this.finalizationResult[prop];
        }

        if (instructionBlockCandidates.length > 1)
            throw new Error("Ambiguous grammar detected!");


        const instruction = instructionBlockCandidates[0];
        const handlingBlock = this.semanticDefinition.blockInstances.get(instruction.family)!;

        //@ts-expect-error
        handlingBlock.record = this.recorder;

        if (handlingBlock instanceof Finishing)
            this.finalAccessPermitted = true;
        else
            this.finalAccessPermitted = false;

        const result = (handlingBlock as any)[prop];

        if (result === undefined)
            throw new Error("Instruction not permitted");

        if (result instanceof Function)
        {
            //We have a function - but constructors are also functions. We hence need to check if the returned value was a Block constructor or a callable function.
            if (this.semanticDefinition.blockInstances.has(result))
            {
                //We have a block constructor
                this.candidateBlocks.clear();
                this.candidateBlocks.add(result);

                //@ts-expect-error
                handlingBlock.onUseInstruction(instruction);
            }
            else
            {
                //We have a function that needs to be called to be passed parameters
                this.awaitingParameters = true;

                this.parameterRecorder = {
                    instruction,
                    handlingBlock,
                    fct: result
                };
            }
        }
        else if (result instanceof Array)
        {
            this.candidateBlocks.clear();
            for (const block of result)
                this.candidateBlocks.add(block);

            //@ts-expect-error
            handlingBlock.onUseInstruction(instruction);
        }

        return this.proxy;
    }

    apply(target: {}, thisArg: any, argumentsList: any[]): any
    {
        if (!this.awaitingParameters)
            throw new Error("Instruction is not parametric");

        const result = this.parameterRecorder?.fct.call(this.parameterRecorder.handlingBlock, argumentsList);

        this.candidateBlocks.clear();

        if (result instanceof Function)
        {
            //We have a function - but constructors are also functions. We hence need to check if the returned value was a Block constructor or a callable function.
            if (this.semanticDefinition.blockInstances.has(result))
                //We have a block constructor
                this.candidateBlocks.add(result);
            else
                throw new Error("Expected instruction block as a return value!");
        }
        else if (result instanceof Array)
        {
            for (const block of result)
                this.candidateBlocks.add(block);
        }

        //@ts-expect-error
        this.parameterRecorder!.handlingBlock.onUseParametricInstruction(this.parameterRecorder!.instruction, argumentsList);

        this.awaitingParameters = false;

        return this.proxy;
    }
}