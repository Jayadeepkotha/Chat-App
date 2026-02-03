import { Socket } from "socket.io";

export function authenticateSocketDevice(
  socket: Socket,
  next: (err?: Error) => void
) {
  const deviceId = socket.handshake.auth.deviceId || socket.handshake.headers["x-device-id"];

  if (!deviceId || typeof deviceId !== "string") {
    return next(new Error("Device ID missing"));
  }

  // future-proofing point:
  // - device blacklist
  // - signature validation
  // - fingerprint confidence score
  // - rate limits at connect time

  socket.data.deviceId = deviceId;
  next();
}
