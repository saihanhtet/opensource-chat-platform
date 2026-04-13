import express from 'express';
import {
    forgotPassword,
    resetPassword,
    signIn,
    signOut,
    signUp,
} from '../controllers/auth.controller';
import {editProfile} from "../controllers/profile.controller.ts";
import {protectedRoutes, upload} from "../proxy/auth.proxy.ts";

const router = express.Router();

// authentication
router.post("/sign-up", signUp);
router.post("/sign-in", signIn)
router.post("/sign-out", signOut)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)

// check token
router.get("/check-token", protectedRoutes, (req, res) => {
    return res.status(200).json(req.user);
})

// profile
router.put("/profile", protectedRoutes, upload.single("profilePic"), editProfile);

export default router;