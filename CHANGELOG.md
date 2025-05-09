# Changelog

## [2.0.0] - 2025-05-09

This major version enables the definition of generic types to be introduced into chains.

Previously, defining blocks like this lead to `NewType` to become `unknown` due to the internal type transformations in Semantium:

```typescript
import { InitialInstructionBlock, InstructionBlock, InstructionChain } from "semantium";

class GenericBlock extends InitialInstructionBlock<Result> {
    hybrid = {
        whenAccessed: ContinuationBlock
        whenCalled: <NewType>(arg: NewType) => [ContinuationParametric<NewType>, EndBlock]
    }
    
    parametric: <NewType>(parameter: NewType) => [ContinuationParametric<NewType>, End]
}

```

This is due to the fact that Typescript does not support higher order types (yet) - meaning anytime you use a mapped type those newly introduced types get dropped.

A workaround to this is to "preserve" the generic through carrying it in a function signature. Thus, this major version introduces a new way to define continuations and hybrid members through the newly (mandatory) introduced functions `ContinuesWith` and `Hybrid`, which enable us to avoid generic-dropping mapped types:

```typescript
import { InitialInstructionBlock, InstructionBlock, InstructionChain } from "semantium";

class GenericBlock extends InitialInstructionBlock<Result> {
    hybrid = Hybrid({
        accessed: ContinuesWith(ContinuationBlock)
        called: <NewType>(arg: NewType) => ContinuesWith([ContinuationParametric<NewType>, EndBlock])
    })
    
    parametric: <NewType>(parameter: NewType) => ContinuesWith([ContinuationParametric<NewType>, End])
}

```

### Key Changes Illustrated by Example

The most significant change is how instruction continuations are defined. Let's compare V1 (conceptual) with V2 using a simplified example:

**V1-style Definition:**

```typescript
import { InitialInstructionBlock, InstructionBlock, InstructionChain } from "semantium";

class Result extends InstructionChain<Result> { /* ... */ }
class ContinuationBlock extends InstructionBlock<Result> { /* ... */ }
class EndBlock extends InstructionBlock<Result> { /* ... */ }

class SampleBlock extends InitialInstructionBlock<Result> {
    continue = ContinuationBlock;
    continueOrEnd = [ContinuationBlock, EndBlock];

    get getterHook { return [Continuation, End]}

    hybrid = {
        whenAccessed: ContinuationBlock
        whenCalled: () => [ContinuationBlock, EndBlock]
    }
    
    parametric = (parameter: any) => [Continuation, End];
}

const v1Api = Semantic.DefineAPI({
    blocks: [SampleBlock, ContinuationBlock, EndBlock],
    instructionChain: Result,
    result: Result
});
```

**New V2-style Definition:**

```typescript
import { InitialInstructionBlock, InstructionBlock, InstructionChain, Hybrid, ContinuesWith } from "semantium";

class Result extends InstructionChain<Result> { /* ... */ }
class ContinuationBlock extends InstructionBlock<Result> { /* ... */ }
class EndBlock extends InstructionBlock<Result> { /* ... */ }

class SampleBlock extends InitialInstructionBlock<Result> {
    continue = ContinuesWith(ContinuationBlock);
    continueOrEnd = ContinuesWith(ContinuationBlock, EndBlock);     // V2 uses ContinuesWith to define Continuations

    get getterHook { return ContinuesWith(Continuation, End)}

    hybrid = Hybrid({                                               //Note the use of Hybrid function 
        accessed: ContinuesWith(ContinuationBlock)                  //whenAccessed got simplified to accessed
        called: () => ContinuesWith(ContinuationBlock, EndBlock)    //whenCalled got simplified to called
    });
    
    parametric = (parameter: any) => return ContinuesWith(Continuation, End);
}

const v2Api = Semantic.DefineAPI({
    blocks: [SampleBlock, ContinuationBlock, EndBlock],
    resultBuilder: Result,                                          // V1 used 'instructionChain'
    result: Result
});
```

**Summary of Changes based on the example:**

1.  **Explicit Continuations with `ContinuesWith()`**:
    *   In V2, `ContinuesWith(BlockA, BlockB, ResultType)` explicitly declares what can follow an instruction. This is needed to enable generic types.
2.  **`Hybrid()` Helper for Dual-Use Instructions**:
    *   The `Hybrid({ accessed: ..., called: ... })` function provides a clear structure for instructions that behave differently when accessed as a property versus called as a function. Each path (`accessed`, `called`) uses `ContinuesWith()` to define its specific next steps.
3.  **`resultBuilder` instead of `instructionChain`**:
    *   In `Semantic.DefineAPI`, the property `instructionChain` (which specified the class responsible for recording and processing instructions) has been renamed to `resultBuilder` for clarity.

### Changed

*   **Instruction Definition in Blocks**:
    *   The way active (with logic) and passive instructions are defined now directly incorporates `ContinuesWith()` or `Hybrid()` to specify their outcome.
    *   Passive static: `instructionName = ContinuesWith(NextBlock);`
    *   Active static (getter): `get instructionName() { /* logic */ return ContinuesWith(NextBlock); }`
    *   Passive parametric: `instructionName = (params) => ContinuesWith(NextBlock);`
    *   Active parametric (method): `instructionName(params) { /* logic */ return ContinuesWith(NextBlock); }`
*   **Internal Refinements**:
    *   Significant internal refactoring to support the new API definition features and improve type inference.