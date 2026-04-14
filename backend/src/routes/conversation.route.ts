import express from "express";

import {
    createConversation,
    deleteConversation,
    getTypingStatus,
    getConversationById,
    listConversations,
    setTypingStatus,
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
router.get("/:id/typing", getTypingStatus);
router.post("/:id/typing", setTypingStatus);

export default router;
