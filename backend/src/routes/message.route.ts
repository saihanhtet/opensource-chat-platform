import express from 'express';

const router = express.Router();


router.get("/send", (request, response) => {
    response.send("Send Endpoint");
});


export default router;