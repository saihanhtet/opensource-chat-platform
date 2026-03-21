// src/lib/database.ts
import mongoose from "mongoose";

export const connectDatabase = async () => {
    try {
        const { MONGODB_URI } = process.env;
        if (!MONGODB_URI) {
            throw new Error("MongoDB URI is required");
        }

        const connection = await mongoose.connect(MONGODB_URI);

        console.log("Connected to host:", connection.connection.host);
        console.log("Connected to database:", connection.connection.name);
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};