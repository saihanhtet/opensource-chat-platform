
import {client, sender} from "../lib/emailsUtils.ts";
import welcomeTemplate from "./templates.ts"
interface sendWelcomeProp {
    email: string;
    name: string;
    url: string;
}

export const sendWelcomeMail = async (body: sendWelcomeProp) => {
    const { email, name, url } = body;
    const {data, error} = await client.emails.send({
        from: `${sender.name} <${sender.email}>`,
        to: email,
        subject: "Welcome to OpenChat!",
        html: welcomeTemplate(name, url)
    })

    if (error) {
        console.error("Email sending:",error)
        throw new Error("Failed to send welcome email")
    }

    console.log(`Sending ${email} to ${name} successfully!`)
}