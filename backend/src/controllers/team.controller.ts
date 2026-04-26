import type { Request, Response } from "express";
import mongoose from "mongoose";

import * as utils from "../lib/utils.ts";
import Team from "../models/team.model.ts";
import TeamMember from "../models/teamMember.model.ts";
import * as teamSchema from "../schemas/team.schema.ts";
import * as realtime from "../socket/realtime.ts";

const badId = (res: Response) =>
    res.status(400).json({ message: "Invalid id" });

export const createTeam = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = teamSchema.createTeamSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const team = await Team.create({
            ...parsed.data,
            teamType: "group",
            createdBy: req.user._id,
        });
        const payload = {
            ...team.toObject(),
            _meta: {
                fromUserId: String(req.user._id),
                fromUsername: req.user.username,
                spaceName: team.teamName,
            },
        };
        realtime.emitGlobal(realtime.SOCKET_EVENTS.teamCreated, payload);
        realtime.emitToUser(String(req.user._id), realtime.SOCKET_EVENTS.teamCreated, payload);
        return res.status(201).json(team);
    } catch (error) {
        return utils.sendServerError(res, "createTeam", error);
    }
};

export const listTeams = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const memberships = await TeamMember.find({
            userId: req.user._id,
            status: "active",
        }).select("teamId");
        const memberTeamIds = memberships.map((member) => member.teamId);

        const teams = await Team.find({
            $and: [
                {
                    $or: [{ teamType: "group" }, { teamType: { $exists: false } }],
                },
                {
                    $or: [{ createdBy: req.user._id }, { _id: { $in: memberTeamIds } }],
                },
            ],
        }).sort({ createdAt: -1 });
        return res.status(200).json(teams);
    } catch (error) {
        return utils.sendServerError(res, "listTeams", error);
    }
};

export const getTeamById = async (req: Request, res: Response) => {
    try {
        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const team = await Team.findById(id);
        if (!team) return res.status(404).json({ message: "Team not found" });
        return res.status(200).json(team);
    } catch (error) {
        return utils.sendServerError(res, "getTeamById", error);
    }
};

export const updateTeam = async (req: Request, res: Response) => {
    try {
        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        const parsed = teamSchema.updateTeamSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const team = await Team.findById(id);
        if (!team) return res.status(404).json({ message: "Team not found" });

        if (!team.createdBy.equals(req.user._id)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        Object.assign(team, parsed.data);
        await team.save();
        const payload = {
            ...team.toObject(),
            _meta: {
                fromUserId: String(req.user._id),
                fromUsername: req.user.username,
                spaceName: team.teamName,
            },
        };
        realtime.emitToTeam(String(team._id), realtime.SOCKET_EVENTS.teamUpdated, payload);
        return res.status(200).json(team);
    } catch (error) {
        return utils.sendServerError(res, "updateTeam", error);
    }
};

export const deleteTeam = async (req: Request, res: Response) => {
    try {
        const id = utils.reqParamId(req);
        if (!id || !mongoose.Types.ObjectId.isValid(id)) return badId(res);

        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const team = await Team.findById(id);
        if (!team) return res.status(404).json({ message: "Team not found" });

        if (!team.createdBy.equals(req.user._id)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const deletedTeamId = String(team._id);
        await Team.findByIdAndDelete(id);
        realtime.emitToTeam(deletedTeamId, realtime.SOCKET_EVENTS.teamDeleted, { _id: deletedTeamId });
        return res.status(200).json({ message: "Team deleted" });
    } catch (error) {
        return utils.sendServerError(res, "deleteTeam", error);
    }
};
