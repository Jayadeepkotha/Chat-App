import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import deviceIdMiddleware from "./middleware/deviceId";
import onboardingRoute from "./routes/onboarding.routes";
// Create the Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use(deviceIdMiddleware);
app.use(onboardingRoute);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        message: err.message
    });
});

// Export the configured app
export default app;