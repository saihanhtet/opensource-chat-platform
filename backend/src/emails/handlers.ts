
import {client, sender} from "../lib/emailsUtils.ts";
import welcomeEmailTemplate, { passwordResetEmailTemplate } from "./templates.ts";

export interface sendWelcomeProps {
    email: string;
    name: string;
    url: string;
}

export interface SendPasswordResetProps {
    email: string;
    name: string;
    resetUrl: string;
}

export const sendWelcomeMail = async ({ email, name, url }: sendWelcomeProps) => {
    const {data, error} = await client.emails.send({
        from: `${sender.name} <${sender.email}>`,
        to: email,
        subject: "Welcome to OpenChat!",
        html: welcomeEmailTemplate({name, url}),
    })

    if (error) {
        console.error("Email sending:",error)
        throw new Error("Failed to send welcome email")
    }

    console.log(`Sending ${email} to ${name} successfully!`)
}

export const sendPasswordResetMail = async ({
    email,
    name,
    resetUrl,
}: SendPasswordResetProps) => {
    const { error } = await client.emails.send({
        from: `${sender.name} <${sender.email}>`,
        to: email,
        subject: "Reset your OpenChat password",
        html: passwordResetEmailTemplate({ name, resetUrl }),
    });

    if (error) {
        console.error("Email sending:", error);
        throw new Error("Failed to send password reset email");
    }

    console.log(`Password reset email sent to ${email}`);
};