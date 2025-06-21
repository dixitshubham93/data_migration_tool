
import dotenv from "dotenv";
import { app } from "./App.js";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true
}));

dotenv.config({
  path: "./.env",
});
  const port = process.env.PORT;
  const server = createServer(app);

  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
app.get("/", (req, res) => {
  res.send("<h1>listening started</h1>");
});
  server.listen(port ,()=>{
    console.log(`server is started listening on ${port}`)
  });
