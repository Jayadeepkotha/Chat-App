
import redisClient from "../config/redis";

const DAILY_LIMIT = 5;

function getLimitKey(deviceId: string) {
    return `limit:${deviceId}:${new Date().toDateString()}`; // Resets daily
}

export async function getlimit(deviceId: string): Promise<boolean> {
    const key = getLimitKey(deviceId);
    const count = await redisClient.get(key);

    if (!count) return true;
    return parseInt(count) < DAILY_LIMIT;
}

export async function incrementUsage(deviceId: string) {
    const key = getLimitKey(deviceId);

    // Increment
    const newValue = await redisClient.incr(key);

    // Set expiry to 24 hours (approx) to clean up
    if (newValue === 1) {
        await redisClient.expire(key, 86400);
    }
}
