import { InitialInstructionBlock, InstructionBlock, ContinuesWith, Hybrid, InstructionChain, Semantic } from "../source/semantium.ts";

export class ModifyTarget
{
    baseString: string;
    baseNumber: number;
    baseBool: boolean;
}

class MutationBuilder<ResultType = any> extends InstructionChain<ResultType>
{
    modificationResult: ResultType;
}

class ObjectMutator extends InitialInstructionBlock<MutationBuilder<any>> // BaseType is now a generic param for ObjectMutator
{
    transformClass = <TargetEmbeddedType extends new () => any>(arg: TargetEmbeddedType) =>
        ContinuesWith(ModificationBase<InstanceType<TargetEmbeddedType>>);

    transformClosureResult = <ClosureResult>(closure: () => ClosureResult) =>
        ContinuesWith(ModificationBase<ClosureResult>);
}

class ModificationBase<TypeToTransform> extends InstructionBlock<MutationBuilder>
{
    add = Hybrid({
        accessed: ContinuesWith(AddMemberChoices<TypeToTransform>),
        called: <const Name extends string>(memberName: Name) => ContinuesWith(ValueSelector<TypeToTransform, Name>)
    });

    finalize = ContinuesWith(MutationBuilder<TypeToTransform>);
}

class AddMemberChoices<TypeToTransform> extends InstructionBlock<MutationBuilder>
{
    property = Hybrid({
        accessed: ContinuesWith(PropertyNameSelector<TypeToTransform>),
        called: <const Name extends string, Value>(name: Name, value: Value) =>
            ContinuesWith(ModificationBase<TypeToTransform & { [N in Name]: Value }>)
    });

    method = Hybrid({
        accessed: ContinuesWith(MethodNameSelector<TypeToTransform>),
        called: <const Name extends string>(name: Name, parameters: string, body: string) =>
            ContinuesWith(ModificationBase<TypeToTransform & { [N in Name]: Function }>)
    });
}

class ValueSelector<TypeToTransform, Name extends string>
{
    withFunctionBody = (body: string) => ContinuesWith(ModificationBase<TypeToTransform & { [N in Name]: Function }>);
    withValue = <T>(value: T) => ContinuesWith(ModificationBase<TypeToTransform & { [N in Name]: T }>);
}

class PropertyNameSelector<TypeToTransform> extends InstructionBlock<any>
{
    named = <const Name extends string>(name: Name) =>
        ContinuesWith(ChainedPropertyValueSelector<TypeToTransform, Name>);
}

class ChainedPropertyValueSelector<TypeToTransform, Name extends string> extends InstructionBlock<MutationBuilder>
{
    setTo = <Value>(value: Value) =>
        ContinuesWith(ModificationBase<TypeToTransform & { [N in Name]: Value }>);
}

class MethodNameSelector<TypeToTransform> extends InstructionBlock<MutationBuilder>
{
    named = <const Name extends string>(name: Name) =>
        ContinuesWith(MethodParameterSelector<TypeToTransform, Name>);
}

class MethodParameterSelector<TypeToTransform, Name extends string> extends InstructionBlock<MutationBuilder>
{
    withParameters = (params: string) =>
        ContinuesWith(MethodBodySelector<TypeToTransform, Name>);
}

class MethodBodySelector<TypeToTransform, Name extends string> extends InstructionBlock<MutationBuilder>
{
    withBody = (body: string) => ContinuesWith(ModificationBase<TypeToTransform & { [N in Name]: (...args: any[]) => any }>);
}

export const genericAPI = Semantic.DefineAPI({
    blocks: [
        ObjectMutator,
        ModificationBase,
        AddMemberChoices,
        PropertyNameSelector,
        ChainedPropertyValueSelector,
        MethodNameSelector,
        MethodParameterSelector,
        MethodBodySelector
    ],
    resultBuilder: MutationBuilder,
    result: MutationBuilder
});


