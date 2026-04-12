import express from "express";

import {
    createFriendRequest,
    deleteFriendRequest,
    getFriendRequestById,
    listFriendRequests,
    updateFriendRequest,
} from "../controllers/friendRequest.controller.ts";
import { protectedRoutes } from "../proxy/auth.proxy.ts";

const router = express.Router();

router.use(protectedRoutes);

router.post("/", createFriendRequest);
router.get("/", listFriendRequests);
router.get("/:id", getFriendRequestById);
router.put("/:id", updateFriendRequest);
router.delete("/:id", deleteFriendRequest);

export default router;
