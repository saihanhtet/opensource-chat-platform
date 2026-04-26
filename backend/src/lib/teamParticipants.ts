import mongoose from "mongoose";

import Conversation from "../models/conversation.model.ts";
import Team from "../models/team.model.ts";
import TeamMember from "../models/teamMember.model.ts";

export async function getActiveTeamParticipantIds(
    teamId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
    const team = await Team.findById(teamId).select("createdBy");
    if (!team) return [];
    const members = await TeamMember.find({
        teamId,
        status: "active",
    }).select("userId");
    const ids = new Set<string>();
    ids.add(team.createdBy.toString());
    for (const row of members) {
        ids.add(row.userId.toString());
    }
    return [...ids].map((id) => new mongoose.Types.ObjectId(id));
}

export async function userCanAccessTeam(
    teamId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
): Promise<boolean> {
    const team = await Team.findById(teamId).select("createdBy");
    if (!team) return false;
    if (team.createdBy.equals(userId)) return true;
    const membership = await TeamMember.findOne({
        teamId,
        userId,
        status: "active",
    }).select("_id");
    return !!membership;
}

export async function addUserToAllTeamChannels(
    teamId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
): Promise<void> {
    await Conversation.updateMany({ type: "team", teamId }, { $addToSet: { participantIds: userId } });
}

export async function removeUserFromAllTeamChannels(
    teamId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
): Promise<void> {
    await Conversation.updateMany({ type: "team", teamId }, { $pull: { participantIds: userId } });
}
