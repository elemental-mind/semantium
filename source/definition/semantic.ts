import { RootSensor } from "../recording/sensors.js";
import { SemanticDefinition, EntryPointObject as Dictionary } from "./definitionTyping.js";
import { HybridInstructionDefinition, InstructionDefinition } from "./instructions.js";

export class Semantic
{
    instructionCatalogue = new Map<string, InstructionDefinition[]>();
    blockInstances = new Map<typeof InstructionBlock, InstructionBlock<any>>();
    initBlocks: typeof InstructionBlock<any>[];
    root: Dictionary<any>;

    static Define<T extends SemanticDefinition<any>>(definition: T)
    {
        return (new Semantic(definition)).root as Dictionary<T>;
    }

    constructor(
        public definition: SemanticDefinition<any>
    )
    {
        this.initBlocks = this.definition.blocks.filter(block => Object.getPrototypeOf(block) === InitialInstructionBlock);

        this.generateBlockInstances();
        this.fillCatalogue();

        this.root = RootSensor.Create(this);
    }

    public generateNewInstructionChain()
    {
        if (this.definition.instructionChain)
            return new this.definition.instructionChain(this);
        else
            return new this.definition.result();
    }

    public findInstructionDefinition(permittedBlocks: Array<typeof InstructionBlock<any>>, instructionName: string): InstructionDefinition | undefined
    {
        const instructionCandidates = this.instructionCatalogue.get(instructionName);

        if (!instructionCandidates)
            return undefined;
        else
            return instructionCandidates.find(instruction => permittedBlocks.includes(instruction.family));
    }

    public getPermittedStaticContinuations(instruction: InstructionDefinition, chain: any)
    {
        const instructionBlock = this.blockInstances.get(instruction.family)!;

        //We need to set the record here, as [instruction.word] may be a getter making use of manipulationg the record and not only a property.
        //record is protected on InstructionBlock to make the intellisense easier. This way we prevent every instructionBlock to have a "record" instruction.
        //We could solve this more elegantly in our type transformation, but for now this just works.
        //@ts-expect-error
        instructionBlock.chain = chain;

        let continuations;

        if (instruction instanceof HybridInstructionDefinition)
        {
            //@ts-ignore
            if (typeof instructionBlock[instruction.word].whenAccessed === "function")
                //@ts-ignore
                continuations = instructionBlock[instruction.word].whenAccessed();
            else
                //@ts-ignore
                continuations = instructionBlock[instruction.word].whenAccessed;
        }
        else
        {
            //@ts-ignore
            continuations = instructionBlock[instruction.word];
        }

        //@ts-expect-error
        instructionBlock.chain = null;

        return continuations;
    }

    public getPermittedParametricContinuations(instruction: InstructionDefinition, chain: any, parameters: any[])
    {
        const instructionBlock = this.blockInstances.get(instruction.family)!;

        //@ts-expect-error
        instructionBlock.chain = chain;

        let continuations;

        if (instruction instanceof HybridInstructionDefinition)
        {
            //@ts-ignore
            continuations = instructionBlock[instruction.word].whenCalled(...parameters);
        }
        else
        {
            //@ts-ignore
            continuations = instructionBlock[instruction.word](...parameters);
        }

        //@ts-expect-error
        instructionBlock.chain = null;

        return continuations;
    }

    private generateBlockInstances()
    {
        for (const Block of this.definition.blocks)
            //@ts-ignore
            this.blockInstances.set(Block, new Block());
    }

    private fillCatalogue()
    {
        for (const [family, instance] of this.blockInstances)
        {
            const members = this.collectInstructions(instance, ["record", "onUseInstruction", "onUseParametricInstruction"]);

            for (const [prop, propDescriptor] of members) 
            {
                const instruction = InstructionDefinition.From(this, family, prop);

                if (this.instructionCatalogue.has(prop))
                    this.instructionCatalogue.get(prop)?.push(instruction);
                else
                    this.instructionCatalogue.set(prop, [instruction]);
            }
        }
    }

    private collectInstructions(instance: object, ignoreProps: string[] = []): Map<string, PropertyDescriptor>
    {
        const members = new Map<string, PropertyDescriptor>();

        const ownProps = Object.getOwnPropertyNames(instance);
        for (const prop of ownProps)
        {
            if (prop !== 'constructor' && !ignoreProps.includes(prop))
            {
                const descriptor = Object.getOwnPropertyDescriptor(instance, prop);

                if (descriptor)
                    members.set(prop, descriptor);
            }
        }

        return members;
    }
}

export class InstructionBlock<T> 
{
    protected chain!: T;

    protected onUseInstruction(instruction: InstructionDefinition)
    {
        //@ts-expect-error
        this.chain.onAddInstruction?.(instruction);
    }

    protected onUseParametricInstruction(instruction: InstructionDefinition, parameters: any[])
    {
        //@ts-expect-error
        this.chain.onAddInstruction?.(instruction, parameters);
    }
}

export class InitialInstructionBlock<T> extends InstructionBlock<T>
{
    //We declare a virtual member here for type matching purposes.
    declare private _initInstructionBlock: void;
}

