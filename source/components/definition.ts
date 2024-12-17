import
{
    SemanticDefinition,
    EntryPointObject as Dictionary,
} from "./typeTransformer.js";

export class Semantic
{
    instructionCatalogue = new Map<string, Instruction[]>();
    blockInstances = new Map<typeof InstructionBlock, InstructionBlock<any>>();
    dictProxy: Dictionary<any>;

    static Define<T extends SemanticDefinition<any>>(
        definition: T,
        withAutoInitializers: boolean
    ): Dictionary<T>
    {
        const library = new Semantic(definition);

        return library.dictProxy as Dictionary<T>;
    }

    private constructor(
        public definition: SemanticDefinition<any>
    )
    {
        this.dictProxy = new Proxy({}, {});
        this.generateBlockInstances();
        this.fillCatalogue();
    }

    public getInstruction(permittedBlocks: Array<typeof InstructionBlock<any>>, word: string): Instruction | undefined
    {
        const instructionCandidates = this.instructionCatalogue.get(word);

        if (!instructionCandidates)
            return undefined;
        else
        {
            const instruction = instructionCandidates.find(instruction => permittedBlocks.includes(instruction.family));

            if(!instruction)
                throw new Error("Use of instruction not permitted in this context.");
            
            return instruction;
        }
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
            const members = this.getAllMembers(instance, ["record", "onUseInstruction", "onUseParametricInstruction"]);

            for (const [prop, propDescriptor] of members) 
            {
                const instruction = Instruction.From(this, family, prop);

                if (this.instructionCatalogue.has(prop))
                    this.instructionCatalogue.get(prop)?.push(instruction);
                else
                    this.instructionCatalogue.set(prop, [instruction]);
            }
        }
    }

    private getAllMembers(instance: object, ignoreProps: string[] = []): Map<string, PropertyDescriptor>
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

//#region Base Classes

export class InstructionBlock<T> 
{
    protected record!: T;

    protected onUseInstruction(instruction: Instruction)
    {
        //@ts-expect-error
        this.record.onAddInstruction?.(instruction);
    }

    protected onUseParametricInstruction(instruction: Instruction, parameters: any[])
    {
        //@ts-expect-error
        this.record.onAddInstruction?.(instruction, parameters);
    }
}

export class InitialInstructionBlock<T> extends InstructionBlock<T>
{
    //We declare a virtual member here for type matching purposes.
    declare private _initInstructionBlock: void;
}

//#endregion

//#region Instruction Management

abstract class Instruction
{
    static From(
        semantic: Semantic,
        family: typeof InstructionBlock<any>,
        word: string)
    {
        const definition: any = semantic.blockInstances.get(family)![word as keyof InstructionBlock<any>];

        if ("whenAccessed" in definition && "whenCalled" in definition)
            return new HybridInstruction(semantic, family, word);
        if (definition instanceof Array || (typeof definition === "function" && definition.prototype instanceof InstructionBlock))
            return new StaticInstruction(semantic, family, word);
        if (typeof definition === "function")
            return new ParametricInstruction(semantic, family, word);
        else
            throw new Error("Unsupported definition member!");
    }

    constructor(public readonly semantic: Semantic, public readonly family: typeof InstructionBlock<any>, public readonly word: string) { }
}

export class StaticInstruction extends Instruction { }

export class HybridInstruction extends Instruction { }

export class ParametricInstruction extends Instruction { }

//#endregion