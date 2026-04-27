import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { isAllowedOrigin, parseAllowedOrigins } from "./lib/cors.ts";

import authRoute from "./routes/auth.route.ts";
import aiRoute from "./routes/ai.route.ts";
import conversationRoute from "./routes/conversation.route.ts";
import friendRequestRoute from "./routes/friendRequest.route.ts";
import messageRoute from "./routes/message.route.ts";
import teamRoute from "./routes/team.route.ts";
import teamMemberRoute from "./routes/teamMember.route.ts";
import uploadedFileRoute from "./routes/uploadedFile.route.ts";

export const createApp = () => {
    const app = express();
    const allowedOrigins = parseAllowedOrigins();
    app.use(
        cors({
            origin: (origin, callback) => {
                if (isAllowedOrigin(origin, allowedOrigins)) {
                    return callback(null, true);
                }
                return callback(null, false);
            },
            credentials: true,
        })
    );
    app.use(express.json());
    app.use(cookieParser());
    app.use("/uploads", express.static(path.join(import.meta.dir, "../uploads")));

    app.use("/api/auth", authRoute);
    app.use("/api/ai", aiRoute);
    app.use("/api/teams", teamRoute);
    app.use("/api/team-members", teamMemberRoute);
    app.use("/api/conversations", conversationRoute);
    app.use("/api/messages", messageRoute);
    app.use("/api/friend-requests", friendRequestRoute);
    app.use("/api/files", uploadedFileRoute);

    return app;
};
