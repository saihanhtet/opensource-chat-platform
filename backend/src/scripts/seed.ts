/**
 * Demo database seed. Requires MONGODB_URI in .env.
 *
 * Usage:
 *   bun run seed              → clears all app collections, then inserts demo data
 *   bun run seed --append     → insert only if DB is empty (no wipe)
 *
 * WARNING: default mode deletes every document in Users, Teams, TeamMembers,
 * Conversations, Messages, FriendRequests, and UploadedFile (files collection).
 */

import dotenv from "dotenv";

dotenv.config();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import Conversation from "../models/conversation.model.ts";
import FriendRequest from "../models/friendRequest.model.ts";
import Message from "../models/message.model.ts";
import Team from "../models/team.model.ts";
import TeamMember from "../models/teamMember.model.ts";
import UploadedFile from "../models/uploadedFile.model.ts";
import User from "../models/user.model.ts";

const DEMO_PASSWORD = "demo1234";

const DEMO_USERS = [
    {
        username: "alice",
        email: "alice@demo.local",
        role: "admin" as const,
        status: "active" as const,
    },
    {
        username: "bob",
        email: "bob@demo.local",
        role: "user" as const,
        status: "active" as const,
    },
    {
        username: "carol",
        email: "carol@demo.local",
        role: "user" as const,
        status: "away" as const,
    },
    {
        username: "dave",
        email: "dave@demo.local",
        role: "user" as const,
        status: "offline" as const,
    },
];

async function wipeCollections() {
    await UploadedFile.deleteMany({});
    await Message.deleteMany({});
    await FriendRequest.deleteMany({});
    await Conversation.deleteMany({});
    await TeamMember.deleteMany({});
    await Team.deleteMany({});
    await User.deleteMany({});
}

async function main() {
    const appendOnly = process.argv.includes("--append");
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error("Missing MONGODB_URI. Add it to backend/.env");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);

    if (appendOnly) {
        const count = await User.countDocuments();
        if (count > 0) {
            console.error(
                "Database is not empty. Run `bun run seed` (without --append) to wipe and reseed, or use an empty database."
            );
            await mongoose.disconnect();
            process.exit(1);
        }
        console.log("Append mode: inserting into empty database.");
    } else {
        console.log("Wiping existing data…");
        await wipeCollections();
    }

    const passwordHash = await bcrypt.hash(
        DEMO_PASSWORD,
        await bcrypt.genSalt(10)
    );

    const users = await User.insertMany(
        DEMO_USERS.map((u) => ({
            ...u,
            password: passwordHash,
            profilePic: "",
        }))
    );

    const alice = users[0]!;
    const bob = users[1]!;
    const carol = users[2]!;
    const dave = users[3]!;

    const team = await Team.create({
        teamName: "Demo Squad",
        description: "Seeded team for local demo and UI testing.",
        createdBy: alice._id,
    });

    await TeamMember.insertMany([
        {
            teamId: team._id,
            userId: alice._id,
            memberRole: "owner",
            status: "active",
        },
        {
            teamId: team._id,
            userId: bob._id,
            memberRole: "member",
            status: "active",
        },
        {
            teamId: team._id,
            userId: carol._id,
            memberRole: "member",
            status: "active",
        },
    ]);

    const directConv = await Conversation.create({
        type: "direct",
        participantIds: [alice._id, bob._id],
        lastMessage: "",
    });

    const teamConv = await Conversation.create({
        type: "team",
        teamId: team._id,
        name: "general",
        participantIds: [alice._id, bob._id, carol._id],
        lastMessage: "",
    });

    const msgAliceDirect = await Message.create({
        conversationId: directConv._id,
        senderId: alice._id,
        content: "Hey Bob — welcome to the demo chat!",
        fileUrl: "",
    });
    await Message.create({
        conversationId: directConv._id,
        senderId: bob._id,
        content: "Thanks Alice! This looks great.",
        fileUrl: "",
    });
    directConv.lastMessage = msgAliceDirect.content.slice(0, 500);
    await directConv.save();

    const msgCarolTeam = await Message.create({
        conversationId: teamConv._id,
        senderId: carol._id,
        content: "Quick reminder: standup in 10 minutes.",
        fileUrl: "",
    });
    await Message.create({
        conversationId: teamConv._id,
        senderId: alice._id,
        content: "I'll drop the doc link in a minute.",
        fileUrl: "",
    });
    teamConv.lastMessage = msgCarolTeam.content.slice(0, 500);
    await teamConv.save();

    await FriendRequest.create({
        senderId: bob._id,
        receiverId: carol._id,
        status: "pending",
    });
    await FriendRequest.create({
        senderId: alice._id,
        receiverId: dave._id,
        status: "accepted",
    });

    await UploadedFile.create({
        uploadedBy: alice._id,
        conversationId: teamConv._id,
        fileName: "sprint-notes.md",
        fileType: "text/markdown",
        fileUrl: "https://example.com/demo/sprint-notes.md",
    });

    console.log("\nSeed finished successfully.");
    console.log("─".repeat(50));
    console.log(`Demo login password (all users): ${DEMO_PASSWORD}`);
    console.log("Accounts:");
    for (const u of DEMO_USERS) {
        console.log(`  • ${u.username.padEnd(8)} ${u.email}`);
    }
    console.log(`Team: ${team.teamName} (${team._id})`);
    console.log("─".repeat(50));

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
