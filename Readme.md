# Semantium

Fluent APIs and DSLs provide an intuitive way to express complex logic in code.
This library provides a framework for building fluent APIs (and typed DSLs) in
TypeScript. It allows you to define custom grammars and create expressive,
chainable APIs that represent complex instructions with full IntelliSense and typing support.

By using this library, you can:

- Define **instructions and grammar rules using classes** and TypeScript's type system.
- **Enforce valid sequences of instructions** through type constraints.
- **Record and process sequences** of instructions for execution or analysis.

It helps you for example to define a fluent API for a regex generator:

```typescript
    //Fluent Regex API: Sample Mail Matcher for foreName.lastName@domain.com
    const adressee = 
        word.capturedInto("firstName")
        .followedBy.excactly(".")
        .followedBy.word.capturedInto("lastName");
    const domainName = 
        allOf(
            oneOrMore(Letters, Numbers)
            .followedBy.exactly(".")
            .followedBy.oneOf("com", "org" ...)
        ).capturedInto("domain");
    const email = 
        findLazy(adressee)
        .followedBy.exactly("@")
        .followedBy.findEager(domainName);

    const {firstName, lastName, domain} = email.match("john.doe@example.org").captures;
```

## Installation

To install Semantium using npm, run the following command in your project directory:


```console
npm install semantium
```

## Core Concepts

Semantium works with the following primitives to define your Fluent API:
- **Instruction block**: These are classes, whose members form a logical group of **instructions** in your grammar/language.
- **Recorder**: This reduces/condenses your stream of instructions into something that is actually meaningful to your program.
- A **Semantic**: A Semantic bundles your instruction blocks and a recorder to provide a comprehensive type-safe grammar.

Let's build a very simple grammar to understand the concepts first - and once we understand the concepts we can go into the nitty gritty.

### Instruction Blocks

Instruction blocks are classes that represent a group of related instructions or
words in your DSL. They extend the InstructionBlock class and define the methods
or properties that correspond to the instructions available at that point in the
grammar. The (return) types of the respective members define the instruction group(s) that can follow after the usage of the defined instruction;

For example:

```typescript
class Subject extends InstructionBlock<Sequence>
{
    //after "John" is used it must be followed by an instruction in the "Verb" block
    John = Verb;
    Bob = Verb;
    Cathy = Verb;
}

class Verb extends InstructionBlock<Sequence>
{
    //after "does" is used it must be followed by an instruction in the "Object" block
    does = Object;
    likes = Object;
}

class Object extends InstructionBlock<Sequence>
{
    sports = Terminator;
    art = Teminator;
}

class Terminator extends InstructionBlock<Sequence>
{
    exclamationMark = Subject;
    fullStop = Subject;
}
```
> Note: this definition is not complete, but demonstrates the principle. Read beyond the concepts section to learn how to properly define a Grammar.

...would allow you to form sentences like these (afer we defined the Semantics, we will come to that later):
```typescript
const artsy = John.likes.art.fullStop;
const sporty = Cathy.does.sports.exclamationMark;
const multi = Cathy.does.sports.fullStop.Bob.likes.sports.fullStop;

//This would throw a type error and a runtime error:
const nah = John.likes.fullStop;
```

### Instruction Recorders

The InstructionRecorder class is responsible for recording the sequence of
instructions invoked by the user. It can also be used to constrain the grammar to more strict rules than typescript typing allows. 

For example:

```typescript
class Sequence extends InstructionRecorder
 { 
    sequence = "";

    //The instruction object contains the used word and 
    //the family (InstructionBlock derivative) that the word comes from.
    onAddInstruction(instruction: Instruction): void 
    {
        //Unless we have a Terminator, we add the literal property name with a space to the sentence property.
        if(instruction.family !== Terminator)
            this.sequence += " " + instruction.word;
        else 
            switch(instruction.word)
            {
                case "fullStop": this.sequence += ".";
                case "exclamationMark": this.sequence += "!";
            }
    }
}
```

In this example, the Sequence class records the sequence of instructions into a
string. Breaks in the switch were ommitted for readability here. 

### Semantics

