
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

export const client = new Resend(process.env.RESEND_API);

export const sender = {
    email: process.env.SENDER_EMAIL,
    name: process.env.SENDER_NAME,
}