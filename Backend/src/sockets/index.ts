import { io } from "../server";
import { authenticateSocketDevice } from "./middleware/deviceAuth";
import { handleEnterQueue } from "./handlers/queue.handlers";
import { handleChatMessage, handleChatLeave, handleChatReport } from "./handlers/chat.handlers";

io.use(authenticateSocketDevice);

io.on("connection", (socket) => {
  const deviceId = socket.data.deviceId;

  console.log("Socket connected:", socket.id, "Device:", deviceId);

  socket.on("queue:enter", async (preference) => {
    try {
      await handleEnterQueue(socket, preference);
    } catch (err: any) {
      console.error(err);
      // DEBUG: Write to file
      const fs = require('fs');
      fs.appendFileSync('backend_errors.log', `${new Date().toISOString()} ERROR: ${err.message}\n${err.stack}\n\n`);
      socket.emit("queue:error", "Internal error");
    }
  });

  socket.on("chat:message", (payload) => {
    handleChatMessage(socket, payload);
  });

  socket.on("chat:leave", (payload) => {
    handleChatLeave(socket, payload);
  });

  socket.on("chat:report", (payload) => {
    handleChatReport(socket, payload);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id, "Device:", deviceId);
  });
});
