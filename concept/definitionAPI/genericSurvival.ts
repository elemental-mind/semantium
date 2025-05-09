
type AnyConstructor = new (...args: any[]) => any;
type ConstructorTuple = ReadonlyArray<AnyConstructor>;
type MapConstructorsToInstances<T extends ConstructorTuple> = { [K in keyof T]: T[K] extends AnyConstructor ? InstanceType<T[K]> : never; };
type Intersect<Tuple> = Tuple extends [infer Head, ...infer Tail] ? Head & Intersect<Tail> : unknown;

type HybridDefinition<AccessedType, CalledType extends Function> = {
    accessed: AccessedType,
    called: CalledType,
};

function ContinuesWith<T extends ConstructorTuple>(...constructors: T)
{
    return constructors as Intersect<MapConstructorsToInstances<T>>;
}

function Hybrid<AccessedType, CalledType extends Function>(definition: HybridDefinition<AccessedType, CalledType>)
{
    return definition as unknown as AccessedType & CalledType;
}

class TestBaseType
{
    foo: string;
    bar: number;
    baz: boolean;
}

class GenericDefinition<BaseType>
{
    propMember = ContinuesWith(Successor<BaseType>, TestBaseType);
    parametricMember = <SubType>(arg: SubType) => ContinuesWith(Successor<SubType>);

    member = Hybrid({
        accessed: ContinuesWith(TestBaseType),
        called: <SubType>(arg: new () => SubType) => ContinuesWith(arg),
    });

    multiReturnMember = Hybrid({
        accessed: ContinuesWith(TestBaseType),
        called: <SubType>(arg: SubType) => ContinuesWith(GenericContinuation<BaseType, SubType>, Successor<BaseType>)
    });

    test = Hybrid({
        accessed: ContinuesWith(Successor<BaseType>),
        called: (arg: number) => ContinuesWith(GenericDefinition)
    });
}

class GenericContinuation<BaseType, SubType>
{
    base: BaseType;
    sub: SubType;
}

class Successor<T>
{
    continueMember: T;
}

const test = {} as GenericDefinition<TestBaseType>;
test.member(Successor<{}>).continueMember;
test.member.foo;
test.parametricMember({ abc: 1 }).continueMember.abc;
test.multiReturnMember(new Successor<{ abc: 1 }>()).sub.continueMember.abc;
