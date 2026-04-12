import type { Request, Response } from "express";
import mongoose from "mongoose";

import { reqParamId, sendServerError, sendValidationError } from "../lib/utils.ts";
import Conversation from "../models/conversation.model.ts";
import UploadedFile from "../models/uploadedFile.model.ts";
import {
    createUploadedFileSchema,
    updateUploadedFileSchema,
} from "../schemas/uploadedFile.schema.ts";

const badId = (res: Response) =>
    res.status(400).json({ message: "Invalid id" });

const userInConversation = async (
    conversationId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
) => {
    const conv = await Conversation.findById(conversationId);
    if (!conv) return false;
    return conv.participantIds.some((p) => p.equals(userId));
};

export const createUploadedFile = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = createUploadedFileSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

        const conversationId = new mongoose.Types.ObjectId(parsed.data.conversationId);
        const me = req.user._id as mongoose.Types.ObjectId;

        if (!(await userInConversation(conversationId, me))) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const doc = await UploadedFile.create({
            uploadedBy: me,
            conversationId,
            fileName: parsed.data.fileName,
            fileType: parsed.data.fileType,
            fileUrl: parsed.data.fileUrl,
        });
        return res.status(201).json(doc);
    } catch (error) {
        return sendServerError(res, "createUploadedFile", error);
    }
};

export const listUploadedFiles = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const { conversationId } = req.query;
        const me = req.user._id as mongoose.Types.ObjectId;

        if (
            typeof conversationId === "string" &&
            mongoose.Types.ObjectId.isValid(conversationId)
        ) {
            const cid = new mongoose.Types.ObjectId(conversationId);
            if (!(await userInConversation(cid, me))) {
                return res.status(403).json({ message: "Forbidden" });
            }
            const files = await UploadedFile.find({ conversationId: cid }).sort({
                uploadedAt: -1,
            });
            return res.status(200).json(files);
        }

        const convs = await Conversation.find({ participantIds: me }).select("_id");
        const ids = convs.map((c) => c._id);
        const files = await UploadedFile.find({
            conversationId: { $in: ids },
        }).sort({ uploadedAt: -1 });
        return res.status(200).json(files);
    } catch (error) {
        return sendServerError(res, "listUploadedFiles", error);
    }
};

export const getUploadedFileById = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const doc = await UploadedFile.findById(id);
        if (!doc) return res.status(404).json({ message: "File not found" });

        if (
            !(await userInConversation(
                doc.conversationId as mongoose.Types.ObjectId,
                req.user._id as mongoose.Types.ObjectId
            ))
        ) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return res.status(200).json(doc);
    } catch (error) {
        return sendServerError(res, "getUploadedFileById", error);
    }
};

export const updateUploadedFile = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = updateUploadedFileSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

        const doc = await UploadedFile.findById(id);
        if (!doc) return res.status(404).json({ message: "File not found" });

        if (!doc.uploadedBy.equals(req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (parsed.data.fileName !== undefined) doc.fileName = parsed.data.fileName;
        if (parsed.data.fileType !== undefined) doc.fileType = parsed.data.fileType;
        if (parsed.data.fileUrl !== undefined) doc.fileUrl = parsed.data.fileUrl;
        await doc.save();
        return res.status(200).json(doc);
    } catch (error) {
        return sendServerError(res, "updateUploadedFile", error);
    }
};

export const deleteUploadedFile = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const doc = await UploadedFile.findById(id);
        if (!doc) return res.status(404).json({ message: "File not found" });

        if (!doc.uploadedBy.equals(req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await UploadedFile.findByIdAndDelete(id);
        return res.status(200).json({ message: "File deleted" });
    } catch (error) {
        return sendServerError(res, "deleteUploadedFile", error);
    }
};
