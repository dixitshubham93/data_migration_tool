import { Router } from "express";
import { migrate } from "../controllers/migrate.controller.js";

const router = Router();
router.route("/start").post(migrate);
export default router;