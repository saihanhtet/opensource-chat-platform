import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
} from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";

import { createApp } from "../src/app.ts";
import Team from "../src/models/team.model.ts";
import TeamMember from "../src/models/teamMember.model.ts";
import User from "../src/models/user.model.ts";
import {
    clearDatabase,
    signUp,
    uniqueUser,
    type AuthedAgent,
} from "./helpers.ts";

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret-key-for-integration-tests";
    process.env.CLIENT_URL = "http://localhost:5173";
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

beforeEach(async () => {
    await clearDatabase();
});

describe("Auth routes", () => {
    test("POST /api/auth/sign-up rejects invalid password length", async () => {
        const res = await request(app).post("/api/auth/sign-up").send({
            username: "shortname",
            email: "a@b.co",
            password: "12345",
        });
        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    test("POST /api/auth/sign-up creates user and sets cookie", async () => {
        const c = uniqueUser();
        const res = await request(app).post("/api/auth/sign-up").send(c);
        expect(res.status).toBe(201);
        expect(res.body._id).toBeDefined();
        expect(res.body.email).toBe(c.email);
        expect(res.headers["set-cookie"]).toBeDefined();
    });

    test("POST /api/auth/sign-up creates a personal team for the user", async () => {
        const c = uniqueUser();
        const res = await request(app).post("/api/auth/sign-up").send(c);
        expect(res.status).toBe(201);

        const personalTeam = await Team.findOne({
            createdBy: res.body._id,
            teamType: "personal",
        });
        expect(personalTeam).toBeDefined();

        const membership = await TeamMember.findOne({
            teamId: personalTeam?._id,
            userId: res.body._id,
            status: "active",
        });
        expect(membership).toBeDefined();
        expect(membership?.memberRole).toBe("member");
    });

    test("POST /api/auth/sign-up returns 409 for duplicate email", async () => {
        const c = uniqueUser();
        await request(app).post("/api/auth/sign-up").send(c);
        const res = await request(app).post("/api/auth/sign-up").send({
            ...uniqueUser(),
            email: c.email,
        });
        expect(res.status).toBe(409);
    });

    test("POST /api/auth/sign-in succeeds and sets cookie", async () => {
        const c = uniqueUser();
        await request(app).post("/api/auth/sign-up").send(c);
        const res = await request(app).post("/api/auth/sign-in").send({
            email: c.email,
            password: c.password,
        });
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(c.email);
        expect(res.headers["set-cookie"]).toBeDefined();
    });

    test("POST /api/auth/sign-in returns 401 for wrong password", async () => {
        const c = uniqueUser();
        await request(app).post("/api/auth/sign-up").send(c);
        const res = await request(app).post("/api/auth/sign-in").send({
            email: c.email,
            password: "wrongpassword",
        });
        expect(res.status).toBe(401);
    });

    test("GET /api/auth/check-token returns 401 without cookie", async () => {
        const res = await request(app).get("/api/auth/check-token");
        expect(res.status).toBe(401);
    });

    test("GET /api/auth/check-token returns user when authenticated", async () => {
        const { agent, email } = await signUp(app, uniqueUser());
        const res = await agent.get("/api/auth/check-token");
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(email);
        expect(res.body.role).toBe("user");
        expect(res.body.status).toBe("active");
    });

    test("GET /api/auth/users/by-username/:username returns matching user", async () => {
        const target = await signUp(app, uniqueUser());
        const requester = await signUp(app, uniqueUser());
        const res = await requester.agent.get(
            `/api/auth/users/by-username/${target.username}`
        );
        expect(res.status).toBe(200);
        expect(res.body._id).toBe(target.userId);
        expect(res.body.username).toBe(target.username);
    });

    test("POST /api/ai/rewrite rewrites text using default free model", async () => {
        const { agent } = await signUp(app, uniqueUser());
        const res = await agent.post("/api/ai/rewrite").send({
            text: "hey can u send me the document asap",
            model: "gemini-2.5-flash",
        });
        expect(res.status).toBe(200);
        expect(res.body.rewrittenText).toContain("Formal:");
        expect(res.body.model).toBe("gemini-2.0-flash");
    });

    test("POST /api/auth/sign-out clears session", async () => {
        const { agent } = await signUp(app, uniqueUser());
        const out = await agent.post("/api/auth/sign-out");
        expect(out.status).toBe(200);
        const check = await agent.get("/api/auth/check-token");
        expect(check.status).toBe(401);
    });

    test("POST /api/auth/forgot-password responds safely for unknown email", async () => {
        const res = await request(app).post("/api/auth/forgot-password").send({
            email: "missing-user@test.local",
        });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain("If an account with that email exists");
    });

    test("POST /api/auth/forgot-password stores reset token for existing user", async () => {
        const creds = uniqueUser();
        await request(app).post("/api/auth/sign-up").send(creds);

        const res = await request(app).post("/api/auth/forgot-password").send({
            email: creds.email,
        });

        expect(res.status).toBe(200);

        const user = await User.findOne({ email: creds.email });
        expect(user).toBeDefined();
        expect(user?.resetPasswordToken).toBeTruthy();
        expect(user?.resetPasswordTokenExpiresAt).toBeTruthy();
        expect(new Date(user!.resetPasswordTokenExpiresAt!).getTime()).toBeGreaterThan(
            Date.now()
        );
    });

    test("POST /api/auth/reset-password returns 400 for invalid token", async () => {
        const res = await request(app).post("/api/auth/reset-password").send({
            token: "invalid-token",
            password: "newsecret12",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid or expired reset link.");
    });

    test("POST /api/auth/reset-password updates password and clears reset fields", async () => {
        const creds = uniqueUser();
        await request(app).post("/api/auth/sign-up").send(creds);

        const user = await User.findOne({ email: creds.email });
        expect(user).toBeDefined();

        const rawToken = "plain-reset-token";
        const crypto = await import("crypto");
        const hashedToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        await User.updateOne(
            { _id: user!._id },
            {
                $set: {
                    resetPasswordToken: hashedToken,
                    resetPasswordTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
                },
            }
        );

        const reset = await request(app).post("/api/auth/reset-password").send({
            token: rawToken,
            password: "newsecret12",
        });
        expect(reset.status).toBe(200);

        const oldLogin = await request(app).post("/api/auth/sign-in").send({
            email: creds.email,
            password: creds.password,
        });
        expect(oldLogin.status).toBe(401);

        const newLogin = await request(app).post("/api/auth/sign-in").send({
            email: creds.email,
            password: "newsecret12",
        });
        expect(newLogin.status).toBe(200);

        const refreshed = await User.findById(user!._id);
        expect(refreshed?.resetPasswordToken).toBeNull();
        expect(refreshed?.resetPasswordTokenExpiresAt).toBeNull();
    });

    test("PUT /api/auth/profile returns 401 without auth", async () => {
        const res = await request(app)
            .put("/api/auth/profile")
            .send({ username: "newname" });
        expect(res.status).toBe(401);
    });

    test("PUT /api/auth/profile updates username when authenticated", async () => {
        const { agent } = await signUp(app, uniqueUser());
        const res = await agent.put("/api/auth/profile").send({
            username: "updatedname",
        });
        expect(res.status).toBe(200);
        expect(res.body.user.username).toBe("updatedname");
    });

    test("PUT /api/auth/profile returns 400 when no fields to update", async () => {
        const { agent } = await signUp(app, uniqueUser());
        const res = await agent.put("/api/auth/profile").send({});
        expect(res.status).toBe(400);
    });
});

describe("Team routes", () => {
    test("GET /api/teams returns 401 without auth", async () => {
        const res = await request(app).get("/api/teams");
        expect(res.status).toBe(401);
    });

    test("CRUD team as creator", async () => {
        const owner = await signUp(app, uniqueUser());

        const create = await owner.agent.post("/api/teams").send({
            teamName: "Alpha",
            description: "desc",
        });
        expect(create.status).toBe(201);
        expect(create.body.teamName).toBe("Alpha");
        const teamId = create.body._id;

        const list = await owner.agent.get("/api/teams");
        expect(list.status).toBe(200);
        expect(Array.isArray(list.body)).toBe(true);
        expect(list.body.length).toBe(1);

        const one = await owner.agent.get(`/api/teams/${teamId}`);
        expect(one.status).toBe(200);
        expect(one.body.teamName).toBe("Alpha");

        const upd = await owner.agent.put(`/api/teams/${teamId}`).send({
            teamName: "Alpha2",
        });
        expect(upd.status).toBe(200);
        expect(upd.body.teamName).toBe("Alpha2");

        const del = await owner.agent.delete(`/api/teams/${teamId}`);
        expect(del.status).toBe(200);

        const gone = await owner.agent.get(`/api/teams/${teamId}`);
        expect(gone.status).toBe(404);
    });

    test("non-owner cannot update or delete team", async () => {
        const owner = await signUp(app, uniqueUser());
        const other = await signUp(app, uniqueUser());

        const create = await owner.agent.post("/api/teams").send({
            teamName: "Beta",
        });
        const teamId = create.body._id;

        const badPut = await other.agent.put(`/api/teams/${teamId}`).send({
            teamName: "Hacked",
        });
        expect(badPut.status).toBe(403);

        const badDel = await other.agent.delete(`/api/teams/${teamId}`);
        expect(badDel.status).toBe(403);
    });

    test("GET /api/teams/:id returns 400 for invalid id", async () => {
        const { agent } = await signUp(app, uniqueUser());
        const res = await agent.get("/api/teams/not-an-id");
        expect(res.status).toBe(400);
    });

    test("GET /api/teams excludes personal teams and unrelated teams", async () => {
        const owner = await signUp(app, uniqueUser());
        const member = await signUp(app, uniqueUser());
        const outsider = await signUp(app, uniqueUser());

        const ownerGroup = await owner.agent.post("/api/teams").send({
            teamName: "Owner Group",
        });
        expect(ownerGroup.status).toBe(201);

        const outsiderGroup = await outsider.agent.post("/api/teams").send({
            teamName: "Outsider Group",
        });
        expect(outsiderGroup.status).toBe(201);

        const join = await owner.agent.post("/api/team-members").send({
            teamId: ownerGroup.body._id,
            userId: member.userId,
        });
        expect(join.status).toBe(201);

        const memberList = await member.agent.get("/api/teams");
        expect(memberList.status).toBe(200);
        expect(memberList.body.length).toBe(1);
        expect(memberList.body[0].teamName).toBe("Owner Group");
        expect(memberList.body[0].teamType).toBe("group");
    });
});

describe("Team member routes", () => {
    let owner: AuthedAgent;
    let teamId: string;

    beforeEach(async () => {
        await clearDatabase();
        owner = await signUp(app, uniqueUser());
        const t = await owner.agent.post("/api/teams").send({ teamName: "T" });
        teamId = t.body._id;
    });

    test("user can join team (self as userId)", async () => {
        const joiner = await signUp(app, uniqueUser());
        const res = await joiner.agent.post("/api/team-members").send({
            teamId,
            userId: joiner.userId,
        });
        expect(res.status).toBe(201);
        expect(res.body.teamId).toBe(teamId);
    });

    test("duplicate team membership fails", async () => {
        const joiner = await signUp(app, uniqueUser());
        const first = await joiner.agent.post("/api/team-members").send({
            teamId,
            userId: joiner.userId,
        });
        expect(first.status).toBe(201);
        const second = await joiner.agent.post("/api/team-members").send({
            teamId,
            userId: joiner.userId,
        });
        expect(second.status).toBe(409);
    });

    test("list members filtered by teamId query", async () => {
        const joiner = await signUp(app, uniqueUser());
        await joiner.agent.post("/api/team-members").send({
            teamId,
            userId: joiner.userId,
        });
        const res = await owner.agent.get(
            `/api/team-members?teamId=${teamId}`
        );
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(typeof res.body[0].userId).toBe("object");
        expect(res.body[0].userId._id).toBe(joiner.userId);
        expect(res.body[0].userId.username).toBeDefined();
        expect(res.body[0].userId.email).toBeDefined();
    });

    test("member can remove themselves", async () => {
        const joiner = await signUp(app, uniqueUser());
        const created = await joiner.agent.post("/api/team-members").send({
            teamId,
            userId: joiner.userId,
        });
        const memberId = created.body._id;
        const del = await joiner.agent.delete(`/api/team-members/${memberId}`);
        expect(del.status).toBe(200);
    });
});

describe("Conversation routes", () => {
    test("create requires caller in participantIds", async () => {
        const a = await signUp(app, uniqueUser());
        const b = await signUp(app, uniqueUser());
        const res = await a.agent.post("/api/conversations").send({
            type: "direct",
            participantIds: [b.userId],
        });
        expect(res.status).toBe(400);
    });

    test("create, list, get, update, delete for participant", async () => {
        const a = await signUp(app, uniqueUser());
        const b = await signUp(app, uniqueUser());

        const create = await a.agent.post("/api/conversations").send({
            type: "direct",
            participantIds: [a.userId, b.userId],
        });
        expect(create.status).toBe(201);
        const convId = create.body._id;

        const listA = await a.agent.get("/api/conversations");
        expect(listA.status).toBe(200);
        expect(
            listA.body.some(
                (c: { _id: string }) => String(c._id) === String(convId)
            )
        ).toBe(true);

        const getB = await b.agent.get(`/api/conversations/${convId}`);
        expect(getB.status).toBe(200);

        const outsider = await signUp(app, uniqueUser());
        const getOut = await outsider.agent.get(`/api/conversations/${convId}`);
        expect(getOut.status).toBe(403);

        const upd = await a.agent.put(`/api/conversations/${convId}`).send({
            lastMessage: "hi",
        });
        expect(upd.status).toBe(200);
        expect(upd.body.lastMessage).toBe("hi");

        const del = await a.agent.delete(`/api/conversations/${convId}`);
        expect(del.status).toBe(200);
    });

    test("typing status is visible to other participant", async () => {
        const a = await signUp(app, uniqueUser());
        const b = await signUp(app, uniqueUser());

        const create = await a.agent.post("/api/conversations").send({
            type: "direct",
            participantIds: [a.userId, b.userId],
        });
        expect(create.status).toBe(201);
        const convId = create.body._id;

        const setTyping = await a.agent
            .post(`/api/conversations/${convId}/typing`)
            .send({ isTyping: true });
        expect(setTyping.status).toBe(200);

        const visibleToB = await b.agent.get(`/api/conversations/${convId}/typing`);
        expect(visibleToB.status).toBe(200);
        expect(visibleToB.body.users.length).toBe(1);
        expect(visibleToB.body.users[0]._id).toBe(a.userId);
        expect(visibleToB.body.users[0].username).toBe(a.username);
    });
});

describe("Message routes", () => {
    async function twoUserConversation() {
        const a = await signUp(app, uniqueUser());
        const b = await signUp(app, uniqueUser());
        const conv = await a.agent.post("/api/conversations").send({
            type: "direct",
            participantIds: [a.userId, b.userId],
        });
        return { a, b, convId: conv.body._id as string };
    }

    test("create message updates conversation lastMessage", async () => {
        const { a, convId } = await twoUserConversation();
        const msg = await a.agent.post("/api/messages").send({
            conversationId: convId,
            content: "Hello world",
        });
        expect(msg.status).toBe(201);
        expect(msg.body.content).toBe("Hello world");

        const conv = await a.agent.get(`/api/conversations/${convId}`);
        expect(conv.body.lastMessage.length).toBeGreaterThan(0);
    });

    test("non-participant cannot create message", async () => {
        const { a, convId } = await twoUserConversation();
        const c = await signUp(app, uniqueUser());
        const res = await c.agent.post("/api/messages").send({
            conversationId: convId,
            content: "x",
        });
        expect(res.status).toBe(403);
    });

    test("list messages by conversationId query", async () => {
        const { a, convId } = await twoUserConversation();
        await a.agent.post("/api/messages").send({
            conversationId: convId,
            content: "one",
        });
        const res = await a.agent.get(
            `/api/messages?conversationId=${convId}`
        );
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
    });

    test("only sender can update or delete message", async () => {
        const { a, b, convId } = await twoUserConversation();
        const msg = await a.agent.post("/api/messages").send({
            conversationId: convId,
            content: "secret",
        });
        const msgId = msg.body._id;

        const badPut = await b.agent.put(`/api/messages/${msgId}`).send({
            content: "changed",
        });
        expect(badPut.status).toBe(403);

        const okPut = await a.agent.put(`/api/messages/${msgId}`).send({
            content: "edited",
        });
        expect(okPut.status).toBe(200);

        const badDel = await b.agent.delete(`/api/messages/${msgId}`);
        expect(badDel.status).toBe(403);

        const okDel = await a.agent.delete(`/api/messages/${msgId}`);
        expect(okDel.status).toBe(200);
    });
});

describe("Friend request routes", () => {
    test("create, list, get, receiver accepts, delete", async () => {
        const sender = await signUp(app, uniqueUser());
        const receiver = await signUp(app, uniqueUser());

        const create = await sender.agent.post("/api/friend-requests").send({
            receiverId: receiver.userId,
        });
        expect(create.status).toBe(201);
        expect(create.body.status).toBe("pending");
        const frId = create.body._id;

        const dup = await sender.agent.post("/api/friend-requests").send({
            receiverId: receiver.userId,
        });
        expect(dup.status).toBe(409);

        const listR = await receiver.agent.get("/api/friend-requests");
        expect(listR.status).toBe(200);
        expect(listR.body.length).toBe(1);

        const getS = await sender.agent.get(`/api/friend-requests/${frId}`);
        expect(getS.status).toBe(200);

        const badUpd = await sender.agent
            .put(`/api/friend-requests/${frId}`)
            .send({ status: "accepted" });
        expect(badUpd.status).toBe(403);

        const accept = await receiver.agent
            .put(`/api/friend-requests/${frId}`)
            .send({ status: "accepted" });
        expect(accept.status).toBe(200);
        expect(accept.body.status).toBe("accepted");

        const del = await sender.agent.delete(`/api/friend-requests/${frId}`);
        expect(del.status).toBe(200);
    });

    test("cannot send friend request to self", async () => {
        const u = await signUp(app, uniqueUser());
        const res = await u.agent.post("/api/friend-requests").send({
            receiverId: u.userId,
        });
        expect(res.status).toBe(400);
    });
});

describe("Uploaded file routes", () => {
    async function convWithParticipant() {
        const a = await signUp(app, uniqueUser());
        const b = await signUp(app, uniqueUser());
        const conv = await a.agent.post("/api/conversations").send({
            type: "direct",
            participantIds: [a.userId, b.userId],
        });
        return { a, b, convId: conv.body._id as string };
    }

    test("CRUD file record as participant", async () => {
        const { a, convId } = await convWithParticipant();

        const create = await a.agent.post("/api/files").send({
            conversationId: convId,
            fileName: "doc.pdf",
            fileType: "application/pdf",
            fileUrl: "https://example.com/doc.pdf",
        });
        expect(create.status).toBe(201);
        const fileId = create.body._id;

        const list = await a.agent.get(`/api/files?conversationId=${convId}`);
        expect(list.status).toBe(200);
        expect(list.body.length).toBe(1);

        const one = await a.agent.get(`/api/files/${fileId}`);
        expect(one.status).toBe(200);

        const upd = await a.agent.put(`/api/files/${fileId}`).send({
            fileName: "renamed.pdf",
        });
        expect(upd.status).toBe(200);

        const del = await a.agent.delete(`/api/files/${fileId}`);
        expect(del.status).toBe(200);
    });

    test("non-participant cannot create file metadata", async () => {
        const { a, convId } = await convWithParticipant();
        const c = await signUp(app, uniqueUser());
        const res = await c.agent.post("/api/files").send({
            conversationId: convId,
            fileName: "x",
            fileType: "text/plain",
            fileUrl: "https://x.com/x",
        });
        expect(res.status).toBe(403);
    });

    test("non-uploader cannot update file", async () => {
        const { a, b, convId } = await convWithParticipant();
        const create = await a.agent.post("/api/files").send({
            conversationId: convId,
            fileName: "a.txt",
            fileType: "text/plain",
            fileUrl: "https://x.com/a",
        });
        const fileId = create.body._id;
        const res = await b.agent.put(`/api/files/${fileId}`).send({
            fileName: "b.txt",
        });
        expect(res.status).toBe(403);
    });

    test("upload endpoint creates file metadata and linked message", async () => {
        const { a, convId } = await convWithParticipant();
        const upload = await a.agent
            .post("/api/files/upload")
            .field("conversationId", convId)
            .field("content", "attached file")
            .attach("file", Buffer.from("hello world"), "hello.txt");
        expect(upload.status).toBe(201);
        expect(upload.body.file).toBeDefined();
        expect(upload.body.file.fileName).toBe("hello.txt");
        expect(upload.body.message).toBeDefined();
        expect(upload.body.message.fileUrl).toBeTruthy();
        expect(upload.body.message.content).toBe("attached file");
    });
});

describe("Cross-route flow", () => {
    test("team conversation with message and file", async () => {
        const owner = await signUp(app, uniqueUser());
        const member = await signUp(app, uniqueUser());

        const team = await owner.agent.post("/api/teams").send({
            teamName: "Squad",
        });
        const teamId = team.body._id;

        await member.agent.post("/api/team-members").send({
            teamId,
            userId: member.userId,
        });

        const conv = await owner.agent.post("/api/conversations").send({
            type: "team",
            teamId,
            participantIds: [owner.userId, member.userId],
        });
        expect(conv.status).toBe(201);
        const convId = conv.body._id;

        const msg = await member.agent.post("/api/messages").send({
            conversationId: convId,
            content: "standup time",
        });
        expect(msg.status).toBe(201);

        const file = await owner.agent.post("/api/files").send({
            conversationId: convId,
            fileName: "notes.md",
            fileType: "text/markdown",
            fileUrl: "https://cdn.example/notes.md",
        });
        expect(file.status).toBe(201);
    });
});
