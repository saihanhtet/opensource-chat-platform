import express from 'express';

const router = express.Router();


router.get("/sign-up", (request, response) => {
    response.send("Sign Up Endpoint");
});


router.get("/sign-in", (request, response) => {
    response.send("Sign In Endpoint");
})


router.get("/sign-out", (request, response) => {
    response.send("Sign Out Endpoint");
})

export default router;