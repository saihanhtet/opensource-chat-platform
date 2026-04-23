import type { Request, Response } from "express";
import mongoose from "mongoose";

import * as utils from "../lib/utils.ts";
import type { TeamDocument } from "../models/team.model.ts";
import Team from "../models/team.model.ts";
import TeamMember from "../models/teamMember.model.ts";
import User from "../models/user.model.ts";
import * as teamMemberSchema from "../schemas/teamMember.schema.ts";
import * as realtime from "../socket/realtime.ts";

type TeamRole = "owner" | "admin" | "moderator" | "member";

const badId = (res: Response) =>
    res.status(400).json({ message: "Invalid id" });

const defaultStatusManagementPermissions: Record<TeamRole, TeamRole[]> = {
    owner: ["owner", "admin", "moderator", "member"],
    admin: ["moderator", "member"],
    moderator: ["member"],
    member: [],
};

const getStatusManagementPermissions = (
    team: TeamDocument | null
): Record<TeamRole, TeamRole[]> => {
    const configured = team?.rolePermissions?.statusManagement;
    return {
        owner: configured?.owner ?? defaultStatusManagementPermissions.owner,
        admin: configured?.admin ?? defaultStatusManagementPermissions.admin,
        moderator: configured?.moderator ?? defaultStatusManagementPermissions.moderator,
        member: configured?.member ?? defaultStatusManagementPermissions.member,
    };
};

const getRequesterRole = async (
    team: TeamDocument | null,
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

const canManageTeamMember = async (
    team: TeamDocument | null,
    teamId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
) => {
    const requesterRole = await getRequesterRole(team, teamId, userId);
    return requesterRole === "owner" || requesterRole === "admin";
};

const canRequesterManageTarget = (
    requesterRole: TeamRole,
    targetRole: TeamRole,
    team: TeamDocument | null
): boolean => {
    const permissions = getStatusManagementPermissions(team);
    return permissions[requesterRole].includes(targetRole);
};

const resolveUserId = async (
    userId?: string,
    identifier?: string
): Promise<mongoose.Types.ObjectId | null> => {
    if (userId) {
        return new mongoose.Types.ObjectId(userId);
    }
    if (!identifier) return null;

    const normalized = identifier.trim();
    const byEmail = await User.findOne({
        email: normalized.toLowerCase(),
    }).select("_id");
    if (byEmail) return byEmail._id as mongoose.Types.ObjectId;

    const byUsername = await User.findOne({ username: normalized }).select("_id");
    if (byUsername) return byUsername._id as mongoose.Types.ObjectId;
    return null;
};

export const createTeamMember = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = teamMemberSchema.createTeamMemberSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const { teamId, userId, identifier, memberRole, status } = parsed.data;
        const teamObjectId = new mongoose.Types.ObjectId(teamId);
        const userObjectId = await resolveUserId(userId, identifier);
        if (!userObjectId) {
            return res.status(404).json({ message: "User not found" });
        }
        const team = await Team.findById(teamObjectId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        const requesterId = req.user._id as mongoose.Types.ObjectId;
        const joiningSelf = requesterId.equals(userObjectId);
        const targetRole = (memberRole ?? "member") as TeamRole;

        if (!joiningSelf) {
            const requesterRole = await getRequesterRole(team, teamObjectId, requesterId);
            const canInvite = await canManageTeamMember(team, teamObjectId, requesterId);
            if (!requesterRole || !canInvite) {
                return res.status(403).json({ message: "Forbidden" });
            }
            if (!canRequesterManageTarget(requesterRole, targetRole, team)) {
                return res.status(403).json({ message: "Cannot assign this role" });
            }
        }

        if (joiningSelf && targetRole !== "member") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const member = await TeamMember.create({
            teamId: teamObjectId,
            userId: userObjectId,
            memberRole: joiningSelf ? "member" : (memberRole ?? "member"),
            status: status ?? "active",
        });
        const populated = await TeamMember.findById(member._id)
            .populate("userId", "_id username email profilePic status lastSeenAt updatedAt");
        if (populated) {
            const payload = {
                ...populated.toObject(),
                _meta: {
                    fromUserId: String(req.user._id),
                    fromUsername: req.user.username,
                    spaceName: team.teamName,
                },
            };
            realtime.emitToTeam(String(populated.teamId), realtime.SOCKET_EVENTS.teamMemberCreated, payload);
            realtime.emitToUser(String(populated.userId?._id ?? userObjectId), realtime.SOCKET_EVENTS.teamMemberCreated, payload);
        }
        return res.status(201).json(populated);
    } catch (error) {
        if (utils.isDuplicateKeyError(error)) {
            return res.status(409).json({
                message: "User is already a member of this team",
            });
        }
        return utils.sendServerError(res, "createTeamMember", error);
    }
};

