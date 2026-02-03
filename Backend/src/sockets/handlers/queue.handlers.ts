import { Socket } from "socket.io";
import { enqueueUser, isUserQueued, Gender } from "../../services/queue.service";
import { getlimit } from "../../services/limits.service";
import { tryMatch } from "./match.handlers";
import { touchUser, checkBanStatus } from "../../services/user.service";

type QueuePreference = "male" | "female" | "any";

export async function handleEnterQueue(
  socket: Socket,
  payload: { preference: QueuePreference; gender: string; nickname: string; bio: string }
) {
  const deviceId = socket.data.deviceId;
  const { preference, gender } = payload;

  console.log(`[Queue] User ${deviceId} (${gender}) joining queue for: ${preference}`);

  // 1. Sync User & Check Bans (Mongo)
  try {
    await touchUser(deviceId); // Ensure they exist in DB
    const banStatus = await checkBanStatus(deviceId);

    if (banStatus.isBanned) {
      const hoursLeft = Math.ceil(banStatus.remainingMs / (1000 * 60 * 60));
      socket.emit("queue:error", `You are banned for ${hoursLeft} more hours due to reports.`);
      return;
    }
  } catch (e) {
    console.error("Mongo Error (Non-fatal, proceeding):", e);
  }

  // sanity guard
  if (!preference) {
    socket.emit("queue:error", "Preference required");
    return;
  }

  // prevent duplicate queueing
  const alreadyQueued = await isUserQueued(deviceId, gender as any, preference);
  if (alreadyQueued) {
    socket.emit("queue:error", "Already in queue");
    // Even if already queued, try to match them in case they got stuck
    await tryMatch(socket);
    return;
  }

  // enforce fairness limits
  const allowed = await getlimit(deviceId);
  if (!allowed) {
    socket.emit("queue:error", "Daily limit reached");
    return;
  }

  // Save metadata so match handler knows who we are
  // Save metadata so match handler knows who we are
  socket.data.gender = gender;
  socket.data.preference = preference;
  socket.data.nickname = payload.nickname || "Anonymous";
  socket.data.bio = payload.bio || "Just exploring.";

  // enqueue
  // Fix: Enqueue into SPECIFIC intent queue (e.g. queue:male:female)
  await enqueueUser(deviceId, gender as any, preference as any);

  socket.emit("queue:joined", {
    preference,
  });

  // TRIGGER MATCHMAKING
  await tryMatch(socket);
}
