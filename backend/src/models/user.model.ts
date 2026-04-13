// src/models/user.model.ts
import mongoose, { Model } from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        profilePic: {
            type: String,
            default: "",
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
        status: {
            type: String,
            enum: ["active", "away", "offline", "suspended"],
            default: "active",
        },
        resetPasswordToken: {
            type: String,
            default: null,
        },
        resetPasswordTokenExpiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Plain shape from the schema
export type IUser = InferSchemaType<typeof userSchema>;

// Real Mongoose document type
export type UserDocument = HydratedDocument<IUser>;

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;