import { FusionOf } from "fusium-js";
import { Beginning, InstructionBlock, Finishing, Semantics } from "../../source/components/definition.ts";
import { InteractionQueryBuilder, InteractionQuery } from "./builder.ts";

class Interaction extends FusionOf(Beginning, Finishing, InstructionBlock<InteractionQueryBuilder>)
{
    either = (...args: InteractionQuery[]) => ModifyOrContinue;
    
    tapping = ModifyOrContinue;
    holding = ModifyOrContinue;
    touch = ModifyOrContinue;
    release = ModifyOrContinue;
}

class Grouping extends FusionOf(Beginning, Finishing, InstructionBlock<InteractionQueryBuilder>)
{
    expect = (query: InteractionQuery) => Modifiers;
}

class Modifiers extends FusionOf(Finishing, InstructionBlock<InteractionQueryBuilder>)
{
    withinMs = (ms: number) => ModifyOrContinue;
    forAtLeastMs = (ms: number) => ModifyOrContinue;
    times = (repeat: number) => ModifyOrContinue;
}

class Continuation extends InstructionBlock<InteractionQueryBuilder>
{
    then = Interaction
}

const ModifyOrContinue = [Continuation, Modifiers];

export const dictionary = Semantics.Define([Interaction, Grouping, Continuation, Modifiers], InteractionQueryBuilder);

export const {
    expect,
    either,
    tapping,
    holding,
    touch,
    release
} = dictionary;