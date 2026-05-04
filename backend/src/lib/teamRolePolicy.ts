import mongoose from "mongoose";

import type { TeamDocument } from "../models/team.model.ts";
import TeamMember from "../models/teamMember.model.ts";

export type TeamRole = "owner" | "admin" | "moderator" | "member";

/** Space role for API checks (creator is always `owner`). */
export const getRequesterSpaceRole = async (
    team: Pick<TeamDocument, "createdBy"> | null,
    teamId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
): Promise<TeamRole | null> => {
    if (!team) return null;
    if (team.createdBy.equals(userId)) return "owner";
    const membership = await TeamMember.findOne({
        teamId,
        userId,
        status: "active",
    }).select("memberRole");
    if (!membership) return null;
    return membership.memberRole as TeamRole;
};

const defaultChannelCreators: TeamRole[] = ["owner"];

export const getChannelCreatorRoles = (
    team: Pick<TeamDocument, "rolePermissions"> | null
): TeamRole[] => {
    const configured = team?.rolePermissions?.channelManagement?.createChannel;
    if (!Array.isArray(configured) || configured.length === 0) {
        return [...defaultChannelCreators];
    }
    return [...configured] as TeamRole[];
};

/** Whether this user may create a new public team channel (not DM). */
export const userCanCreateTeamChannel = async (
    team: TeamDocument | null,
    teamId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
): Promise<boolean> => {
    if (!team) return false;
    if (team.createdBy.equals(userId)) return true;
    const role = await getRequesterSpaceRole(team, teamId, userId);
    if (!role) return false;
    return getChannelCreatorRoles(team).includes(role);
};
