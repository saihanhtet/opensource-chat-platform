import express from 'express';
import { signOut, signIn, signUp } from '../controllers/auth.controller';


const router = express.Router();

router.post("/sign-up", signUp);
router.post("/sign-in", signIn)
router.post("/sign-out", signOut)

export default router;