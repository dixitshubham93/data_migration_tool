import dbconnect from "./src/db/dbconnection.js";
import dotenv from "dotenv";
import { app } from "./App.js";

dotenv.config({
  path: "./.env",
});

dbconnect()
  .then(() => {
    const port = process.env.PORT || 8000;
    app.listen(port, () => {
      console.log(`Listening on the port :${port}`);
    });
  })
  .catch(() => {
    console.log("database connection is failed");
  });
