import express from "express";

import {
    createConversation,
    deleteConversation,
    getConversationById,
    listConversations,
    updateConversation,
} from "../controllers/conversation.controller.ts";
import { protectedRoutes } from "../proxy/auth.proxy.ts";

const router = express.Router();

router.use(protectedRoutes);

router.post("/", createConversation);
router.get("/", listConversations);
router.get("/:id", getConversationById);
router.put("/:id", updateConversation);
router.delete("/:id", deleteConversation);

export default router;
