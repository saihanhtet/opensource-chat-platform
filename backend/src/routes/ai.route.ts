import express from "express";

import { rewriteMessage } from "../controllers/ai.controller.ts";
import { protectedRoutes } from "../proxy/auth.proxy.ts";

const router = express.Router();

router.use(protectedRoutes);
router.post("/rewrite", rewriteMessage);

export default router;

