import { z } from "zod";

export const createTeamSchema = z.object({
    teamName: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
});

export const updateTeamSchema = z.object({
    teamName: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
});
