import { either, holding, tapping, touch } from "./dictionary.js";

function concept()
{
    const tap = touch.then.release.withinMs(300);

    tap.onDetect(() => console.log("Tap"));
    tap.listen();

    const sampleInteraction =
        either(tapping, holding)
            .then.release.withinMs(100)
            .then.holding.forAtLeastMs(500);

    console.log('Sample interaction chain:', sampleInteraction.listen());
}

concept();