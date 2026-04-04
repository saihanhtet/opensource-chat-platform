import express from 'express';
import { signOut, signIn, signUp } from '../controllers/auth.controller';
import {editProfile} from "../controllers/profile.controller.ts";
import {protectedRoutes, upload} from "../proxy/auth.proxy.ts";

const router = express.Router();

// authentication
router.post("/sign-up", signUp);
router.post("/sign-in", signIn)
router.post("/sign-out", signOut)

// check token
router.get("/check-token", protectedRoutes, (req, res) => {
    return res.status(200).json(req.user);
})

// profile
router.put("/profile", protectedRoutes, upload.single("profilePic"), editProfile);

export default router;