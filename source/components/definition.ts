import { Trait } from "fusium-js";
import { InitSensor, InstructionRecorder } from "./recording.js";
import { DefaultInstructionRecorder } from "./defaultInstructionRecorder.js";

export interface Instruction
{
    family: typeof InstructionBlock<any>,
    word: string;
    isParametric: boolean;
}

export class Semantics
{
    instructionCatalogue = new Map<string, Instruction[]>();
    blockInstances = new Map<typeof InstructionBlock, InstructionBlock<any>>();
    dictionary: any;

    static Define<
        InstrBlckConstrs extends ParalessConstructor<InstructionBlock<any>>[],
        InstrBldrConstr extends ParalessConstructor<any>>(
            instructionBlocks: InstrBlckConstrs,
            instructionBuilderType?: InstrBldrConstr
        ): EntryPointObject<InstrBlckConstrs, InstrBldrConstr>
    {
        if(!instructionBuilderType)
            //@ts-ignore
            instructionBuilderType = DefaultInstructionRecorder;

        const library = new Semantics(instructionBlocks, instructionBuilderType!);
        return library.dictionary as EntryPointObject<InstrBlckConstrs, InstrBldrConstr>;
    }

    private constructor(
        public instructionBlocks: ParalessConstructor<InstructionBlock<any>>[],
        public RecorderType: ParalessConstructor<InstructionRecorder<any>>
    )
    {
        this.generateBlockInstances();
        this.fillCatalogue();
        this.dictionary = this.generateInitProxies();
    }

    private generateBlockInstances()
    {
        for (const Block of this.instructionBlocks)
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

                proxyCollection[instruction.word] = new Proxy(function () {}, new InitSensor(this, instruction));
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

type EntryPointObject<InstrBlckConstrs extends Array<ParalessConstructor<InstructionBlock<any>>>, InstrRcrdr extends ParalessConstructor<any>> =
    TreatInstructionBlockUnion<
        Filter<
            ArrayOfConstructorsToUnionOfConstructors<InstrBlckConstrs>,
            ParalessConstructor<Beginning>
        >,
        ExtractInstructionResult<InstrRcrdr>
    >;

export type TreatInstructionBlockUnion<BlckUnion extends ParalessConstructor<InstructionBlock<any>>, InstrResult> =
    UnionToIntersection<
        TreatInstructionBlock<
            BlckUnion,
            InstrResult
        >
    >;

export type TreatInstructionBlock<InstrBlckConstr extends ParalessConstructor<InstructionBlock<any>>, InstrReslt> =
    InstrBlckConstr extends ParalessConstructor<Finishing> ?
    AddInstructionResultMembers<
        UnwrapBlockMemberTypesOrReturns<
            InstanceType<InstrBlckConstr>,
            InstrReslt
        >,
        InstrReslt
    >
    : UnwrapBlockMemberTypesOrReturns<
        InstanceType<InstrBlckConstr>,
        InstrReslt
    >;

type UnwrapBlockMemberTypesOrReturns<InstrBlck, InstrReslt> = {
    [MemberName in keyof InstrBlck]:
    InstrBlck[MemberName] extends (...args: any[]) => any ?
    UnwrapMemberReturn<InstrBlck[MemberName], InstrReslt> :
    UnwrapMemberType<InstrBlck[MemberName], InstrReslt>;
};

type UnwrapMemberReturn<Member, InstrRslt> =
    Member extends (...args: infer A) => Array<infer InstrBlckConstrs extends ParalessConstructor<InstructionBlock<any>>> ? (...args: A) => TreatInstructionBlockUnion<InstrBlckConstrs, InstrRslt> :
    Member extends (...args: infer A) => (infer InstrBlckConstr extends ParalessConstructor<InstructionBlock<any>>) ? (...args: A) => TreatInstructionBlock<InstrBlckConstr, InstrRslt> :
    never;

type UnwrapMemberType<Member, InstrReslt> =
    Member extends Array<infer InstrBlckConstrs extends ParalessConstructor<any>> ? TreatInstructionBlockUnion<InstrBlckConstrs, InstrReslt> :
    Member extends ParalessConstructor<InstructionBlock<any>> ? TreatInstructionBlock<Member, InstrReslt> :
    never;

type AddInstructionResultMembers<InstrBlck, InstrRslt> = {
    [Member in keyof InstrBlck]:
    InstrBlck[Member] extends (...args: infer A) => infer R ?
    (...args: A) => R & InstrRslt :
    & InstrBlck[Member] & InstrRslt
};

type UnionToIntersection<U> =
    (U extends any ? (x: U) => any : never) extends
    (x: infer I) => any ? I : never;

type ParalessConstructor<InstanceType = any> = abstract new () => InstanceType;

type ArrayOfConstructorsToUnionOfConstructors<T extends any[]> = T extends Array<infer E> ? E : never;

type Filter<InstanceTypeUnion, Match> = InstanceTypeUnion extends Match ? InstanceTypeUnion : never;

type ExtractInstructionResult<BuilderType extends ParalessConstructor<any>> = BuilderType extends ParalessConstructor<InstructionRecorder<infer T>> ? T : InstanceType<BuilderType>;

//#endregion