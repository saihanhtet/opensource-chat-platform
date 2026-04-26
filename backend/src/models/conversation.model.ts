import mongoose, { Model } from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["direct", "team"],
            required: true,
        },
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
        },
        name: {
            type: String,
            trim: true,
            default: "",
            maxlength: 120,
        },
        participantIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        lastMessage: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

export type IConversation = InferSchemaType<typeof conversationSchema>;
export type ConversationDocument = HydratedDocument<IConversation>;

const Conversation: Model<IConversation> = mongoose.model<IConversation>(
    "Conversation",
    conversationSchema
);

export default Conversation;
