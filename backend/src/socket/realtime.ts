import { conversationRoom, SOCKET_EVENTS, teamRoom, userRoom } from "./events.ts";
import { getSocketServer } from "./server.ts";

const withSocket = (fn: () => void) => {
    try {
        fn();
    } catch {
        // Socket server may not be initialized in some test contexts.
    }
};

export const emitToConversation = (
    conversationId: string,
    event: string,
    payload: unknown
) => {
    withSocket(() => {
        getSocketServer().to(conversationRoom(conversationId)).emit(event, payload);
    });
};

export const emitToTeam = (teamId: string, event: string, payload: unknown) => {
    withSocket(() => {
        getSocketServer().to(teamRoom(teamId)).emit(event, payload);
    });
};

export const emitToUser = (userId: string, event: string, payload: unknown) => {
    withSocket(() => {
        getSocketServer().to(userRoom(userId)).emit(event, payload);
    });
};

export const emitGlobal = (event: string, payload: unknown) => {
    withSocket(() => {
        getSocketServer().emit(event, payload);
    });
};

export { SOCKET_EVENTS };