Once you have your instruction blocks and your grammar defined you can define a Semantic. You typically destructure the definition object into the words so that you can start using the words directly without having to use a dummy object to access the references:
```typescript
const { John, Bob, Cathy } = Semantics.Define([Subject, Verb,Object,Terminator], Sequence)

assert(John.likes.sports.fullStop.sequence === " John likes sports.");
```

## API
With the concepts clear, let's have a look at the details fo how to properly define a grammar.

### Instruction Blocks
#### Defining Instruction Blocks
An instruction block is a class that extends `InstructionBlock<T>`, where `T` is your instruction recorder.

Each property or method in the class represents an instruction in your grammar.

#### Instruction Block Types
Looking at the grammar in the concepts section, we kind of know that a `Sequence` should start with a `Subject` and end with a `Terminator`. In fact every grammar in Semantium should have a beginning and an ending.

To make clear, which instruction blocks are beginning and which are terminating we use the multiple inheritance  features of `fusium-js` - the `FusionOf` function together with the `Beginning` and `Finishing` traits:

```typescript
class Subject extends FusionOf(Beginning, InstructionBlock<Sequence>)
{
    //...
}

class Verb extends InstructionBlock<Sequence>
{
    //...
}

class Terminator extends FusionOf(Finishing, InstructionBlock<Sequence>)
{
    //...
}
```

The `Beginning` and `Finishing` traits in this context are used to define the structure and flow of the grammar in Semantium. Here's what they mean:

1. `Beginning` trait:
   - Indicates that this block's instructions are valid words to start an instruction sequence
   - When defining a Semantic, the returned definition object will only contain instructions of blocks that have this trait
   - With the altered code above, only the words John, Bob, Cathy are valid words to start a `Sequence`.

2. `Finishing` trait:
   - Indicates that after the instructions in a block with this trait, accesses to properties of the result of the instruction recorder are valid
   - In the context of our altered code above, it signifies that only after fullStop and exclamationMark it is valid to access the `sentence` property of the `Sequence` object (the instruction recorder).

These traits help in enforcing the correct order of elements in the grammar. They ensure that:

- A grammatical structure starts with an instruction block marked as `Beginning`
- A grammatical structure ends with an instruction block marked as `Finishing`
- Other instruction blocks (like `Verb` in this example) can be placed between the beginning and finishing blocks, but can neither be used to begin an instruction sequence, nor to gain access to the result of an instruction sequence.

There can be multiple `Beginning` and `Finishing` blocks in a grammar. 

It's mix and match. It's also permissible to have `Beginning` and `Finishing` traits combined on a single instruction block:

```typescript
class MultiTrait extends FusionOf(Beginning, Finishing, InstructionBlock<{result: string}>)
{
    Foo = MultiTrait
}

//...Semantic definition etc.

const validSequence = Foo.Foo.Foo.result;
```

#### Instructions
Instructions are the actual properties defined on instruction blocks. Every public member of an instruction block is considered a valid instruction.
The (return) type of an instruction must either be:
- A class/constructor function of another InstructionBlock of the same grammar
- The class/constrcutor function of the recorder/result
- An array of any of the two above

##### Simple Instructions
Looking at our concept example we have seen simple instructions at play: A property that has a class constructor assigned to it.
Let's expand our grammar to also allow for example `John.likes.art.and.does.sport.fullStop`. We can achieve that by just assigning an array with two possibilities to the `Object` instructions:

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
So it's permissible to now continue with either "and" or any of the terminators after an object.

##### Active Instructions
Sometimes it is desirable to do something when an instruction is used. To allow for that, parameterless instructions can also be defined as getters.
Every InstructionBlock also has a `record` property defined that represents the current `InstructionRecorder` instance. This can be used to update properties on it or call its methods.

Let's say for example we want to count the number of sentences in our instruction sequence. We know that we have a sentence when we enounter a terminator, so it's simple. Let's add a property to count the sentences on our recorder and actually increment the count:

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
        this.record.sentenceCount++;
        return Subject;
    }

    get exclamationMark() 
    {
        this.record.sentenceCount++;
        return Subject;
    }
}
```

##### Parametric Instructions
For now we only used simple instructions. However, sometimes it is desirable to for example quantify something. 

For that we have parametric instructions. Methods or function properties on an InstructionBlock whose return type is an instruction return type (InstructionBlock, InstructionRecorder or Array thereof).

Let's say we want to also express possessions in our sample grammar - let's expand it:
```typescript
class Verbs extends InstructionBlock<Sequence>
{
    // previous verbs etc...
    has = [Posessions, Quantifiers];
}

