import express from 'express';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import path from 'path';

import authRoute from './routes/auth.route.ts';
import conversationRoute from './routes/conversation.route.ts';
import friendRequestRoute from './routes/friendRequest.route.ts';
import messageRoute from './routes/message.route.ts';
import teamRoute from './routes/team.route.ts';
import teamMemberRoute from './routes/teamMember.route.ts';
import uploadedFileRoute from './routes/uploadedFile.route.ts';

import { connectDatabase } from "./lib/database.ts";

dotenv.config();

const app = express();
const __dirname = path.resolve();

const port = process.env.PORT || 3001;
const env = process.env.NODE_ENV || 'development';

app.use(express.json()) // middleware
app.use(cookieParser())

app.use('/api/auth', authRoute);
app.use('/api/teams', teamRoute);
app.use('/api/team-members', teamMemberRoute);
app.use('/api/conversations', conversationRoute);
app.use('/api/messages', messageRoute);
app.use('/api/friend-requests', friendRequestRoute);
app.use('/api/files', uploadedFileRoute);

if (env === 'production') {
    const static_assets = express.static(path.resolve(__dirname, '../frontend/out'));
    app.use(static_assets);

    app.get('/*splat', (_, res) => {
        res.sendFile(path.join(__dirname, '../frontend', 'out', 'index.html'));
    });
}

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
    connectDatabase().then(r => console.log("Server can talk now"));
});