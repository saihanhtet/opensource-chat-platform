import express from "express";

import * as uploadedFileController from "../controllers/uploadedFile.controller.ts";
import { protectedRoutes, upload } from "../proxy/auth.proxy.ts";

const router = express.Router();

router.use(protectedRoutes);

router.post("/", uploadedFileController.createUploadedFile);
router.post("/upload", upload.single("file"), uploadedFileController.uploadChatFile);
router.get("/", uploadedFileController.listUploadedFiles);
router.get("/:id", uploadedFileController.getUploadedFileById);
router.put("/:id", uploadedFileController.updateUploadedFile);
router.delete("/:id", uploadedFileController.deleteUploadedFile);

export default router;
