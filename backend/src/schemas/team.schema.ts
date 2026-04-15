import { z } from "zod";

const teamRoleSchema = z.enum(["owner", "admin", "moderator", "member"]);
const rolePermissionsSchema = z.object({
    statusManagement: z.object({
        owner: z.array(teamRoleSchema).optional(),
        admin: z.array(teamRoleSchema).optional(),
        moderator: z.array(teamRoleSchema).optional(),
        member: z.array(teamRoleSchema).optional(),
    }).optional(),
}).optional();

export const createTeamSchema = z.object({
    teamName: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    rolePermissions: rolePermissionsSchema,
});

export const updateTeamSchema = z.object({
    teamName: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    rolePermissions: rolePermissionsSchema,
});
