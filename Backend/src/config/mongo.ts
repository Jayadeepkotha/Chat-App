
import mongoose from "mongoose";

export const connectMongo = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/flowchat";
        await mongoose.connect(mongoUri);
        console.log("✅ MongoDB connected successfully");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        console.error("❌ MongoDB connection error (Ensure mongod is running):", error);
        // Do not crash, just continue without DB features
    }
};
