
import {client, sender} from "../lib/emailsUtils.ts";
import welcomeEmailTemplate from "./templates.ts";

export interface sendWelcomeProps {
    email: string;
    name: string;
    url: string;
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