class Posessions extends InstructionBlock<Sequence>
{
    apples = [Conjunctor, Terminator];
    cars = [Conjunctor, Terminator];
}

class Quantifiers extends InstructionBlock<Sequence>
{
    atLeast = (count: number) => Posessions;
    notMoreThan = (count: number) => Posessions;
}

class Sequence extends InstructionRecorder
{ 
    //...

    onAddInstruction(instruction: Instruction, instructionParams: any[]): void 
    {
        //...

        //after we have printed "atLeast" or "notMoreThan" we also add the count to it (the first paramer delivered to the instruction)
        if(instruction.family === Quantifiers)
            this.sequence += " " + instructionParams[0];
    }
}
```
This would now allow us to write something like that:

```typescript
assert(John.has.atLeast(5).apples.and.does.sports.fullStop.sequence === " John has atLeast 5 apples and does sports.");
```

Just like getters, functions can of course also be used to access the recorder at invocation time:

```typescript
class SampleBlock extends InstructionBlock<...>
{
    activeAndParamtricInstruction(count: number) {
        this.record.doSomething(count);
        return [NextInstructionBlock, AnotherNextInstructionBlock];
    }
}
```

#### Instruction block hooks
When looking at our sentence counting example, you could notice a duplication in the getters. As all the instructions just increment the sentence count, it would be nice to bundle that common logic. The `InstructionBlock` Trait offers two overridable hooks for that:
- `onUseInstruction(instruction)`
- `onUseParametricInstruction(instruction, parameters)`

With these hooks we can now simplify our logic of `Terminator`:

```typescript
class Terminator extends FusionOf(Finishing, InstructionBlock<Sequence>)
{
    fullStop = Subject;
    exclamationMark = Subject;

    onUseInstruction(instruction: Instruction)
    {
        this.record.sentenceCount++;
    }
}
```
The hooks get delivered an `Instruction` object, which specifies the instruction that was actually used.

### Recorders
Instruction recorders capture the sequence of instructions invoked by the user and can process them to produce meaningful results. By customizing the recorder, you can define how each instruction affects the overall state and output of your DSL.

#### Recording Hooks
The InstructionRecorder class provides an overridable `onAddInstruction(instruction: Instruction, instructionParameters?: any[]): void` hook. This method is called every time an instruction is invoked. You can override it to define how your recorder processes each instruction. We have already seen it in action in our conceptual example:
```typescript
class Sequence extends InstructionRecorder<Sequence> {
    //...

    onAddInstruction(instruction: Instruction, instructionParameters?: any[]): void {
        //perform actions based on the `instruction` object here
        this.state.alter(...)
    }
}
```
#### Finalization Hooks
After all instructions have been recorded, you might want to perform some final processing before returning the result.
There is an overridable `finalizeRecording(): void` member of `InstructionRecorder` as a hook provided for that.

This hook gets called whenever after an instruction block with the `finishing` trait a property of the result object is accessed. The finalization hook only gets called once. After that the recorder is deemed finalized and an alteration of the state of the instruction sequence is not expected.

Looking at our conceptual example, we have one trivial problem that we can solve in the finalization hook for demonstration purposes: Our string always starts with a whitespace, because we kept the logic in the recording hook very simple.
Let's change that:

```typescript
class Sequence extends InstructionRecorder<Sequence> {
    //...

