// src/lib/database.ts
import mongoose from "mongoose";

export const connectDatabase = async (): Promise<void> => {
    const { MONGODB_URI } = process.env;

    // Validate before trying to connect
    if (!MONGODB_URI) {
        console.error("MongoDB URI is required");
        process.exit(1);
    }

    try {
        const connection = await mongoose.connect(MONGODB_URI);
        console.log("Connected to host:", connection.connection.host);
        console.log("Connected to database:", connection.connection.name);
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};