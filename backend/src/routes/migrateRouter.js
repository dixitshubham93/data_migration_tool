import { Router } from "express";
import { migrate } from "../controllers/migrate.controller.js";
import {check} from "../controllers/checkconnection.controller.js"
import { getMigratedData} from "../controllers/PreviewData.controller.js";
const router = Router();
router.route("/start").post(migrate);
router.route("/check").post(check);
router.route("/data").post(getMigratedData)

export default router;