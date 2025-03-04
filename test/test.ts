
import { InitializationTests, InstructionChainHookTests, BlockHookTests, PropertyHookTests, ForkingTests, FinalizationTests } from "../source/recording/recording.spec.ts";
import { DefinitionTests, SequenceTypingTests } from "../source/definition/semantic.spec.ts";

const definitionTests = new DefinitionTests();
definitionTests.shouldHaveAllMembersOfInitialBlockDefined();

const sequenceTypingTests = new SequenceTypingTests();
sequenceTypingTests.shouldAcceptValidSequences();
sequenceTypingTests.shouldRejectInvalidSequences();
sequenceTypingTests.shouldProvideResultMembersOnFinalBlocks();

const initializationTests = new InitializationTests();
initializationTests.shouldYieldNewInstanceOnEachDictionaryAccess();
initializationTests.shouldForkOnDestructuredWords();
initializationTests.shouldHaveSubstitutableChain();
initializationTests.shouldHaveCustomizableStartingChain();
initializationTests.shouldAllowCustomContinuation();

const instructionChainHookTests = new InstructionChainHookTests();
instructionChainHookTests.shouldCallOnAddInstruction();
instructionChainHookTests.shouldSupplyStaticInstructionUse();
instructionChainHookTests.shouldSupplyParametricInstructionUse();
instructionChainHookTests.shouldSupplyProperInstructionUseWithHybridInstructions();

const blockHookTests = new BlockHookTests();
blockHookTests.shouldCallOnUseInstruction();

const propertyHookTests = new PropertyHookTests();
propertyHookTests.shouldCallPropertyGetters();
propertyHookTests.shouldCallParametricHandlers();
propertyHookTests.shouldCallHybridHandlers();

const forkingTests = new ForkingTests();
forkingTests.shouldCorrectlyForkBaseAPI();
forkingTests.shouldCorrectlyForkWhenUsingParametricInstructions();
forkingTests.shouldCorrectlyForkWhenUsingHybridInstructions();

const finalizationTests = new FinalizationTests();
finalizationTests.shouldFinalizeWhenResultTypeIsReturned();
finalizationTests.shouldNotFinalizeIfResultTypeIsNotReturned();
finalizationTests.shouldFinalizeOnStaticAndParametricMembers();


console.log("All tests passed!");
