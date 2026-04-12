import express from "express";

import {
    createTeam,
    deleteTeam,
    getTeamById,
    listTeams,
    updateTeam,
} from "../controllers/team.controller.ts";
import { protectedRoutes } from "../proxy/auth.proxy.ts";

const router = express.Router();

router.use(protectedRoutes);

router.post("/", createTeam);
router.get("/", listTeams);
router.get("/:id", getTeamById);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);

export default router;