export const listTeamMembers = async (req: Request, res: Response) => {
    try {
        const { teamId } = req.query;
        const filter: Record<string, unknown> = {};
        if (typeof teamId === "string" && mongoose.Types.ObjectId.isValid(teamId)) {
            filter.teamId = new mongoose.Types.ObjectId(teamId);
        }
        const members = await TeamMember.find(filter)
            .populate("userId", "_id username email profilePic status lastSeenAt updatedAt")
            .sort({ joinedAt: -1 });
        return res.status(200).json(members);
    } catch (error) {
        return utils.sendServerError(res, "listTeamMembers", error);
    }
};

export const getTeamMemberById = async (req: Request, res: Response) => {
    try {
        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const member = await TeamMember.findById(id);
        if (!member) return res.status(404).json({ message: "Team member not found" });
        return res.status(200).json(member);
    } catch (error) {
        return utils.sendServerError(res, "getTeamMemberById", error);
    }
};

export const updateTeamMember = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = teamMemberSchema.updateTeamMemberSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const member = await TeamMember.findById(id);
        if (!member) return res.status(404).json({ message: "Team member not found" });
        const team = await Team.findById(member.teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        const requesterId = req.user._id as mongoose.Types.ObjectId;
        const isSelf = member.userId.equals(requesterId);
        const requesterRole = await getRequesterRole(team, member.teamId, requesterId);
        if (!requesterRole) return res.status(403).json({ message: "Forbidden" });
        const targetRole = member.userId.equals(team.createdBy)
            ? "owner"
            : (member.memberRole as TeamRole);

        if (isSelf) {
            if (parsed.data.memberRole || parsed.data.status) {
                return res.status(403).json({ message: "Cannot change your own role or status" });
            }
            return res.status(200).json(member);
        }
        if (!canRequesterManageTarget(requesterRole, targetRole, team)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        if (parsed.data.memberRole) {
            if (!canRequesterManageTarget(requesterRole, parsed.data.memberRole as TeamRole, team)) {
                return res.status(403).json({ message: "Cannot assign this role" });
            }
            if (isSelf && parsed.data.memberRole !== member.memberRole) {
                return res.status(403).json({ message: "Cannot change your own role" });
            }
        }

        Object.assign(member, parsed.data);
        await member.save();
        const populated = await TeamMember.findById(member._id)
            .populate("userId", "_id username email profilePic status lastSeenAt updatedAt");
        if (populated) {
            const payload = {
                ...populated.toObject(),
                _meta: {
                    fromUserId: String(req.user._id),
                    fromUsername: req.user.username,
                    spaceName: team.teamName,
                },
            };
            realtime.emitToTeam(String(populated.teamId), realtime.SOCKET_EVENTS.teamMemberUpdated, payload);
            realtime.emitToUser(String(populated.userId?._id ?? member.userId), realtime.SOCKET_EVENTS.teamMemberUpdated, payload);
        }
        return res.status(200).json(populated);
    } catch (error) {
        return utils.sendServerError(res, "updateTeamMember", error);
    }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const member = await TeamMember.findById(id);
        if (!member) return res.status(404).json({ message: "Team member not found" });
        const team = await Team.findById(member.teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        const requesterId = req.user._id as mongoose.Types.ObjectId;
        const isSelf = member.userId.equals(requesterId);
        const requesterRole = await getRequesterRole(team, member.teamId, requesterId);
        if (!requesterRole) return res.status(403).json({ message: "Forbidden" });
        const targetRole = member.userId.equals(team.createdBy)
            ? "owner"
            : (member.memberRole as TeamRole);

        if (!isSelf && !canRequesterManageTarget(requesterRole, targetRole, team)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const teamId = String(member.teamId);
        const userId = String(member.userId);
        await TeamMember.findByIdAndDelete(id);
        realtime.emitToTeam(teamId, realtime.SOCKET_EVENTS.teamMemberRemoved, { _id: id, teamId, userId });
        realtime.emitToUser(userId, realtime.SOCKET_EVENTS.teamMemberRemoved, { _id: id, teamId, userId });
        return res.status(200).json({ message: "Team member removed" });
    } catch (error) {
        return utils.sendServerError(res, "deleteTeamMember", error);
    }
};
