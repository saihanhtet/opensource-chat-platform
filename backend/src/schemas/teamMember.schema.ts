import { z } from "zod";
import { objectIdString } from "./objectId.schema.ts";

export const createTeamMemberSchema = z.object({
    teamId: objectIdString,
    userId: objectIdString,
    memberRole: z.enum(["owner", "admin", "member"]).optional(),
    status: z.enum(["pending", "active", "removed"]).optional(),
});

export const updateTeamMemberSchema = z.object({
    memberRole: z.enum(["owner", "admin", "member"]).optional(),
    status: z.enum(["pending", "active", "removed"]).optional(),
});
