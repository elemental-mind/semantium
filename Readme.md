# Semantium

Fluent APIs and DSLs provide an intuitive way to express complex logic in code.
This library provides a framework for building fluent APIs (and typed DSLs) in
TypeScript. It allows you to define custom grammars and create expressive,
chainable APIs that represent complex instructions with full IntelliSense and typing support.

Imagine, for example, a library is desired that would allow to create type-guarded objects - but through a fluent API:

```typescript
    import {API, Strings, Numbers} from "mySampleProject/uselessDemoObjectBuilder/API.ts";

    //Semantium helps you creating the "API" object,
    const customObject = API.create.an.object.with.property("X").accepting(Numbers).and.property("Y").acceptingEverythingBut(Strings); 
    const customArray = API.create.an.array.of(Strings).with(5).elements;

    const progressObjectTemplate = API.template.an.object.with.property("percent").accepting(Numbers).inRange(0, 100);

    customObject.X = 100;
    customObject.Y = "string"; //Would throw an error, as everything but strings allowed per definition
    customObject.Z = 100; //Would throw an error, as property is not defined

    customArray[6] = 100; //Would throw an out of bounds error, as max 5 elements allowed
    assert(customArray.length === 5);

    const progress = progressObjectTemplate.instantiate();
    progress.percent = 200; //Would throw an out of bounds error
```

Defining valid API access paths and interpreting and processing the `.create.an.object.with.property("X").accepting(Numbers).and.property("Y").accepting(Strings)` part, for example, can be daunting
tasks that Semantium greatly simplifies.

This library provides tools and methods for:

- Defining **instructions and grammar rules (which word follows which) using classes** and TypeScript's type system making your APIs **type-safe with Intellisense support**.
- **Enforcing valid sequences of instructions** through type constraints.
- **Recording and processing sequences** of instructions for execution or analysis.

Throughout this Readme we will follow the above example and do a rough implementation of it using Semantium's primitives.

## Installation

To install Semantium using npm, run the following command in your project directory:

```console
npm install semantium
```

## Core Concepts

In semantium you are defining a **Grammar** (allowed sequences of words) that users of your library can use.

In order to define an API and fill it with life, semantium provides the following primitives:
- **Instruction Blocks**: These are classes, whose members form a logical group of **instructions** (or words like "and", "property", "accepting" etc. in our previous example) in your grammar/language.
- **Instruction Chains**: This records the access chains of your grammar into something that is actually meaningful to your program. Everytime a "word" of your grammar gets used (property access/function call), the applicable instruction chain has a new element added. In our example an abstracfitied instruction chain of the array definition would look like [create, an, array, of(Strings), with(5), elements].
- A **Semantic**: A Semantic bundles your instruction blocks and a your instruction chains to provide a comprehensive type-safe grammar.

In general on the defining side you have three main steps to follow:
1. Define your instruction chain behaviour
2. Define the "words" available in your API, the relationship between them, and possible behaviours (what happens when a word gets used).
3. Wrap it all in a Semantic and provide your defined API to the user.

### Instruction Chains

Everything in your fluent API revolves around the stream of instructions that the user creates through his property accesses and function calls. 
An instruction chain has kind of a lifetime:
- It **begins** with acccessing a property on your API object
- It **ends** when accessing a property of your **result object** 

