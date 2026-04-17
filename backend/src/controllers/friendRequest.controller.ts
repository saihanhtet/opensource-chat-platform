import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
    isDuplicateKeyError,
    reqParamId,
    sendServerError,
    sendValidationError,
} from "../lib/utils.ts";
import FriendRequest from "../models/friendRequest.model.ts";
import {
    createFriendRequestSchema,
    updateFriendRequestSchema,
} from "../schemas/friendRequest.schema.ts";
import { emitToUser, SOCKET_EVENTS } from "../socket/realtime.ts";

const badId = (res: Response) =>
    res.status(400).json({ message: "Invalid id" });

export const createFriendRequest = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = createFriendRequestSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

        const receiverId = new mongoose.Types.ObjectId(parsed.data.receiverId);
        const me = req.user._id as mongoose.Types.ObjectId;

        if (receiverId.equals(me)) {
            return res.status(400).json({ message: "Cannot send request to yourself" });
        }

        const doc = await FriendRequest.create({
            senderId: me,
            receiverId,
            status: "pending",
        });
        const payload = {
            ...doc.toObject(),
            _meta: {
                fromUserId: String(me),
                fromUsername: req.user.username,
                spaceName: "Personal",
            },
        };
        emitToUser(String(me), SOCKET_EVENTS.friendRequestCreated, payload);
        emitToUser(String(receiverId), SOCKET_EVENTS.friendRequestCreated, payload);
        return res.status(201).json(doc);
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({
                message: "A pending friend request already exists between these users",
            });
        }
        return sendServerError(res, "createFriendRequest", error);
    }
};

export const listFriendRequests = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const me = req.user._id;
        const requests = await FriendRequest.find({
            $or: [{ senderId: me }, { receiverId: me }],
        })
            .populate("senderId", "_id username email profilePic status lastSeenAt updatedAt")
            .populate("receiverId", "_id username email profilePic status lastSeenAt updatedAt")
            .sort({ createdAt: -1 });
        return res.status(200).json(requests);
    } catch (error) {
        return sendServerError(res, "listFriendRequests", error);
    }
};

export const getFriendRequestById = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const doc = await FriendRequest.findById(id);
        if (!doc) return res.status(404).json({ message: "Friend request not found" });

        const me = req.user._id as mongoose.Types.ObjectId;
        if (!doc.senderId.equals(me) && !doc.receiverId.equals(me)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return res.status(200).json(doc);
    } catch (error) {
        return sendServerError(res, "getFriendRequestById", error);
    }
};

export const updateFriendRequest = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = updateFriendRequestSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

        const doc = await FriendRequest.findById(id);
        if (!doc) return res.status(404).json({ message: "Friend request not found" });

        const me = req.user._id as mongoose.Types.ObjectId;
        if (!doc.receiverId.equals(me)) {
            return res.status(403).json({ message: "Only the receiver can update status" });
        }

        if (doc.status !== "pending" && parsed.data.status !== doc.status) {
            return res.status(400).json({ message: "Request is no longer pending" });
        }

        doc.status = parsed.data.status;
        await doc.save();
        const payload = {
            ...doc.toObject(),
            _meta: {
                fromUserId: String(req.user._id),
                fromUsername: req.user.username,
                spaceName: "Personal",
            },
        };
        emitToUser(String(doc.senderId), SOCKET_EVENTS.friendRequestUpdated, payload);
        emitToUser(String(doc.receiverId), SOCKET_EVENTS.friendRequestUpdated, payload);
        return res.status(200).json(doc);
    } catch (error) {
        return sendServerError(res, "updateFriendRequest", error);
    }
};

export const deleteFriendRequest = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const doc = await FriendRequest.findById(id);
        if (!doc) return res.status(404).json({ message: "Friend request not found" });

        const me = req.user._id as mongoose.Types.ObjectId;
        if (!doc.senderId.equals(me) && !doc.receiverId.equals(me)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const senderId = String(doc.senderId);
        const receiverId = String(doc.receiverId);
        await FriendRequest.findByIdAndDelete(id);
        emitToUser(senderId, SOCKET_EVENTS.friendRequestDeleted, { _id: id });
        emitToUser(receiverId, SOCKET_EVENTS.friendRequestDeleted, { _id: id });
        return res.status(200).json({ message: "Friend request deleted" });
    } catch (error) {
        return sendServerError(res, "deleteFriendRequest", error);
    }
};
