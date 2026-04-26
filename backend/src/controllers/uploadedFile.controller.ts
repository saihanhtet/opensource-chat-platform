import type { Request, Response } from "express";
import { unlink } from "fs/promises";
import mongoose from "mongoose";

// lib
import cloud from "../lib/cloud.ts";
import { withSenderUsernames } from "../lib/messageSender.ts";
import * as utils from "../lib/utils.ts";
// models
import Conversation from "../models/conversation.model.ts";
import Message from "../models/message.model.ts";
import Team from "../models/team.model.ts";
import UploadedFile from "../models/uploadedFile.model.ts";
// schemas
import * as uploadedFileSchema from "../schemas/uploadedFile.schema.ts";
// socket
import * as realtime from "../socket/realtime.ts";

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

const emitToConversationParticipants = async (
    conversationId: mongoose.Types.ObjectId,
    event: string,
    payload: unknown
) => {
    const conversation = await Conversation.findById(conversationId).select("participantIds");
    if (!conversation) return;
    for (const participantId of conversation.participantIds) {
        realtime.emitToUser(String(participantId), event, payload);
    }
};

const getSpaceLabel = async (conversationId: mongoose.Types.ObjectId) => {
    const conversation = await Conversation.findById(conversationId).select("type teamId name");
    if (!conversation) return "Personal";
    if (conversation.type === "team" && conversation.teamId) {
        const channelName =
            typeof conversation.name === "string" && conversation.name.trim()
                ? `#${conversation.name.trim()}`
                : "";
        if (channelName) return channelName;
        const team = await Team.findById(conversation.teamId).select("teamName");
        return team?.teamName ?? "Team";
    }
    return "Personal";
};

export const createUploadedFile = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = uploadedFileSchema.createUploadedFileSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

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
        return utils.sendServerError(res, "createUploadedFile", error);
    }
};

export const uploadChatFile = async (req: Request, res: Response) => {
    const tempUploadPath = req.file?.path;
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const { conversationId, content } = req.body as {
            conversationId?: string;
            content?: string;
        };
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: "Invalid conversationId" });
        }
        if (!req.file) return res.status(400).json({ message: "File is required" });

        const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
        const me = req.user._id as mongoose.Types.ObjectId;
        if (!(await userInConversation(conversationObjectId, me))) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const uploaded =
            process.env.NODE_ENV === "test"
                ? { secure_url: `https://example.com/test-upload/${Date.now()}-${req.file.originalname}` }
                : await cloud.uploader.upload(req.file.path, {
                      resource_type: "auto",
                      folder: "opensource-chat-platform/chat-files",
                  });

        const fileDoc = await UploadedFile.create({
            uploadedBy: me,
            conversationId: conversationObjectId,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileUrl: uploaded.secure_url,
        });

        const message = await Message.create({
            conversationId: conversationObjectId,
            senderId: me,
            content: (content ?? "").trim(),
            fileUrl: uploaded.secure_url,
        });
        const [messageOut] = await withSenderUsernames([message.toObject()]);
        const messagePayload = {
            ...messageOut,
            _meta: {
                fromUserId: String(me),
                fromUsername: req.user.username,
                spaceName: await getSpaceLabel(conversationObjectId),
            },
        };

        const preview = message.content.slice(0, 500) || uploaded.secure_url.slice(0, 500);
        const updatedConversation = await Conversation.findByIdAndUpdate(conversationObjectId, {
            lastMessage: preview,
        }, { returnDocument: "after" });
        realtime.emitToConversation(String(conversationObjectId), realtime.SOCKET_EVENTS.messageNew, messagePayload);
        await emitToConversationParticipants(conversationObjectId, realtime.SOCKET_EVENTS.messageNew, messagePayload);
        if (updatedConversation) {
            realtime.emitToConversation(String(conversationObjectId), realtime.SOCKET_EVENTS.conversationUpdated, updatedConversation);
            await emitToConversationParticipants(
                conversationObjectId,
                realtime.SOCKET_EVENTS.conversationUpdated,
                updatedConversation
            );
        }

        return res.status(201).json({
            file: fileDoc,
            message: messageOut,
        });
    } catch (error) {
        return utils.sendServerError(res, "uploadChatFile", error);
    } finally {
        if (tempUploadPath) {
            await unlink(tempUploadPath).catch(() => {});
        }
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
        return utils.sendServerError(res, "listUploadedFiles", error);
    }
};

export const getUploadedFileById = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
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
        return utils.sendServerError(res, "getUploadedFileById", error);
    }
};

export const updateUploadedFile = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = uploadedFileSchema.updateUploadedFileSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

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
        return utils.sendServerError(res, "updateUploadedFile", error);
    }
};

export const deleteUploadedFile = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const doc = await UploadedFile.findById(id);
        if (!doc) return res.status(404).json({ message: "File not found" });

        if (!doc.uploadedBy.equals(req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await UploadedFile.findByIdAndDelete(id);
        return res.status(200).json({ message: "File deleted" });
    } catch (error) {
        return utils.sendServerError(res, "deleteUploadedFile", error);
    }
};
