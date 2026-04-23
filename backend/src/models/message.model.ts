import mongoose, { Model } from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            default: "",
        },
        fileUrl: {
            type: String,
            default: "",
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        editedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: false }
);

export type IMessage = InferSchemaType<typeof messageSchema>;
export type MessageDocument = HydratedDocument<IMessage>;

const Message: Model<IMessage> = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
