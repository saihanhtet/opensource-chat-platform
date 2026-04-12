import type { Request, Response } from "express";
import mongoose from "mongoose";

import { reqParamId, sendServerError, sendValidationError } from "../lib/utils.ts";
import Conversation from "../models/conversation.model.ts";
import {
    createConversationSchema,
    updateConversationSchema,
} from "../schemas/conversation.schema.ts";

const badId = (res: Response) =>
    res.status(400).json({ message: "Invalid id" });

const userInConversation = (
    conv: { participantIds: mongoose.Types.ObjectId[] },
    userId: mongoose.Types.ObjectId
) => conv.participantIds.some((p) => p.equals(userId));

export const createConversation = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = createConversationSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

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
        return res.status(201).json(doc);
    } catch (error) {
        return sendServerError(res, "createConversation", error);
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
        return sendServerError(res, "listConversations", error);
    }
};

export const getConversationById = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
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
        return sendServerError(res, "getConversationById", error);
    }
};

export const updateConversation = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = updateConversationSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

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
        return res.status(200).json(conversation);
    } catch (error) {
        return sendServerError(res, "updateConversation", error);
    }
};

export const deleteConversation = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        if (!userInConversation(conversation, req.user._id as mongoose.Types.ObjectId)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await Conversation.findByIdAndDelete(id);
        return res.status(200).json({ message: "Conversation deleted" });
    } catch (error) {
        return sendServerError(res, "deleteConversation", error);
    }
};
