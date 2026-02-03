import { Socket } from "socket.io";
// import { io } from "../../server"; // Removed to fix circular dependency
import { findMatch } from "../../services/match.service";
import { dequeueUser } from "../../services/queue.service";

export async function tryMatch(socket: Socket) {
  const deviceId = socket.data.deviceId;
  const gender = socket.data.gender;
  const preference = socket.data.preference;

  if (!gender || !preference) {
    console.log("[Match] Missing gender/preference for", deviceId);
    return;
  }

  // ask the match service
  // "findMatch" returns the PARTNER'S ID if found
  const partnerId = await findMatch({ deviceId, gender, preference });

  if (!partnerId) return;

  console.log(`[Match] SUCCESS: ${deviceId} matched with ${partnerId}`);

  const userA = deviceId;
  const userB = partnerId;

  // room id is ephemeral & random
  const roomId = `chat_${userA}_${userB}_${Date.now()}`;

  // remove both from queues
  // Note: We need to remove them from the queue they joined.
  // We know userA joined 'preference'. 
  // We assume userB joined a queue that matches userA's gender.
  // For simplicity/robustness, we might need to broaden the dequeue or track partner's pref.
  // Ideally, findMatch should handle dequeueing or return queue names.
  // But based on current match.service.ts, it calls dequeueUser inside itself!
  // So we DON'T need to call it here again if findMatch does it.

  // Checking match.service.ts... It DOES call dequeueUser.
  // So we just need to notify.

  // find sockets for both users
  // Fix: Use socket.nsp to avoid circular dependency on 'io' import
  const sockets = await socket.nsp.fetchSockets();

  const socketA = sockets.find(s => s.data.deviceId === userA);
  const socketB = sockets.find(s => s.data.deviceId === userB);

  // join room
  if (socketA) socketA.join(roomId);
  if (socketB) socketB.join(roomId);

  // notify both users
  // notify both users
  // We need to send User B's info to User A, and User A's info to User B

  const profileA = {
    nickname: socketA?.data.nickname || "Anonymous",
    bio: socketA?.data.bio || "No bio",
    gender: socketA?.data.gender || "Unknown"
  };

  const profileB = {
    nickname: socketB?.data.nickname || "Anonymous",
    bio: socketB?.data.bio || "No bio",
    gender: socketB?.data.gender || "Unknown"
  };

  if (socketA) {
    socketA.emit("match:found", { roomId, partner: profileB });
  }
  if (socketB) {
    socketB.emit("match:found", { roomId, partner: profileA });
  }
}
