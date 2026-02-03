import { dequeueUser, getCandidate, Gender, Preference } from "./queue.service";

interface MatchRequest {
    deviceId: string;
    gender: Gender;
    preference: Preference;
}

export async function findMatch(requester: MatchRequest): Promise<string | null> {
    const { deviceId, gender, preference } = requester;

    console.log(`[MatchService] ${deviceId} (${gender}) seeking (${preference})`);

    // LOGIC:
    // If I am Male seeking Female (queue:male:female)
    // I need to look for a Female seeking Male (queue:female:male) OR Female seeking Any (queue:female:any)

    // Define target queues to search in priority order
    let targetQueues: { gender: Gender, pref: Preference }[] = [];

    if (preference === 'any') {
        // I am ok with anyone.
        // Look for:
        // 1. Others seeking 'any' (Any Gender : Any) -> Loose
        // 2. Male seeking Me (Male : Male/Any/Female? depends on my gender)

        // Simplified Strategy for "Any":
        // Check "queue:male:any", "queue:female:any", "queue:male:seeking_my_gender", "queue:female:seeking_my_gender"
        // This effectively creates a massive "General Pool" logic.

        // Let's stick to explicit reciprocals to be safe.
        // If I am Male seeking Any:
        // Look for Female seeking Male, Male seeking Male, Female seeking Any, Male seeking Any.
        targetQueues = [
            { gender: 'female', pref: 'any' },
            { gender: 'male', pref: 'any' },
            { gender: 'female', pref: gender === 'other' ? 'any' : (gender as Preference) },
            { gender: 'male', pref: gender === 'other' ? 'any' : (gender as Preference) }
        ];
    } else {
        // Specific Preference (e.g. Male seeking Female)
        // Look for:
        // 1. Female seeking Male (Perfect Match)
        // 2. Female seeking Any (Acceptable Match)
        targetQueues = [
            { gender: preference as Gender, pref: gender as Preference }, // Perfect: She wants Me
            { gender: preference as Gender, pref: 'any' }                 // Acceptable: She wants Anyone
        ];
    }

    // Iterate and find first match
    for (const target of targetQueues) {
        // Skip invalid combos (e.g. Other wanting Male... ensure types match)
        if (target.gender === 'other' && target.pref !== 'any') continue; // Simplification

        const candidateId = await getCandidate(target.gender, target.pref);

        if (candidateId && candidateId !== deviceId) {
            console.log(`[MatchService] MATCH FOUND! ${deviceId} <-> ${candidateId}`);

            // Dequeue BOTH users from their respective queues
            await dequeueUser(deviceId, gender, preference);
            await dequeueUser(candidateId, target.gender, target.pref);

            return candidateId;
        }
    }

    return null;
}

