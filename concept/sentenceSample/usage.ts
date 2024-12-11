import { beginsWith } from "./dictionary.js";

function concept()
{
    const dayDescription = 
        beginsWith("I feel")
        .followedBy.optional("really")
        .followedBy.either("great", "good", "bad", "shit")
        .endsWith("today");
    
    const wheatherDescription = 
        beginsWith.either("This", "Last")
        .followedBy("month")
        .followedBy("is", "was")
        .followedBy.optional.either("really", "mildly")
        .endsWith.either("rainy", "sunny", "cloudy");
}

concept();