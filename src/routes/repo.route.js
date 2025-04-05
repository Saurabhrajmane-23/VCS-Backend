import { Router } from "express";
import { createRepository, getRepositories } from "../controllers/repo.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/repo").post(verifyJWT, upload.none(), createRepository);
router.route("/repo/get").get(verifyJWT, getRepositories);

export default router;
