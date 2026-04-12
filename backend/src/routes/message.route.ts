import express from "express";

import {
    createMessage,
    deleteMessage,
    getMessageById,
    listMessages,
    updateMessage,
} from "../controllers/message.controller.ts";
import { protectedRoutes } from "../proxy/auth.proxy.ts";

const router = express.Router();

router.use(protectedRoutes);

router.post("/", createMessage);
router.get("/", listMessages);
router.get("/:id", getMessageById);
router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);

export default router;
