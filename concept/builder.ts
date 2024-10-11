import { InstructionRecorder } from "../source/components/recording.js";

export class InteractionQueryBuilder extends InstructionRecorder<InteractionQuery>
{ }

export class InteractionQuery
{
    listen()
    {
        //start actual listening logic,
        //trigger callbacks when detected
    }

    onDetect(callback: () => void)
    {
        //register callback etc.
    }
}