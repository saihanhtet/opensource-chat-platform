import express from "express";

import {
    createUploadedFile,
    deleteUploadedFile,
    getUploadedFileById,
    listUploadedFiles,
    updateUploadedFile,
} from "../controllers/uploadedFile.controller.ts";
import { protectedRoutes } from "../proxy/auth.proxy.ts";

const router = express.Router();

router.use(protectedRoutes);

router.post("/", createUploadedFile);
router.get("/", listUploadedFiles);
router.get("/:id", getUploadedFileById);
router.put("/:id", updateUploadedFile);
router.delete("/:id", deleteUploadedFile);

export default router;
