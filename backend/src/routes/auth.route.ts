import express from 'express';
import { signUp } from '../controllers/auth.controller';


const router = express.Router();

router.post("/sign-up", signUp);


router.get("/sign-in", (request, response) => {
    response.send("Sign In Endpoint");
})


router.get("/sign-out", (request, response) => {
    response.send("Sign Out Endpoint");
})

export default router;