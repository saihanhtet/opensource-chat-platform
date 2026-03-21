// src/lib/database.ts
import mongoose from "mongoose";

export const connectDatabase = async () => {
    try {
        const connection = await mongoose.connect(
            process.env.MONGODB_URI || "mongodb://localhost:27017/chatapp"
        );

        console.log("Connected to host:", connection.connection.host);
        console.log("Connected to database:", connection.connection.name);
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};