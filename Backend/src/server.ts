import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./app";
import redisClient, { connectRedis } from "./config/redis";
import { connectMongo } from "./config/mongo";


const PORT = process.env.PORT || 3000;

// 1️⃣ CREATE shared infrastructure (top-level)
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

export { io };
export default server;

import "./sockets";
async function startServer() {
  await connectRedis();
  // MongoDB is now REQUIRED for Ban System
  await connectMongo();

  // temp sanity check
  await redisClient.set("health", "ok");
  console.log(await redisClient.get("health"));

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
