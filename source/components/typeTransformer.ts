import { InstructionBlock, Beginning } from "./definition.js";
import { PureSemantic, RecorderSemantic } from "./definition.js";

export type SemanticDefinition<T extends GenericConstructor<any, any>> = PureSemantic<T> | RecorderSemantic<T>;

export type EntryPointObject<M extends SemanticDefinition<any>> =
    M extends {
        blocks: infer BlockClasses extends Array<GenericConstructor>,
        result: infer ResultClass extends GenericConstructor<any, any>;
    } ?
    TransformContinuationArray<FilterType<BlockClasses, Beginning>, ResultClass> :
    never;

export type TransformContinuationArray<ContinuationOptions extends ParalessConstructor<InstructionBlock<any>>, ResultClass extends GenericConstructor> =
    UnionToIntersection<TransformInstructionBlock<InstanceType<ContinuationOptions>, ResultClass>>;

export type TransformInstructionBlock<BlockInstance, ResultClass extends GenericConstructor> = {
    [MemberName in keyof BlockInstance]:
    BlockInstance[MemberName] extends (...args: any[]) => any ? TransformParametricWord<BlockInstance[MemberName], ResultClass> :
    BlockInstance[MemberName] extends HybridMember<any, any, any> ? TransformHybridWord<BlockInstance[MemberName], ResultClass> :
    TransformStaticWord<BlockInstance[MemberName], ResultClass>;
};

export type TransformParametricWord<Member, ResultClass extends GenericConstructor> =
    Member extends (...args: infer Parameters) => infer ContinuationBlocks ?
    (...args: Parameters) => TransformContinuation<ContinuationBlocks, ResultClass> :
    never;

export type TransformHybridWord<Member, ResultClass extends GenericConstructor> =
    Member extends HybridMember<infer Parameters, infer CalledContinuation, infer AccessContinuation> ?
    { (...args: Parameters): TransformContinuation<CalledContinuation, ResultClass>; } & TransformContinuation<AccessContinuation, ResultClass>
    : never;

export type TransformStaticWord<WordDefinition, ResultClass extends GenericConstructor> = TransformContinuation<WordDefinition, ResultClass>;

export type TransformContinuation<Continuation, ResultClass extends GenericConstructor> =
    Continuation extends Array<infer BlockClasses extends (ParalessConstructor<any> | ResultClass)> ? TransformContinuationArray<BlockClasses, ResultClass> :
    Continuation extends ParalessConstructor<InstructionBlock<any>> ? TransformInstructionBlock<InstanceType<Continuation>, ResultClass> :
    Continuation extends ResultClass ? InstanceType<ResultClass> :
    never;

type HybridMember<Parameters extends Array<unknown>, CalledContinuation, AccessContinuation> =
    {
        whenCalled: (...args: Parameters) => CalledContinuation,
        whenAccessed: (() => AccessContinuation) | AccessContinuation;
    };

export type ParalessConstructor<InstanceType = any> = abstract new () => InstanceType;
export type GenericConstructor<Parameters extends Array<any> = any, InstanceType = any> = { new(...args: Parameters): InstanceType; };

type UnionToIntersection<U> =
    (U extends any ? (x: U) => any : never) extends
    (x: infer I) => any ? I : never;

type FilterType<Classes extends Array<GenericConstructor>, TargetType> =
    Classes extends Array<infer C extends GenericConstructor> ? C extends C ? InstanceType<C> extends TargetType ? C : never : never : never;