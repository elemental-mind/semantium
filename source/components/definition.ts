import { 
    SemanticDefinition,
    EntryPointObject,
 } from "./typeTransformer.js";

export interface Instruction
{
    semantic: Semantic,
    family: typeof InstructionBlock<any>,
    word: string
}

export class Semantic
{
    instructionCatalogue = new Map<string, Instruction[]>();
    blockInstances = new Map<typeof InstructionBlock, InstructionBlock<any>>();
    dictionary: any;

    static Define<T extends SemanticDefinition<any>>(
        definition: T
    ): EntryPointObject<T>
    {
        const library = new Semantic(definition);

        return library.dictionary as EntryPointObject<T>;
    }

    private constructor(
        public definition: SemanticDefinition<any>
    )
    {
        this.generateBlockInstances();
        this.fillCatalogue();
        this.dictionary = this.generateInitProxies();
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
                const instruction: Instruction = {
                    family,
                    word: prop,
                    isParametric: this.isParametric(propDescriptor)
                };

                if (this.instructionCatalogue.has(prop))
                    this.instructionCatalogue.get(prop)?.push(instruction);
                else
                    this.instructionCatalogue.set(prop, [instruction]);
            }
        }
    }

    private generateInitProxies()
    {
        const initGroups = new Set<typeof InstructionBlock>();
        const proxyCollection: any = {};

        for (const [family, instance] of this.blockInstances)
        {
            if (instance instanceof InitialInstructionBlock)
                initGroups.add(family);
        }

        const instructions = [...this.instructionCatalogue.values()].flatMap(i => i);
        for (const instruction of instructions)
        {
            if (initGroups.has(instruction.family))
            {
                if (proxyCollection[instruction.word] !== undefined)
                    throw new Error("Double definition of init word");

                proxyCollection[instruction.word] = new Proxy(function () { }, new InitSensor(this, instruction));
            }
        }

        return proxyCollection;
    }

    private getAllMembers(instance: object, ignoreProps: string[] = []): Map<string, PropertyDescriptor>
    {
        const members = new Map<string, PropertyDescriptor>();

        // Include own properties
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

        // Traverse prototype chain
        let currentObj = Object.getPrototypeOf(instance);
        while (currentObj && currentObj !== Object.prototype)
        {
            const props = Object.getOwnPropertyNames(currentObj);

            for (const prop of props)
            {
                if (prop !== 'constructor' && !ignoreProps.includes(prop))
                {
                    const descriptor = Object.getOwnPropertyDescriptor(currentObj, prop);

                    if (descriptor && !members.has(prop))
                        members.set(prop, descriptor);
                }
            }

            currentObj = Object.getPrototypeOf(currentObj);
        }

        return members;
    }

    private isParametric(descriptor: PropertyDescriptor)
    {
        return descriptor.value instanceof Function && !this.blockInstances.has(descriptor.value);
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
