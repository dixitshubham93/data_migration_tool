import { Router } from "express";
import { migrate } from "../controllers/migrate.controller.js";
import {check} from "../controllers/checkconnection.controller.js"
const router = Router();
router.route("/start").post(migrate);
router.route("/check").post(check);

export default router;