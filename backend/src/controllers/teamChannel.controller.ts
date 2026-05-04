import type { Request, Response } from "express";
import mongoose from "mongoose";

import { userCanCreateTeamChannel } from "../lib/teamRolePolicy.ts";
import {
    getActiveTeamParticipantIds,
    userCanAccessTeam,
} from "../lib/teamParticipants.ts";
import * as utils from "../lib/utils.ts";
import Conversation from "../models/conversation.model.ts";
import Team from "../models/team.model.ts";
import * as teamChannelSchema from "../schemas/teamChannel.schema.ts";
import * as realtime from "../socket/realtime.ts";

const badId = (res: Response) =>
    res.status(400).json({ message: "Invalid id" });

export const listTeamChannels = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const teamIdParam = req.params.id;
        if (!teamIdParam || !mongoose.Types.ObjectId.isValid(teamIdParam)) return badId(res);

        const teamId = new mongoose.Types.ObjectId(teamIdParam);
        const me = req.user._id as mongoose.Types.ObjectId;

        if (!(await userCanAccessTeam(teamId, me))) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const channels = await Conversation.find({
            type: "team",
            teamId,
            participantIds: me,
        }).sort({ updatedAt: -1 });

        return res.status(200).json(channels);
    } catch (error) {
        return utils.sendServerError(res, "listTeamChannels", error);
    }
};

export const createTeamChannel = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const teamIdParam = req.params.id;
        if (!teamIdParam || !mongoose.Types.ObjectId.isValid(teamIdParam)) return badId(res);

        const parsed = teamChannelSchema.createTeamChannelSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const teamId = new mongoose.Types.ObjectId(teamIdParam);
        const me = req.user._id as mongoose.Types.ObjectId;

        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        if (!(await userCanCreateTeamChannel(team, teamId, me))) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const name = parsed.data.name.trim();
        const existing = await Conversation.findOne({
            type: "team",
            teamId,
            name,
        }).select("_id");
        if (existing) {
            return res.status(409).json({ message: "A channel with this name already exists" });
        }

        const participantIds = await getActiveTeamParticipantIds(teamId);
        if (participantIds.length === 0) {
            return res.status(400).json({ message: "No participants available for this team" });
        }

        const doc = await Conversation.create({
            type: "team",
            teamId,
            name,
            participantIds,
            lastMessage: "",
        });

        realtime.emitToConversation(String(doc._id), realtime.SOCKET_EVENTS.conversationUpdated, doc);
        realtime.emitToTeam(String(teamId), realtime.SOCKET_EVENTS.teamChannelCreated, doc);

        return res.status(201).json(doc);
    } catch (error) {
        return utils.sendServerError(res, "createTeamChannel", error);
    }
};
