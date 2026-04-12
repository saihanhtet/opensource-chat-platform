import mongoose, { Model } from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const uploadedFileSchema = new mongoose.Schema(
    {
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        fileName: {
            type: String,
            required: true,
            trim: true,
        },
        fileType: {
            type: String,
            required: true,
            trim: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

export type IUploadedFile = InferSchemaType<typeof uploadedFileSchema>;
export type UploadedFileDocument = HydratedDocument<IUploadedFile>;

const UploadedFile: Model<IUploadedFile> = mongoose.model<IUploadedFile>(
    "UploadedFile",
    uploadedFileSchema,
    "files"
);

export default UploadedFile;
