import type { Socket } from "socket.io";
import { getAuthUserFromToken, parseTokenFromCookieHeader } from "../lib/auth-session.ts";

export const authenticateSocketUser = async (socket: Socket) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = parseTokenFromCookieHeader(cookieHeader);
    const user = await getAuthUserFromToken(token);
    return user;
};
