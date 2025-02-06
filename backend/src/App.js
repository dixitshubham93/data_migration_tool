import express from "express";
import cookieParser from "cookie-parser";
import migrateRouter from "./routes/migrateRouter.js";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "text/plain" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("<h1>listening started</h1>");
});

app.use("/migrate", migrateRouter);

export { app };
