// src/lib/emailsUtils.ts
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const resendApiKey =
    process.env.RESEND_API ??
    process.env.RESEND_API_KEY ??
    "test-resend-api-key";

export const client = new Resend(resendApiKey);

export const sender = {
    email: process.env.SENDER_EMAIL,
    name: process.env.SENDER_NAME,
}