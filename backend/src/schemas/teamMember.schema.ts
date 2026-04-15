import { z } from "zod";
import { objectIdString } from "./objectId.schema.ts";

export const createTeamMemberSchema = z.object({
    teamId: objectIdString,
    userId: objectIdString.optional(),
    identifier: z.string().trim().min(1).optional(),
    memberRole: z.enum(["owner", "admin", "moderator", "member"]).optional(),
    status: z.enum(["pending", "active", "removed"]).optional(),
}).refine((value) => value.userId || value.identifier, {
    message: "Either userId or identifier is required",
    path: ["identifier"],
});

export const updateTeamMemberSchema = z.object({
    memberRole: z.enum(["owner", "admin", "moderator", "member"]).optional(),
    status: z.enum(["pending", "active", "removed"]).optional(),
});