    finalizeRecording(): Sequence {
        //We actually trim the resulting string
        this.sequence = this.sequence.substring(1);
        return this;
    }
}
```
Note that we return the InstructionRecorder itself as a result here. This is totally ok - just as you could also return any other type, unrelated to an InstructionRecorder - as long as it has accessible members. Returning a string or a number here would be of little use, as the value of it will not be accessible.

### Semantics

#### Defining Semantics
The Semantics class only exposes one static member `Semantics.Define` that is used to create your DSL by combining your instruction blocks with a recorder/result type. It initializes the semantic definition and provides entry points for your grammar.

```typescript
const dictionary = Semantics.Define(
    [BaseBlock, ModifierBlock, TransitionBlock],
    Sequence
);
```
In this example:

- `[BaseBlock, ModifierBlock, TransitionBlock]` is an example array of your instruction blocks. Note that there needs to be at least one block with the `Beginning` trait.
Note that all InstructionBlocks must be parameterless constructor functions.
- Sequence is your instruction recorder class constructor. This class can derive from `InstructionRecorder` but does not have to. If the instance provides InstructionRecorder hook methods, these will be called. The passed in class constructor must be parameterless.

The Semantics.Define function returns an object called the **dictionary** containing the entry point instructions, which are the instructions from the blocks that have the `Beginning` trait. Typically this object is destructured into its respective words.

#### Dictionary instruction behaviour
Each time you start a new instruction sequence from the dictionary, a new instance of the instruction recorder is created. This ensures that each instruction sequence is independent.

```typescript
const dictionary = Semantics.Define([Subject, Verb, Object], Sequence);
const { John } = dictionary;

const chain1 = John.likes.art;
const chain2 = John.likes.art;

assert(chain1 !== chain2);
assert(chain1.sequence !== chain2.sequence);

//However a property access on an initial word is needed to create a new chain instance
const noAccess1 = John;
const noAccess2 = John;

assert(noAccess1 === noAccess2);
```

## Examples

Thorughout this API explainer we have worked our way from the simple conceptual example to a more complex use of hooks etc. In summary we end up with the following resulting grammar definition:

```typescript
// Necessary imports
import { FusionOf } from "fusium-js";
import { Beginning, Finishing, InstructionBlock } from "semantium";

// Define the instruction blocks
class Subject extends FusionOf(Beginning, InstructionBlock<Sequence>) {
    John = Verb;
    Bob = Verb;
    Cathy = Verb;
}

class Verb extends InstructionBlock<Sequence> {
    likes = Object;
    does = Object;
    has = [Possessions, Quantifiers];
}

class Object extends InstructionBlock<Sequence> {
    art = [Conjunctor, Terminator];
    sports = [Conjunctor, Terminator];
}

class Conjunctor extends InstructionBlock<Sequence> {
    and = Verb;
}

class Possessions extends InstructionBlock<Sequence> {
    apples = [Conjunctor, Terminator];
    cars = [Conjunctor, Terminator];
}

class Quantifiers extends InstructionBlock<Sequence> {
    atLeast = (count: number) => Possessions;
    notMoreThan = (count: number) => Possessions;
}

class Terminator extends FusionOf(Finishing, InstructionBlock<Sequence>) {
    fullStop = Subject;
    exclamationMark = Subject;

    onUseInstruction(instruction: Instruction) {
        this.record.sentenceCount++;
    }
}

// Define the sequence recorder
class Sequence extends InstructionRecorder<Sequence> {
    sequence = "";
    sentenceCount = 0;

    onAddInstruction(instruction: Instruction, instructionParameters?: any[]): void {
        if (instruction.family !== Terminator) {
            this.sequence += " " + instruction.word;
        } else {
            switch (instruction.word) {
                case "fullStop":
                    this.sequence += ".";
                    break;
                case "exclamationMark":
                    this.sequence += "!";
                    break;
            }
        }

        if (instruction.family === Quantifiers) {
            this.sequence += " " + instructionParameters[0];
        }
    }

    finalizeRecording(): Sequence {
        this.sequence = this.sequence.trim();
        return this;
    }
}

// Create the dictionary
const { John, Bob, Cathy } = Semantics.Define([Subject, Verb, Object, Conjunctor, Possessions, Quantifiers, Terminator], Sequence);

// Use the grammar
const artsy = John.likes.art.fullStop;
const sporty = Cathy.does.sports.exclamationMark;
const multi = Cathy.does.sports.fullStop.Bob.likes.sports.fullStop;
const possession = John.has.atLeast(5).apples.and.does.sports.fullStop;
```


## License

This library is freely usable and licensed according to the MIT license.