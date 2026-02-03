import redisClient from "../config/redis";

export type Gender = "male" | "female" | "other";
export type Preference = "male" | "female" | "any";

// Helper to generate queue name
// e.g. "queue:male:female" (Male seeking Female)
function getQueueName(gender: Gender, preference: Preference): string {
  return `queue:${gender}:${preference}`;
}

export async function isUserQueued(deviceId: string, gender: Gender, preference: Preference): Promise<boolean> {
  const queueName = getQueueName(gender, preference);
  const score = await redisClient.zScore(queueName, deviceId);
  return score !== null;
}

export async function enqueueUser(deviceId: string, gender: Gender, preference: Preference) {
  const queueName = getQueueName(gender, preference);
  const score = Date.now();

  // Check if already queued? (Optional, but good for safety)
  const exists = await isUserQueued(deviceId, gender, preference);
  if (exists) {
    throw new Error("User already in the queue");
  }

  await redisClient.zAdd(queueName, { score, value: deviceId });
  console.log(`[Queue] Enqueued ${deviceId} in ${queueName}`);
}

export async function dequeueUser(deviceId: string, gender: Gender, preference: Preference) {
  const queueName = getQueueName(gender, preference);
  await redisClient.zRem(queueName, deviceId);
}

export async function getCandidatesCount(gender: Gender, preference: Preference): Promise<number> {
  const queueName = getQueueName(gender, preference);
  return await redisClient.zCard(queueName);
}

export async function getCandidate(gender: Gender, preference: Preference): Promise<string | null> {
  const queueName = getQueueName(gender, preference);
  // Get the longest waiting user (score = timestamp asc)
  const users = await redisClient.zRange(queueName, 0, 0);
  return users.length > 0 ? users[0] : null;
}

// Legacy support if needed? No, we refactored everything.
