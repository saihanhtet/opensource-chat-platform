import express from "express";

import {
    createTeamMember,
    deleteTeamMember,
    getTeamMemberById,
    listTeamMembers,
    updateTeamMember,
} from "../controllers/teamMember.controller.ts";
import { protectedRoutes } from "../proxy/auth.proxy.ts";

const router = express.Router();

router.use(protectedRoutes);

router.post("/", createTeamMember);
router.get("/", listTeamMembers);
router.get("/:id", getTeamMemberById);
router.put("/:id", updateTeamMember);
router.delete("/:id", deleteTeamMember);

export default router;
