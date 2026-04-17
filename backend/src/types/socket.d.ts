import "socket.io";

declare module "socket.io" {
    interface Socket {
        data: {
            user?: {
                _id: string;
                username: string;
                email: string;
            };
        };
    }
}
