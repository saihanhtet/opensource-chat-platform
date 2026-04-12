import { randomBytes } from "node:crypto";
import type { Express } from "express";
import mongoose from "mongoose";
import request from "supertest";

type Credentials = {
    username: string;
    email: string;
    password: string;
};

export type AuthedAgent = {
    agent: request.Agent;
    userId: string;
    email: string;
    username: string;
};

export const uniqueUser = (): Credentials => {
    const hex = randomBytes(8).toString("hex");
    return {
        username: hex.slice(0, 12),
        email: `${hex}@test.local`,
        password: "secret12",
    };
};

export const signUp = async (
    app: Express,
    creds: Credentials
): Promise<AuthedAgent> => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/sign-up").send(creds);
    if (res.status !== 201) {
        throw new Error(`signUp failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    const userId = res.body._id;
    if (!userId) throw new Error("signUp: missing _id in response");
    return {
        agent,
        userId: String(userId),
        email: creds.email,
        username: creds.username,
    };
};

export const signIn = async (
    app: Express,
    creds: Pick<Credentials, "email" | "password">
): Promise<AuthedAgent> => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/sign-in").send(creds);
    if (res.status !== 200) {
        throw new Error(`signIn failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    const userId = res.body._id;
    if (!userId) throw new Error("signIn: missing _id");
    return {
        agent,
        userId: String(userId),
        email: creds.email,
        username: String(res.body.username),
    };
};

export const clearDatabase = async () => {
    const cols = mongoose.connection.collections;
    for (const col of Object.values(cols)) {
        await col.deleteMany({});
    }
};
