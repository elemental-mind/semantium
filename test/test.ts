
import { InitializationTests, InstructionChainHookTests, BlockHookTests, PropertyHookTests, ForkingTests, FinalizationTests } from "../source/recording/recording.spec.ts";
import { DefinitionTests, SequenceTypingTests } from "../source/definition/semantic.spec.ts";

const definitionTests = new DefinitionTests();
definitionTests.shouldHaveAllMembersOfInitialBlockDefined();
definitionTests.shouldHaveAllMembersOfMultipleInitialBlocksDefined();

const sequenceTypingTests = new SequenceTypingTests();
sequenceTypingTests.shouldAcceptValidSequences();
sequenceTypingTests.shouldRejectInvalidSequences();
sequenceTypingTests.shouldProvideResultMembersOnFinalBlocks();

const initializationTests = new InitializationTests();
initializationTests.shouldYieldNewInstanceOnEveryCallToInitial();

const recorderHooksTests = new RecorderHooksTests();
recorderHooksTests.shouldCallOnAddInstruction();
recorderHooksTests.shouldCallOnAddInstructionWithParameters();

const blockHookTests = new BlockHookTests();
blockHookTests.shouldCallOnUseInstruction();
blockHookTests.shouldCallOnUseParametric();

const propertyHookTests = new PropertyHookTests();
propertyHookTests.shouldHandlePropertyGetter();

const finalizationTests = new FinalizationTests();
finalizationTests.shouldCallFinalizeRecordingOnAccessingResult();

console.log("All tests passed!");
