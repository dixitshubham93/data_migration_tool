import { Router } from "express";
import { migrate } from "../controllers/migrate.Controller.js";

const router = Router();
router.route("/start").post(migrate)
export default router;