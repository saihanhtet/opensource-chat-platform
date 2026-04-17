import type { Server as HttpServer } from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import Conversation from "../models/conversation.model.ts";
import Team from "../models/team.model.ts";
import TeamMember from "../models/teamMember.model.ts";
import User from "../models/user.model.ts";
import { authenticateSocketUser } from "./auth.ts";
import { conversationRoom, SOCKET_EVENTS, teamRoom, userRoom } from "./events.ts";

let io: Server | null = null;

const typingState = new Map<string, Map<string, string>>();

const emitTypingUsers = (conversationId: string) => {
    const users = typingState.get(conversationId) ?? new Map<string, string>();
    io?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.typingUpdated, {
        conversationId,
        users: [...users.entries()].map(([userId, username]) => ({ userId, username })),
    });
};

const canJoinConversation = async (
    conversationId: string,
    userId: mongoose.Types.ObjectId
) => {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return false;
    const conversation = await Conversation.findById(conversationId).select("participantIds");
    if (!conversation) return false;
    return conversation.participantIds.some((participant) => participant.equals(userId));
};

const canJoinTeam = async (teamId: string, userId: mongoose.Types.ObjectId) => {
    if (!mongoose.Types.ObjectId.isValid(teamId)) return false;
    const team = await Team.findById(teamId).select("createdBy");
    if (!team) return false;
    if (team.createdBy.equals(userId)) return true;
    const membership = await TeamMember.findOne({
        teamId,
        userId,
        status: "active",
    }).select("_id");
    return !!membership;
};

const markPresence = async (userId: string, status: "active" | "offline") => {
    await User.findByIdAndUpdate(userId, {
        status,
        lastSeenAt: new Date(),
    });
    io?.emit(SOCKET_EVENTS.presenceUpdated, {
        userId,
        status,
        lastSeenAt: new Date().toISOString(),
    });
    io?.to(userRoom(userId)).emit(SOCKET_EVENTS.presenceUpdated, {
        userId,
        status,
        lastSeenAt: new Date().toISOString(),
    });
};

export const initSocketServer = (httpServer: HttpServer) => {
    if (io) return io;
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL ?? "http://localhost:5173",
            credentials: true,
        },
    });

    io.use(async (socket, next) => {
        const user = await authenticateSocketUser(socket);
        if (!user) return next(new Error("Unauthorized"));
        socket.data.user = {
            _id: String(user._id),
            username: user.username,
            email: user.email,
        };
        return next();
    });

    io.on("connection", async (socket) => {
        const userId = socket.data.user?._id as string;
        const username = socket.data.user?.username as string;
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        socket.join(userRoom(userId));
        await markPresence(userId, "active");

        socket.on(SOCKET_EVENTS.roomJoin, async (payload: { type: "conversation" | "team"; id: string }) => {
            if (payload?.type === "conversation") {
                const allowed = await canJoinConversation(
                    payload.id,
                    new mongoose.Types.ObjectId(userId)
                );
                if (allowed) socket.join(conversationRoom(payload.id));
                return;
            }
            if (payload?.type === "team") {
                const allowed = await canJoinTeam(payload.id, new mongoose.Types.ObjectId(userId));
                if (allowed) socket.join(teamRoom(payload.id));
            }
        });

        socket.on(SOCKET_EVENTS.roomLeave, (payload: { type: "conversation" | "team"; id: string }) => {
            if (payload?.type === "conversation") {
                socket.leave(conversationRoom(payload.id));
            }
            if (payload?.type === "team") {
                socket.leave(teamRoom(payload.id));
            }
        });

        socket.on(
            SOCKET_EVENTS.typingSet,
            async (payload: { conversationId: string; isTyping: boolean }) => {
                const allowed = await canJoinConversation(
                    payload.conversationId,
                    new mongoose.Types.ObjectId(userId)
                );
                if (!allowed) return;
                const conversationId = payload.conversationId;
                const current = typingState.get(conversationId) ?? new Map<string, string>();
                if (payload.isTyping) {
                    current.set(userId, username);
                    typingState.set(conversationId, current);
                } else {
                    current.delete(userId);
                    if (current.size === 0) typingState.delete(conversationId);
                }
                emitTypingUsers(conversationId);
            }
        );

        socket.on("disconnect", async () => {
            for (const [conversationId, users] of typingState.entries()) {
                if (users.has(userId)) {
                    users.delete(userId);
                    if (users.size === 0) typingState.delete(conversationId);
                    emitTypingUsers(conversationId);
                }
            }
            await markPresence(userId, "offline");
        });
    });

    return io;
};

export const getSocketServer = () => {
    if (!io) throw new Error("Socket server is not initialized");
    return io;
};
