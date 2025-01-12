import { Router } from "express";
import mongofetchcontroller from "../controllers/mongofetch.controller.js";
const mongodbRouter= Router();
mongodbRouter.route('./').post(mongofetchcontroller);
export{ mongodbRouter};