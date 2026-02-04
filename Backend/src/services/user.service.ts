import User, { IUser } from "../models/User";

/**
 * Ensures user exists in DB and updates lastOnline.
 */
export async function touchUser(deviceId: string): Promise<IUser> {
    try {
        const user = await User.findOneAndUpdate(
            { deviceId },
            { lastOnline: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return user as IUser;
    } catch (err) {
        console.error("Mongo Error (touchUser):", err);
        throw err;
    }
}

/**
 * Checks if a user is currently banned.
 * Returns { isBanned: boolean, remainingMs: number }
 */
export async function checkBanStatus(deviceId: string): Promise<{ isBanned: boolean, remainingMs: number }> {
    const user = await User.findOne({ deviceId });
    if (!user || !user.bannedUntil) return { isBanned: false, remainingMs: 0 };

    const now = new Date();
    if (user.bannedUntil > now) {
        return {
            isBanned: true,
            remainingMs: user.bannedUntil.getTime() - now.getTime()
        };
    } else {
        // Ban has EXPIRED. Give them a fresh start.
        // If we don't do this, reports stay at 11, and next report = instant ban.
        if (user.reports > 0) {
            console.log(`[BanSystem] User ${deviceId} served ban. Resetting reports to 0.`);
            user.reports = 0;
            user.bannedUntil = null; // Clear the date
            await user.save();
        }
    }

    return { isBanned: false, remainingMs: 0 };
}

/**
 * Reports a user.
 * If reports > 10, Bans for 24 hours.
 */
export async function reportUser(targetDeviceId: string) {
    console.log(`[UserService] Incrementing reports for ${targetDeviceId}...`);
    const user = await User.findOneAndUpdate(
        { deviceId: targetDeviceId },
        { $inc: { reports: 1 } },
        { new: true, upsert: true }
    );
    console.log(`[UserService] New report count for ${targetDeviceId}: ${user.reports}`);

    if (user.reports > 10) {
        // Ban logic
        const banDuration = 24 * 60 * 60 * 1000; // 24 hours
        user.bannedUntil = new Date(Date.now() + banDuration);
        await user.save();
        console.log(`[BanSystem] User ${targetDeviceId} BANNED until ${user.bannedUntil}`);
        return { banned: true, user };
    }

    return { banned: false, user };
}
