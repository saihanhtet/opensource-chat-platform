import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
    isDuplicateKeyError,
    reqParamId,
    sendServerError,
    sendValidationError,
} from "../lib/utils.ts";
import Team from "../models/team.model.ts";
import TeamMember from "../models/teamMember.model.ts";
import {
    createTeamMemberSchema,
    updateTeamMemberSchema,
} from "../schemas/teamMember.schema.ts";

const badId = (res: Response) =>
    res.status(400).json({ message: "Invalid id" });

const canManageTeamMember = async (
    teamId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
) => {
    const team = await Team.findById(teamId);
    if (!team) return false;
    if (team.createdBy.equals(userId)) return true;
    const membership = await TeamMember.findOne({
        teamId,
        userId,
        status: "active",
        memberRole: { $in: ["owner", "admin"] },
    });
    return !!membership;
};

export const createTeamMember = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = createTeamMemberSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

        const { teamId, userId, memberRole, status } = parsed.data;
        const teamObjectId = new mongoose.Types.ObjectId(teamId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const requesterId = req.user._id as mongoose.Types.ObjectId;

        const joiningSelf = requesterId.equals(userObjectId);
        const isTeamCreator = await Team.exists({
            _id: teamObjectId,
            createdBy: requesterId,
        });
        const canInvite = await canManageTeamMember(teamObjectId, requesterId);

        if (!joiningSelf && !isTeamCreator && !canInvite) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const member = await TeamMember.create({
            teamId: teamObjectId,
            userId: userObjectId,
            memberRole: memberRole ?? "member",
            status: status ?? "active",
        });
        return res.status(201).json(member);
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({
                message: "User is already a member of this team",
            });
        }
        return sendServerError(res, "createTeamMember", error);
    }
};

export const listTeamMembers = async (req: Request, res: Response) => {
    try {
        const { teamId } = req.query;
        const filter: Record<string, unknown> = {};
        if (typeof teamId === "string" && mongoose.Types.ObjectId.isValid(teamId)) {
            filter.teamId = new mongoose.Types.ObjectId(teamId);
        }
        const members = await TeamMember.find(filter).sort({ joinedAt: -1 });
        return res.status(200).json(members);
    } catch (error) {
        return sendServerError(res, "listTeamMembers", error);
    }
};

export const getTeamMemberById = async (req: Request, res: Response) => {
    try {
        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const member = await TeamMember.findById(id);
        if (!member) return res.status(404).json({ message: "Team member not found" });
        return res.status(200).json(member);
    } catch (error) {
        return sendServerError(res, "getTeamMemberById", error);
    }
};

export const updateTeamMember = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = updateTeamMemberSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

        const member = await TeamMember.findById(id);
        if (!member) return res.status(404).json({ message: "Team member not found" });

        const requesterId = req.user._id as mongoose.Types.ObjectId;
        const isSelf = member.userId.equals(requesterId);
        const canManage = await canManageTeamMember(member.teamId, requesterId);

        if (!isSelf && !canManage) {
            return res.status(403).json({ message: "Forbidden" });
        }
        if (isSelf && parsed.data.memberRole) {
            return res.status(403).json({ message: "Cannot change your own role" });
        }

        Object.assign(member, parsed.data);
        await member.save();
        return res.status(200).json(member);
    } catch (error) {
        return sendServerError(res, "updateTeamMember", error);
    }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const id = reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const member = await TeamMember.findById(id);
        if (!member) return res.status(404).json({ message: "Team member not found" });

        const requesterId = req.user._id as mongoose.Types.ObjectId;
        const isSelf = member.userId.equals(requesterId);
        const canManage = await canManageTeamMember(member.teamId, requesterId);

        if (!isSelf && !canManage) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await TeamMember.findByIdAndDelete(id);
        return res.status(200).json({ message: "Team member removed" });
    } catch (error) {
        return sendServerError(res, "deleteTeamMember", error);
    }
};
