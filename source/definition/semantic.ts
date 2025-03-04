import { RootSensor, InstructionSensor, SensorSym } from "../recording/sensors.ts";
import { InstructionChain, ParametricInstructionUse, StaticInstructionUse } from "../semantium.ts";
import type { SemanticDefinition, EntryPointObject as Dictionary, TransformContinuationArray } from "./definitionTyping.ts";
import { HybridInstructionDefinition, InstructionDefinition, StaticInstructionDefinition } from "./instructions.ts";

export class Semantic<T extends SemanticDefinition<any>>
{
    blocks = new Map<typeof InstructionBlock, { instance: InstructionBlock<any>, instructionMap: Map<string, InstructionDefinition>, instructions: Array<InstructionDefinition>; }>();
    initBlocks: typeof InstructionBlock<any>[];
    root: Dictionary<T>;

    static DefineAPI<T extends SemanticDefinition<any>>(definition: T)
    {
        return (new Semantic(definition)).root as Dictionary<T>;
    }

    static SubstituteInstructionChain<T>(instructionSequence: T, chain: InstructionChain<any>)
    {
        const proxy = instructionSequence as any;
        (proxy[SensorSym] as InstructionSensor).replaceChain(chain);
        return proxy as T;
    }

    constructor(
        public definition: T
    )
    {
        this.initBlocks = this.definition.blocks.filter(block => Object.getPrototypeOf(block) === InitialInstructionBlock);

        this.initializeBlocks();

        this.root = RootSensor.Create(this);
    }

    public primedWith(chain: InstructionChain<any>)
    {
        return RootSensor.Create(this, chain) as Dictionary<T>;
    }

    public continuationWith<M extends typeof InstructionBlock<any>>(permittedContinuations: Array<M>, chain?: InstructionChain<any>)
    {
        return InstructionSensor.FromContinuations(chain ?? this.generateNewInstructionChain(), new ContinuationSet(this, permittedContinuations)) as TransformContinuationArray<M, T["result"]>;
    }

    public generateNewInstructionChain(): InstanceType<T["instructionChain"]>
    {
        if (this.definition.instructionChain)
            return new this.definition.instructionChain(this) as InstanceType<T["instructionChain"]>;
        else
            return new this.definition.result();
    }

    public triggerInstructionUseHooksAndGetPermittedContinuations(instructionUse: StaticInstructionUse | ParametricInstructionUse, chain: any)
    {
        const continuations = this.applyInstructionUse(instructionUse, chain);

        return new ContinuationSet( this, continuations instanceof Array ? continuations : [continuations]);
    }

    public applyInstructionUse(instructionUse: StaticInstructionUse | ParametricInstructionUse, chain: any)
    {
        const instructionBlock = this.blocks.get(instructionUse.instruction.family)!.instance;

        //We need to set the record here, as [instruction.word] may be a getter making use of manipulationg the record and not only a property.
        //record is protected on InstructionBlock to make the intellisense easier. This way we prevent every instructionBlock to have a "record" instruction.
        //We could solve this more elegantly in our type transformation, but for now this just works.
        //@ts-expect-error
        instructionBlock.chain = chain;

        instructionBlock.onInstructionUse(instructionUse);

        let continuations;

        if (instructionUse instanceof StaticInstructionUse)
            continuations = this.getStaticContinuations(instructionUse.instruction, instructionBlock);

        if (instructionUse instanceof ParametricInstructionUse)
            continuations = this.getParametricContinuations(instructionUse.instruction, instructionUse.parameters, instructionBlock);

        //@ts-expect-error
        instructionBlock.chain = null;

        return continuations;
    }

    private getStaticContinuations(instruction: InstructionDefinition, instructionBlockInstance: any)
    {
        if (!(instruction instanceof HybridInstructionDefinition))
            return instructionBlockInstance[instruction.word];

        //In case we have a HybridInstructionDefinition, we need to differentiate further
        const instructionMember = instructionBlockInstance[instruction.word].whenAccessed;

        //We check for a closure here (we might be given a class constructor, so we need to differentiate with .prototype)
        if (typeof instructionMember === "function" && !instructionMember.prototype)
            return instructionMember();
        else
            return instructionMember;
    }

    private getParametricContinuations(instruction: InstructionDefinition, parameters: any[], instructionBlockInstance: any)
    {
        if (instruction instanceof HybridInstructionDefinition)
            return instructionBlockInstance[instruction.word].whenCalled.apply(instructionBlockInstance, parameters);
        else
            return instructionBlockInstance[instruction.word].apply(instructionBlockInstance, parameters);
    }

    private initializeBlocks()
    {
        for (const BlockType of this.definition.blocks)
        {
            const instance = new BlockType();
            const instructionMap = this.initializeInstructions(BlockType, instance);
            const instructions = [...instructionMap.values()];

            this.blocks.set(BlockType, { instance, instructionMap, instructions });
        }
    }

    private initializeInstructions(BlockType: typeof InstructionBlock<any>, instance: InstructionBlock<any>): Map<string, InstructionDefinition>
    {
        const instructions = new Map<string, InstructionDefinition>();
        const descriptors = this.collectPropertyDescriptors(instance);

        for (const key in descriptors)
        {
            if (["constructor", "chain", "onInstructionUse"].includes(key))
                continue;

            const descriptor = descriptors[key];

            let instructionDefinition;
            if (descriptor.get)
                instructionDefinition = new StaticInstructionDefinition(this, BlockType, key);
            else if (descriptor.value)
                instructionDefinition = InstructionDefinition.From(this, BlockType, instance, key);
            else
                continue;

            instructions.set(key, instructionDefinition);
        }

        return instructions;
    }

    private collectPropertyDescriptors(object: any)
    {
        if (object === Object.prototype || object === null)
            return {};

        const baseProperties: PropertyDescriptorMap = this.collectPropertyDescriptors(Object.getPrototypeOf(object));
        return Object.assign(baseProperties, Object.getOwnPropertyDescriptors(object));
    }
}

export class InstructionBlock<T> 
{
    //@ts-ignore
    protected chain!: T = null;

    onInstructionUse(instructionUseData: StaticInstructionUse | ParametricInstructionUse) { }
}

export class InitialInstructionBlock<T> extends InstructionBlock<T>
{
    //We declare a virtual member here solely for type matching purposes.
    declare private _initInstructionBlock: void;
}

export enum AccessType
{
    Result,
    Instruction,
    Invalid
}

export class ContinuationSet
{
    public readonly blockTypes: Array<typeof InstructionBlock>;
    public readonly instructions = new Map<string, InstructionDefinition>();
    public readonly allowsResultAccess: boolean;

    constructor(semantic: Semantic<any>, continuations: Array<any>)
    {
        this.blockTypes = continuations.filter(continuation => continuation !== semantic.definition.result);

        for (const blockType of this.blockTypes)
        {
            if (!semantic.blocks.has(blockType))
                throw new Error(`The returned continuation class "${blockType.name}" is not part of the defined grammar.`);

            for (const [instructionName, instructionDefinition] of semantic.blocks.get(blockType)!.instructionMap)
                this.instructions.set(instructionName, instructionDefinition);
        }

        this.allowsResultAccess = continuations.length !== this.blockTypes.length;
    }

    public resolvePropertyAccess(property: string): { type: AccessType, instruction?: InstructionDefinition; }
    {
        if (this.instructions.has(property))
            return { type: AccessType.Instruction, instruction: this.instructions.get(property) };
        else
            return this.allowsResultAccess ? { type: AccessType.Result } : { type: AccessType.Invalid };
    }
}
