import type { Request, Response } from "express";
import mongoose from "mongoose";

import * as utils from "../lib/utils.ts";
import Conversation from "../models/conversation.model.ts";
import User from "../models/user.model.ts";
import * as conversationSchema from "../schemas/conversation.schema.ts";
import * as realtime from "../socket/realtime.ts";

const badId = (res: Response) =>
    res.status(400).json({ message: "Invalid id" });

const userInConversation = (
    conv: { participantIds: mongoose.Types.ObjectId[] },
    userId: mongoose.Types.ObjectId
) => conv.participantIds.some((p) => p.equals(userId));

const TYPING_TTL_MS = 5000;
const typingState = new Map<string, Map<string, number>>();

export const createConversation = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = conversationSchema.createConversationSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const participantObjectIds = parsed.data.participantIds.map(
            (id) => new mongoose.Types.ObjectId(id)
        );
        const me = req.user._id as mongoose.Types.ObjectId;
        if (!participantObjectIds.some((p) => p.equals(me))) {
            return res.status(400).json({
                message: "You must include yourself in participantIds",
            });
        }

        const doc = await Conversation.create({
            type: parsed.data.type,
            teamId: parsed.data.teamId
                ? new mongoose.Types.ObjectId(parsed.data.teamId)
                : undefined,
            participantIds: participantObjectIds,
            lastMessage: parsed.data.lastMessage ?? "",
        });
        realtime.emitToConversation(String(doc._id), realtime.SOCKET_EVENTS.conversationUpdated, doc);
        return res.status(201).json(doc);
    } catch (error) {
        return utils.sendServerError(res, "createConversation", error);
    }
};

export const listConversations = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const me = req.user._id;
        const conversations = await Conversation.find({
            participantIds: me,
        }).sort({ updatedAt: -1 });
        return res.status(200).json(conversations);
    } catch (error) {
        return utils.sendServerError(res, "listConversations", error);
    }
};

export const getConversationById = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        if (!userInConversation(conversation, req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return res.status(200).json(conversation);
    } catch (error) {
        return utils.sendServerError(res, "getConversationById", error);
    }
};

export const updateConversation = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = conversationSchema.updateConversationSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        if (!userInConversation(conversation, req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (parsed.data.type !== undefined) conversation.type = parsed.data.type;
        if (parsed.data.teamId !== undefined) {
            conversation.teamId = parsed.data.teamId
                ? new mongoose.Types.ObjectId(parsed.data.teamId)
                : undefined;
        }
        if (parsed.data.participantIds) {
            const next = parsed.data.participantIds.map(
                (oid) => new mongoose.Types.ObjectId(oid)
            );
            if (!next.some((p) => p.equals(req.user!._id as mongoose.Types.ObjectId))) {
                return res.status(400).json({
                    message: "You cannot remove yourself from participantIds",
                });
            }
            conversation.participantIds = next;
        }
        if (parsed.data.lastMessage !== undefined) {
            conversation.lastMessage = parsed.data.lastMessage;
        }
        await conversation.save();
        realtime.emitToConversation(String(conversation._id), realtime.SOCKET_EVENTS.conversationUpdated, conversation);
        return res.status(200).json(conversation);
    } catch (error) {
        return utils.sendServerError(res, "updateConversation", error);
    }
};

export const deleteConversation = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        if (!userInConversation(conversation, req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await Conversation.findByIdAndDelete(id);
        realtime.emitToConversation(String(id), realtime.SOCKET_EVENTS.conversationUpdated, {
            _id: String(id),
            deleted: true,
        });
        return res.status(200).json({ message: "Conversation deleted" });
    } catch (error) {
        return utils.sendServerError(res, "deleteConversation", error);
    }
};

export const setTypingStatus = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        const me = req.user._id as mongoose.Types.ObjectId;
        if (!userInConversation(conversation, me)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const isTyping = Boolean(req.body?.isTyping);
        const conversationMap = typingState.get(id) ?? new Map<string, number>();
        const meId = me.toString();

        if (isTyping) {
            conversationMap.set(meId, Date.now() + TYPING_TTL_MS);
            typingState.set(id, conversationMap);
        } else {
            conversationMap.delete(meId);
            if (conversationMap.size === 0) typingState.delete(id);
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        return utils.sendServerError(res, "setTypingStatus", error);
    }
};

export const getTypingStatus = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        const me = req.user._id as mongoose.Types.ObjectId;
        if (!userInConversation(conversation, me)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const now = Date.now();
        const conversationMap = typingState.get(id) ?? new Map<string, number>();
        for (const [userId, expiresAt] of conversationMap.entries()) {
            if (expiresAt <= now) conversationMap.delete(userId);
        }
        if (conversationMap.size === 0) {
            typingState.delete(id);
            realtime.emitToConversation(id, realtime.SOCKET_EVENTS.typingUpdated, { conversationId: id, users: [] });
            return res.status(200).json({ users: [] });
        }
        typingState.set(id, conversationMap);

        const myId = me.toString();
        const otherUserIds = [...conversationMap.keys()].filter((userId) => userId !== myId);
        if (otherUserIds.length === 0) return res.status(200).json({ users: [] });

        const users = await User.find({ _id: { $in: otherUserIds } }).select("_id username");
        const payload = {
            conversationId: id,
            users: users.map((user) => ({
                userId: String(user._id),
                username: user.username,
            })),
        };
        realtime.emitToConversation(id, realtime.SOCKET_EVENTS.typingUpdated, payload);
        return res.status(200).json({
            users: payload.users.map((user) => ({
                _id: user.userId,
                username: user.username,
            })),
        });
    } catch (error) {
        return utils.sendServerError(res, "getTypingStatus", error);
    }
};