If we analyze `API.create.an.array.of(Strings).with(5).elements.length;` for example, the first element of the instruction chain would be "create", the last element would be "elements", 
as "length" is a property access on the desired result object (refer to point 3 in the following list to see how that's determined).

To define an API, Semantium asks you for an object that conforms to the `InstructionChain` class interface. In practice, you provide an extended class with base class `InstructionChain` .
This class gets triggered with certain hooks that help you capture the lifetime of an instruction chain:
1. The instruction chain's class is instantiated every time a new instruction chain begins. You can capture this, by putting logic at the beginning of an instruction chain in the constructor.
2. Every time a property gets accessed or function gets called the `onInstruction` method gets called on your chain's instance. It gets provided with either a `StaticInstructionUse` in case of a normal property access (<...>.property.<...>) or a `ParametricInstructionUse` in case of a property call (<...>.calledProperty(parameter1, paramter2).<...>).
By default (base class) this hook does nothing.
3. Before a property of your result object gets accessed (`<...>.elements.length` in our example) the `finalizeRecording` method gets called and should return the result object. By default (base class) nothing is done and the instruction chain instance is returned as the result object.
To determine whether a property access is interpreted as a desired access on the result object, the following logic is applied: 
    1. Does the grammar allow access to the result object? If no, no result access is assumed.
    2. If yes, Semantium looks at the subsequent possible instructions. Does a subsequent possible instruction match the desired property? If yes, no result access is assumed.
    3. If no, then a result access is assumed. Has this intruction chain been finalized before? If yes, the previous finalization result is used.
    4. If no, then the `finalizeRecording` hook is called and its result is then used.
    5. The property access gets resolved on the finalization result.

Let's dive back into our introductory example with some pseudocode:

```typescript
//We derive from InstructionChain. We use `GuardedObject` as a generic argument here, as this is the result of our chain calls.
class ObjectGuardChain extends InstructionChain<GuardedObject>
 { 
    definitionType: "TemplateDefinition" | "ObjectDefinition";
    objectDefinition : ArrayDefinition | ObjectDefinition;

    //We don't have anything to do when a new chain gets introduced, we hence skip the constructor

    //This gets called anytime any property of our API and subsequent accesses get used.
    onInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse): void 
    {
        //For demonstration purposes let's just handle the following words.
        switch (instructionUse.instruction.word)
        {
            case "create":
                this.definitionType = "ObjectDefinition";
                return;
            case "template":
                this.definitionType = "TemplateDefinition";
                return;
            default:
                //The rest we will leave to instruction block hooks (another way to intercept word uses we see later)
                return;
        }
    }

    //This gets called before a property on the result object is called
    finalizeRecording()
    {
        if(definitionType == "TemplateDefinition")
            //ObjectInstantiator would have the instantiate() method;
            return new ObjectInstantiator(this.objectDefinition) as GuardedObject;
        else
            //We return a proxy here to guard property setting. ObjectGuard takes care of ensuring the constraints when setting properties.
            return new Proxy({}, new ObjectGuard(this.objectDefinition)) as GuardedObject;
    }
}
```
>Note: Avoid global side effects in `onInstruction` hooks, as it may not be obvious when this hook gets called due to forking. To understand forking, read on.

>Note: The result type of any instruction chain must always be an object and can not be a primitive type like number, string, boolean etc.

### Instruction Chain Forking

One problem with instruction chains is that they do not always occur linearly. It's totally valid to use our example API the following way:

```typescript
    const customObjectPart1 = API.create.an.object.with.property("X").accepting(Numbers);
    //We reuse the first definition here
    const customObjectPart2 = customObjectPart1.and.property("Y").acceptingEverythingBut(Strings);

    //X and Y defined on object
    customObject.X;
    customObject.Y;
```

A problem occurs however, when two chains get continued in different ways.

```typescript
    const base = API.create.an.object.with.property("X").accepting(Numbers);
    //First use of base
    const extension1 = base.and.property("Y").acceptingEverythingBut(Strings);
    //second use of base
    const extensions = base.and.property("Z").accepting(Booelans);
```
Semantium interprets this as a fork. `extensions2` will *not* accept `X`, `Y`, `Z`. It's rather interpreted as:
```typescript
    const extension1 = API.create.an.object.with.property("X").accepting(Numbers).and.property("Y").acceptingEverythingBut(Strings);
    const extension3 = API.create.an.object.with.property("X").accepting(Numbers).and.property("Z").accepting(Booelans);
```
This means that `extension1`and `extension2` are actually two separate instruction chains (and they are treated this way by Semantium, instantiating two separate `ObjectGuardChains` feeding the appropriate sequence of instructions to each one of them). Note that `base` does not get a separate instruction chain - unless of course later a result property would get accessed on it as well.

>Note: Accessing two different properties on a result object does not lead to forking, though. `extension1.X;` then `extension1.Y;` is not a fork. Here the finalization result of the `.X` access would be reused to for the `.Y` access.

### Instruction Blocks

By now you might ask yourself how we actually define the words used in the API. We do this through Instruction blocks.

Instruction blocks are classes that represent a group of related instructions or words in your DSL. They extend the InstructionBlock class and define the methods or properties that correspond to the instructions available at that point in the
grammar. The (return) types of the respective members define the instruction group(s) that can follow after the usage of the defined instruction;

Let's go and define some Instruction Blocks for our example case:
```typescript
//We start by extending either InstructionBlock or InitialInstructionBlock
//The generic is the type of our instructionChain class used to "record" instructions
class InstantiationSelection extends IntialInstructionBlock<ObjectGuardChain>
{
    //For each word we define the successor block of words
    //Here, after the use of "create", all words defined in InstFiller are allowed. 
    //Only "an" in this case.
    create = InstFiller;
    template = InstFiller;
}

//Because "an" is not directly accessible on the API object, but only later in the chain, we use 
//InstructionBlock as the base class instead of InitialInstructionBlock
class InstFiller extends InstructionBlock<ObjectGuardChain>
{
    //Here, after the use of "an", all words defined in TypeSelection are allowed.
    //Either "object" or "array". So <...>.an.object.<...> and <...>.an.array.<...> are valid paths.
    an = TypeSelection;
}

class TypeSelection extends InstructionBlock<ObjectGuardChain>
{
    //We can also hook into instruction uses on each instruction we define.
    //This works through getters for static instructions (instructions without parameters and function calls)
    //"this.chain" gets set to the currently applicable chain to manipulate it
    get object() { 
        this.chain.objectDefinition = new ObjectDefinition(); 
        //Here, after the use of "object", all words defined in ObjFiller are allowed.
        //Also, accessing the result object is allowed as the Result Type is also returned.
        return [ObjFiller, GuardedObject] }
    get array() { 
        this.chain.objectDefinition = new ArrayDefinition(); 
        return [ArrayOptions, GuardedObject]; }
}

class ObjFiller extends InstructionBlock<ObjectGuardChain>
{
    with = PropertyDefinition;
}

class PropertyDefinition extends InstructionBlock<ObjectGuardChain>
{
    //In case we want to define a parametric instruction, we use lambdas.
    //The return of the lambda is treated as in other cases: All words of the returned blocks are allowed in the subsequent step.
    property = (name: string) => [Conjunctor, Constraints as Constraints<Conjunctor>, GuardedObject];

    //We can also hook into instruction uses on the block level through the block level
    //`onInstruction` hook. This gets invoked whenever a word of this block is used.
    //Like in property hooks "this.chain" gets set to the currently applicable chain to manipulate it
    onInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse)
    {
        this.chain.objectDefinition.properties.push(new Property(instructionUse.parameters[0]));
    }
}

class Conjunctor extends InstructionBlock<ObjectGuardChain>
{
    and = PropertyDefinition;
}

//Generics help when reusing blocks across different code paths.
//For example using the Conjunctor here as T keeps us in a loop for defining properties
class Constraints<T> extends InstructionBlock<ObjectGuardChain>
{
    //Like in property hooks "this.chain" gets set to the currently applicable chain to be able to manipulate it
    accepting = (type: DataType) => {this.add(new DataTypeConstraint(type)); return [T, Constraints as Constraints<T>, GuardedObject];}
    max = (max: number) => {this.add(new MaxConstraint(max)); return [T, Constraints as Constraints<T>, GuardedObject]}
    min = (min: number) => {this.add(new MinConstraint(min)); return [T, Constraints as Constraints<T>, GuardedObject]}
    inRange = (min: number, max: number) => {this.add(new MinConstraint(min)); this.add(new MaxConstraint(max)); return [T, Constraints as Constraints<T>, GuardedObject]}

    //private (hashed) getters and class methods are treated as internal methods and NOT as words.
    //You can use them as helpers in your code.
    get #constraintTarget()
    {
        return this.chain.objectDefinition.properties.at(-1).constraints; 
    }
    add(constraint: Constraint)
    {
        this.#constraintTarget.push(constraint);
    }
}

class ArrayOptions <...>
```
Looking at this, let's focus on some key takeaways:
1. Derive your instruction blocks from either `InstructionBlock` (for words deep in your instruction chain) or `InitialInstructionBlock` (for words at the beginning of your instruction chain)
2. There are three types of words:
    - Static Words (instruction without params `<...>.instruction.<...>`)
    - Parametric Words (instructions with params `<...>.instruction(param).<...>`)
    - Hybrid Words (instruction with or without params `<...>.instruction.<...> or <...>.instruction(param).<...>` both valid. Review API documentation for more info.)
3. To define each type of word:
    - Static:
        - Passive: Public property `public then = FollowingBlock;`
        - Active: Public getter `public get then() { //Logic here; return FollowingBlock;}`
    - Parametric:
        - Passive: Blockless (no curly braces) Lambda `public parametric(a: any) => [FollowingBlock, ResultType]`
        - Active: Lambda with Block `public parametric(a: any) => { //Logic here; return [FollowingBlock, ResultType];}`
    - Hybrid:
        - See API documentation
4. The value/return value of an instruction signifies the subsequent code path and can be:
    - A single constructor of an instruction block, e.g. `FollowingBlock`
    - The constructor of the result type, e.g. `ResultType`
    - An array containing any number of the two above, e.g. `[FollowingBlock1, FollowingBlock2, ResultType]`. All instructions of the blocks in the array are valid subsequent words.
5. You can intercept

### Semantics

Once we have our instruction blocks and our grammar defined we can define a Semantic.
The most convenient way to do this is by using the static `DefineAPI` method of the `Semantic`class:

```typescript
const API = Semantic.DefineAPI({
    //Include all the blocks of your grammar here
    blocks: [InstantiationSelection, InstFiller, TypeSelection, TypeFiller, ObjFiller, PropertyDefinition, Conjunctor, Constraints, Array...],
    //This is the constructor of our instruction chain handler
    instructionChain: ObjectGuardChain,
    //This is the constructor of our return type and used for comparison with the instructions return types to determine whether the result may be accessed or not
    result: GuardedObject
});

//Destructuring for easier API access is totally fine
const {create, template} = API;

const templObject = template.an.object....
```
>Note: The `result` property of the object passed into `DefineAPI` can also be a dummy class and does not have to be related to the result object at *runtime*. At runtime this class constructor is solely used to compare with the return values of the instructions to see whether a result access is permitted. On a type level though, the type of this object is used to determine the properties available on the result object. Use `result: DummyResultClass as MyTypeScriptType` when needed to make type assertions here and then use e.g. `public exampleInstruction = [SubsequentBlock1, SubsequentBlock2, DummyResultClass]` to signal the the result may be accessed after the use of `exampleInstruction` even though the result is in no way related to `DummyResultClass`.

If you want more control of your defined semantic, you can also instantiate it in a normal fashion. The API will be exposed on its `root` member:
```typescript
const semantic = new Semantic({
    blocks: [InstantiationSelection, InstFiller, ...],
    instructionChain: ObjectGuardChain,
    result: GuardedObject
})

const API = semantic.root;
```

## API

### Instruction Chains
Instruction Chains capture the sequence of instructions invoked by the user and can process them to produce meaningful results. By customizing an instruction chain (subclassing from `InstructionChain`), you can define how each instruction affects the overall state and output of your DSL.

Instruction chains maintain a chain of instruction use objects internally.

You can customize the parsing behaviour of your instruction chain through the following methods:
- You subclass InstructionChain
- You then override:
    - `onInstruction` if you want to act incrementally on a the parsing state each time an instruction is added to the chain
    - `finalizeRecording` if you want to do finalization work, parse the whole instruction chain at once, or want to change the result type of an instruction chain

#### Instruction Use Objects

Core of Instruction Chains are Instruction Use objects. they come in two types: 
- `StaticInstructionUse` when a static instruction was used or a hybrid instruction was used in a static fashion
- `ParametricinstructionUse` when a parametric instrucion was invoked or a hybrid instruction was used in a parametric fashion.

Instruction use objects carry the instruction definition of the used instruction as well as the parameters in case onf a `ParametricInstructionUse`.

Instruction use objects are supplied to chain level and block level hooks.

#### Recording Hook
The InstructionRecorder class provides an overridable `onInstruction(instruction: StaticInstructionUse | ParametricInstructionUse): void` hook. This method is called every time an instruction is invoked. You can override it to define how your instruction chain processes each instruction:

```typescript
class Sequence extends InstructionChain<Sequence> {
    //...

    onInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse): void {
        //perform actions based on the `instruction` object here
        this.state.alter(...)
    }
}
```

#### Finalization Hook
After all instructions have been recorded, you might want to perform some final processing before returning the result.
There is an overridable `finalizeRecording(): void` member of `InstructionChain` as a hook provided for that. The finalization hook only gets called once. After that the recorder is deemed finalized and an alteration of the state of the instruction sequence is not expected.

```typescript
class Sequence extends InstructionChain<Sequence> {
    sequence = "";

    //...

    finalizeRecording(): Sequence {
        this.sequence = this.sequence.substring(1);
        return this;
    }
}
```
Note that we return the InstructionRecorder itself as a result here. This is totally ok - just as you could also return any other type, unrelated to an InstructionChain - as long as it has accessible members. Returning a string or a number here would be of little use, as the value of it will not be accessible.

### Instruction Blocks

Instruction blocks are the core part of your grammar. They define a set of instructions, where each instruction in turn defines its relationship to subsequent instruction blocks.

#### Defining Instruction Blocks
An instruction block is a class that extends `InstructionBlock<T>`, where `T` is your instruction chain class type.

Public properties and methods in the class represent an instruction in your grammar.

#### Instruction Block Types
```typescript
class Subject extends InitialInstructionBlock<Sequence>
{
    //...
}

class Verb extends InstructionBlock<Sequence>
{
    //...
}
```

An `InitialInstructionBlock` base class indicates that this block's instructions are valid words to start an instruction sequence. When defining a Semantic, the resulting Semantics's `root` property will be an object that will only contain instructions of blocks that derive from this base class.

All instructions on `InstructionBlock` base classes are only accessible through paths in the API and not on the API directly.

This distinction helps in enforcing the correct order of elements in the grammar.

#### Instruction Block Members

Instruction blocks have two special framework members that serve important roles:
- The `chain` member: This member is important for the active instructions defined in the blocks. Whenever an instruction is used, the `chain` member gets updated to the currently applicable chain, so that `this.chain` within the class member's body allows manipulation of the chain.
- The `onInstruction` member: This is the instruction use hook that gets called any time an instruction of the respective block is used. Override this member to supply your own logic. `this.chain` will be set to the currently applicable instruction chain.

All other properties will be interpreted according to the following schema:
- Public getters --> Active Static Instructions
- Public properties --> Instructions depending on type
- Public methods --> Active Parametric Instructions
- Private (#-prepended, not typescript `private` keyword marked) members, getters, methods --> Internal class methods not relevant to the framework. Use these as helpers for hooks. They will *not* be interpreted as instructions.

##### Recording Hook

The `onInstruction` member of `InstructionBlock` classes acts as a hook that is called every time an instruction of the respective block is used. It is supplied with an instruction use object as a parameter and the `this.chain` property is updated to the applicable chain:

```typescript
class InstructionBlockWithHook extends InstructionBlock<Chain>
{
    foo = AnotherInstructionBlock;
    bar = AnotherInstructionBlock;

    onUseInstruction(instructionUse: StaticInstructionUse | ParametricInstructionUse)
    {
        this.chain.usedInstructionString += "." + instructionUse.instruction.word;
    }
}
```

### Instructions
Instructions are the actual properties defined on instruction blocks. Every public member (not method) of an instruction block is considered a valid instruction.

There are three types of instructions:
- Static instructions: Instructions that do not require parameters
- Parametric instructions: Instruction that require parameters
- Hybrid instructions: Instructions that are valid with or without parameters

Each instruction member definition can be either:
- Active: Provides instruction specific logic to be executed when used
- Passive: Does not provide logic to be executed when used

#### Instruction Return Types

An instruction's value/return result determines the set of following valid instructions.

The (return) type of an instruction must either be:
- A class/constructor function of another InstructionBlock of the same grammar
- The class/constructor function of the result
- An array of any of the two above

In case a single instruction block is returned, all it's defined instructions are valid next instructions. 
When an Array is returned, all the instructions defined in the blocks in the array are valid continuations.

If the instruction chain's result type is returned standalone or within in an array, it is assumed the chain's result members may be accessed as well, next to the instructions of the accompanying blocks. Instructions defined on blocks take precedence over properties defined on the result object.

##### Static Instructions
Static instructions are instructions that do not require parameters and can be standalone like `<...>.instruction.<...>`.

Passive Static Instructions are defined through simple properties:
```typescript
class Conjunctor extends InstructionBlock<Sequence>
{
    and = Verb;
}

class Object extends InstrcutionBlock<Sequence>
{
    //Can be followed by instructions in either of them
    sport = [Conjunctor, Terminator];
    art = [Conjunctor, Terminator];
}
```

Active Static Instructions are defined through getters. The `this.chain` member is updated to the applicable chain before an active instruction is invoked:
```typescript
class Sequence extends InstructionRecorder
{
    sequence = "";
    sentenceCount = 0;

    //...rest unchanged
}

class Terminator extends InstructionBlock<Sequence>
{
    get fullStop() 
    {
        //this.record represents the current instruction recorder. In this case an instance of `Sequence`.
        this.chain.sentenceCount++;
        return Subject;
    }

    get exclamationMark() 
    {
        this.chain.sentenceCount++;
        return Subject;
    }
}
```

##### Parametric Instructions
Parametric instructions are instructions that do require parameters and can be used like `<...>.instruction(parameter, parameter2).<...>`. Any number of parameters is permitted.

Passive Parametric Instructions are defined as follows:
```typescript
class Quantifiers extends InstructionBlock<...>
{
    atLeast = (count: number) => Posessions;
    notMoreThan = (count: number) => Posessions;
    multiParameter = (para1: any, para2: any) => [FollowingBlock, ResultType];
}
```

Active Parametric Instructions also make use of lambdas. The `this.chain` member is updated to the applicable chain before an active instruction is invoked:
```typescript
class SampleBlock extends InstructionBlock<...>
{
    activeAndParamtricInstruction = (count: number) {
        this.chain.doSomething(count);
        return [NextInstructionBlock, AnotherNextInstructionBlock];
    }
}
```

##### Hybrid instructions
Hybrid instructions allow to be used with or without parameters: `<...>.hybrid.<...>` as well as `<...>.hybrid(withParameter).<...>` are both valid uses of a parametric instruction.

Passive hybrid instructions are defined as follows:
```typescript
class Base extends InstructionBlock<...>
{
    hybridA = {
        whenAccessed: () => Base
        whenCalled: (a: number) => Base
    }

    hybridB = {
        whenAccessed: () => [Base, ResultType]
        whenCalled: (a: number, b: boolean) =>  [Base, ResultType]
    }
}

//PermittedUsages
API.hybridA.hybridA(100).hybridB.hybridB(100, false).resultMember;
```

Active Hybrid Instructions also make use of lambdas. The `this.chain` member is updated to the applicable chain before an active instruction is invoked:

```typescript
class Base extends InitialInstructionBlock<Recorder>
{
    hybridA = {
        whenAccessed: () => { this.chain.invocations += "A.Get;"; return Base; },
        whenCalled: (a: number) => { this.chain.invocations += `A.Call(${a});`; return Base; }
    };

    hybridB = {
        whenAccessed: () => { this.chain.invocations += "B.Get;"; return Base; },
        whenCalled: (a: number) => { this.chain.invocations += `B.Call(${a});`; return Base; }
    };
}
```

### Semantics

#### Defining Semantics

In order to define a semantic object, three key elements need to be provided:
- The blocks making up your grammar in the form of an array of class constructors deriving from `InstructionBlock`or `InitialInstructionBlock`
- A constructor of a derivative of `InstructionChain` that is used to record and handle the stream of instructions
- The type of the result object once your instruction chain is complete

With these things gathered, a semantic can be defined simply by instantiating a `new Semantic`:
```typescript
const semantic = new Semantic({
    blocks: [InstructionBlockA, InstructionBlockB, InstructionBlockC],
    instructionChain: InstructionChainRecorder,
    result: ResultType
});

const API = semantic.root;
```

#### Acessing the API defined by your grammar

If you have a semantic object already, you can then access the defined grammar through the `root` property of the instantiated object:

```typescript
const API = semantic.root;
```

However the `Semantic` class exposes a static member `Semantics.DefineAPI` that is a shortcut:
```typescript
const API = Semantic.DefineAPI({
blocks: [InstructionBlockA, InstructionBlockB, InstructionBlockC],
instructionChain: InstructionChainRecorder,
result: ResultType
});
```
In practice you will not need the semantic object, unless you have advanced requirements that require manipulating already recorded instruction chains.

#### Manipulating Instruction Chains through the semantic object

The semantic object provideds a few members for advanced use cases:
- the `SubstituteInstructionChain` static member allows for taking an established instruction sequence and replacing the instruction chain with another one.
- the `primedWith`instance member allows to supply a predefined instruction chain that is already present on every root member of the API
- the `continueWith` member allows the creation of a grammar element on the fly - defining the preceding chain and the set of permitted continuation blocks on that chain.

### Hooks

Semantium offers hooks on many levels:
- InstructionChain
    - `constructor`: Invoked when a new InstructionChain is neede or when a fork happens
    - `onInstruction`: Invoked when a new element is added to the instruction chain
    - `finalizeRecording`: Invoked before a member is accessed on the result object. Only invoked once per chain.
- InstructionBlock:
    - `onInstruction`: Invoked when a new element of the block is added to the instruction chain
- Instructions:
    - Lambdas and public getters get invoked any time this instruction is used

#### Instruction Chain & Hook Cycle

1. An API member gets accessed
    - A new InstructionChain is instantiated
    - The constructor function runs
    - Continue with 2
2. A subsequent instruction gets used
    - A new InstructionUse gets added to the Chain
    - The `InstructionChain` derivative's `onInstruction` handler gets called
    - The `InstructionBlock` derivative's `onInstruction` handler gets called
    - The instruction`s handler gets called
    - Repeat with 2 or continue with 3
3. A member of the result object is requested
    - The `InstructionChain` derivative's `finalizeRecording` hook is called
    - The returned value is stored for subsequent accesses to the result
    - The requested property is resolved on the result

## Examples

A few simple examples can be found in the `/test` folder of this repository.

## License

This library is freely usable and licensed according to the MIT license.