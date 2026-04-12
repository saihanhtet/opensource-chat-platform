import mongoose, { Model } from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const friendRequestSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
        },
    },
    { timestamps: true }
);

friendRequestSchema.index(
    { senderId: 1, receiverId: 1 },
    { unique: true, partialFilterExpression: { status: "pending" } }
);

export type IFriendRequest = InferSchemaType<typeof friendRequestSchema>;
export type FriendRequestDocument = HydratedDocument<IFriendRequest>;

const FriendRequest: Model<IFriendRequest> = mongoose.model<IFriendRequest>(
    "FriendRequest",
    friendRequestSchema
);

export default FriendRequest;
