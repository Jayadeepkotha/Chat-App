
import { Socket } from "socket.io";

export function handleChatMessage(socket: Socket, payload: { roomId: string; text: string }) {
    const { roomId, text } = payload;
    const senderId = socket.data.deviceId;

    console.log(`[Chat] Message in ${roomId} from ${senderId}: ${text}`);

    if (!roomId || !text) return;

    // Fix: Use socket.to(roomId) to broadcast to everyone EXCEPT standard
    // The sender already added it to their UI optimistically.
    socket.to(roomId).emit("chat:message", {
        senderId,
        text,
        timestamp: new Date().toISOString(),
    });
}

export function handleChatLeave(socket: Socket, payload: { roomId: string }) {
    const { roomId } = payload;
    const deviceId = socket.data.deviceId;

    console.log(`[Chat] ${deviceId} leaving room ${roomId}`);

    if (!roomId) return;

    // Notify other user BEFORE leaving
    socket.to(roomId).emit("chat:ended", {
        reason: "Partner disconnected"
    });

    // Actually leave the socket room
    socket.leave(roomId);
}

import { reportUser } from "../../services/user.service";

export async function handleChatReport(socket: Socket, payload: { roomId: string, targetDeviceId?: string }) {
    const reporterId = socket.data.deviceId;

    // In a real app, we'd look up who the partner was in the roomId.
    // For MVP, we trust the client OR strictly finding partner from room.
    // Let's rely on finding the partner in the room for security.
    const sockets = await socket.nsp.in(payload.roomId).fetchSockets();
    const partnerSocket = sockets.find(s => s.data.deviceId !== reporterId);

    if (!partnerSocket) {
        console.log(`[Report] Could not find partner to report in ${payload.roomId}`);
        return;
    }

    const targetId = partnerSocket.data.deviceId;
    console.log(`[Report] ${reporterId} reporting ${targetId}`);

    try {
        const result = await reportUser(targetId);
        if (result.banned) {
            // Kick them immediately if they are still connected
            partnerSocket.emit("chat:ended", { reason: "You have been banned." });
            partnerSocket.disconnect(true);
        }
    } catch (e) {
        console.error("Report error:", e);
    }
}