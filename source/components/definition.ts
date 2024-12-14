import { Trait } from "fusium-js";
import { InitSensor, InstructionRecorder } from "./recording.js";

export interface Instruction
{
    family: typeof InstructionBlock<any>,
    word: string;
    isParametric: boolean;
}

interface PureSemantic<T extends ParalessConstructor<any>>
{
    blocks: ParalessConstructor<InstructionBlock<InstanceType<T>>>[];
    result: T;
}

interface RecorderSemantic<T extends GenericConstructor<any, any>>
{
    blocks: ParalessConstructor<InstructionBlock<InstanceType<T>>>[];
    recorder: ParalessConstructor<InstructionRecorder<InstanceType<T>>>;
    result: T;
}

export class Semantics
{
    instructionCatalogue = new Map<string, Instruction[]>();
    blockInstances = new Map<typeof InstructionBlock, InstructionBlock<any>>();
    dictionary: any;

    static Define<M extends SemanticDefinition<any>, T extends GenericConstructor<any, any>>(
        definition: SemanticDefinition<T>
    ): EntryPointObject<M>
    {
        const library = new Semantics(definition);

        return library.dictionary as EntryPointObject<M>;
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
            if (instance instanceof Beginning)
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

export class InstructionBlock<T> extends Trait
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

export class Beginning extends Trait
{
    // protected containsInitials = true;
}

export class Finishing extends Trait
{
    // protected containsCompletions = true;
}

//#endregion

//#region Types

type SemanticDefinition<T extends GenericConstructor<any, any>> = PureSemantic<T> | RecorderSemantic<T>;

export type EntryPointObject<M extends SemanticDefinition<any>> =
    M extends {
        blocks: infer BlockClasses extends Array<ParalessConstructor<InstructionBlock<any>>>, 
        result: infer ResultClass extends GenericConstructor<any, any>
    } ?
    TransformContinuationArray<Filter<ArrayOfConstructorsToUnionOfConstructors<BlockClasses>, ParalessConstructor<Beginning>>,ResultClass> :
    never;
    
type TransformContinuationArray<ContinuationOptions extends ParalessConstructor<InstructionBlock<any>>, ResultClass extends GenericConstructor> =
    UnionToIntersection<TransformInstructionBlock<InstanceType<ContinuationOptions>, ResultClass>>;

export type TransformInstructionBlock<BlockInstance, ResultClass extends GenericConstructor> = {
    [MemberName in keyof BlockInstance]:
    BlockInstance[MemberName] extends (...args: any[]) => any ? TransformParametricWord<BlockInstance[MemberName], ResultClass> :
    BlockInstance[MemberName] extends HybridMember<any, any, any> ? TransformHybridWord<BlockInstance[MemberName], ResultClass> :
    TransformWord<BlockInstance[MemberName], ResultClass>;
};

type TransformParametricWord<Member, ResultClass extends GenericConstructor> =
    Member extends (...args: infer Parameters) => infer ContinuationBlocks ? 
    (...args: Parameters) => TransformContinuation<ContinuationBlocks, ResultClass> :
    never;

export type TransformHybridWord<Member, ResultClass extends GenericConstructor> =
    Member extends HybridMember<infer Parameters, infer CalledContinuation, infer AccessContinuation> ?
    { (...args: Parameters): TransformContinuation<CalledContinuation, ResultClass>; } & TransformContinuation<AccessContinuation, ResultClass>
    : never;

type TransformWord<WordDefinition, ResultClass extends GenericConstructor> = TransformContinuation<WordDefinition, ResultClass>;

export type TransformContinuation<Continuation, ResultClass extends GenericConstructor> =
    Continuation extends Array<infer BlockClasses extends (ParalessConstructor<any> | ResultClass)> ? TransformContinuationArray<BlockClasses, ResultClass> :
    Continuation extends ParalessConstructor<InstructionBlock<any>> ? TransformInstructionBlock<Continuation, ResultClass> :
    Continuation extends ResultClass ? InstanceType<ResultClass> :
    never;

type HybridMember<Parameters extends Array<unknown>, CalledContinuation, AccessContinuation> = { whenCalled: (...args: Parameters) => CalledContinuation, whenAccessed: AccessContinuation; };

type ParalessConstructor<InstanceType = any> = abstract new () => InstanceType;
type GenericConstructor<Parameters extends Array<any> = any, InstanceType = any> = { new(...args: Parameters): InstanceType; };

type UnionToIntersection<U> =
    (U extends any ? (x: U) => any : never) extends
    (x: infer I) => any ? I : never;

type ArrayOfConstructorsToUnionOfConstructors<T extends any[]> = T extends Array<infer E> ? E : never;

type Filter<InstanceTypeUnion, Match> = InstanceTypeUnion extends Match ? InstanceTypeUnion : never;

type ResultMembers<RecorderType extends ParalessConstructor<any>> = RecorderType extends ParalessConstructor<InstructionRecorder<infer T>> ? T : RecorderType;

//#endregion
