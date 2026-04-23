import type { Request, Response } from "express";
import mongoose from "mongoose";

import * as utils from "../lib/utils.ts";
import Conversation from "../models/conversation.model.ts";
import Message from "../models/message.model.ts";
import Team from "../models/team.model.ts";
import * as messageSchema from "../schemas/message.schema.ts";
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
    const conversation = await Conversation.findById(conversationId).select("type teamId");
    if (!conversation) return "Personal";
    if (conversation.type === "team" && conversation.teamId) {
        const team = await Team.findById(conversation.teamId).select("teamName");
        return team?.teamName ?? "Team";
    }
    return "Personal";
};

export const createMessage = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = messageSchema.createMessageSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const conversationId = new mongoose.Types.ObjectId(parsed.data.conversationId);
        const me = req.user._id as mongoose.Types.ObjectId;

        if (!(await userInConversation(conversationId, me))) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const content = parsed.data.content ?? "";
        const fileUrl = parsed.data.fileUrl ?? "";
        const preview = content.slice(0, 500) || fileUrl.slice(0, 500) || "";

        const message = await Message.create({
            conversationId,
            senderId: me,
            content,
            fileUrl,
        });
        const messagePayload = {
            ...message.toObject(),
            _meta: {
                fromUserId: String(me),
                fromUsername: req.user.username,
                spaceName: await getSpaceLabel(conversationId),
            },
        };

        const updatedConversation = await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: preview,
        }, { new: true });
        realtime.emitToConversation(String(conversationId), realtime.SOCKET_EVENTS.messageNew, messagePayload);
        await emitToConversationParticipants(conversationId, realtime.SOCKET_EVENTS.messageNew, messagePayload);
        if (updatedConversation) {
            realtime.emitToConversation(String(conversationId), realtime.SOCKET_EVENTS.conversationUpdated, updatedConversation);
            await emitToConversationParticipants(
                conversationId,
                realtime.SOCKET_EVENTS.conversationUpdated,
                updatedConversation
            );
        }

        return res.status(201).json(message);
    } catch (error) {
        return utils.sendServerError(res, "createMessage", error);
    }
};

export const listMessages = async (req: Request, res: Response) => {
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
            const messages = await Message.find({ conversationId: cid }).sort({
                timestamp: 1,
            });
            return res.status(200).json(messages);
        }

        const convs = await Conversation.find({ participantIds: me }).select("_id");
        const ids = convs.map((c) => c._id);
        const messages = await Message.find({
            conversationId: { $in: ids },
        }).sort({ timestamp: -1 });
        return res.status(200).json(messages);
    } catch (error) {
        return utils.sendServerError(res, "listMessages", error);
    }
};

export const getMessageById = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (
            !(await userInConversation(
                message.conversationId as mongoose.Types.ObjectId,
                req.user._id as mongoose.Types.ObjectId
            ))
        ) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return res.status(200).json(message);
    } catch (error) {
        return utils.sendServerError(res, "getMessageById", error);
    }
};

export const updateMessage = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = messageSchema.updateMessageSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (!message.senderId.equals(req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (parsed.data.content !== undefined) message.content = parsed.data.content;
        if (parsed.data.fileUrl !== undefined) message.fileUrl = parsed.data.fileUrl;
        await message.save();
        realtime.emitToConversation(String(message.conversationId), realtime.SOCKET_EVENTS.messageUpdated, message);
        await emitToConversationParticipants(
            message.conversationId as mongoose.Types.ObjectId,
            realtime.SOCKET_EVENTS.messageUpdated,
            message
        );
        return res.status(200).json(message);
    } catch (error) {
        return utils.sendServerError(res, "updateMessage", error);
    }
};

export const deleteMessage = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (!message.senderId.equals(req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const conversationId = String(message.conversationId);
        await Message.findByIdAndDelete(id);
        realtime.emitToConversation(conversationId, realtime.SOCKET_EVENTS.messageDeleted, { _id: id, conversationId });
        await emitToConversationParticipants(
            message.conversationId as mongoose.Types.ObjectId,
            realtime.SOCKET_EVENTS.messageDeleted,
            { _id: id, conversationId }
        );
        return res.status(200).json({ message: "Message deleted" });
    } catch (error) {
        return utils.sendServerError(res, "deleteMessage", error);
    }
};
