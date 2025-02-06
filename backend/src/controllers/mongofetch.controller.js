// import express from "express";
// import { Socket } from "node:dgram";
// import { createServer } from "node:http";
// import path from "node:path";
// import { Server } from "socket.io";
// import { MongoClient } from "mongodb";

// const uri =
//   "mongodb+srv://dixitshubham8873:LV1G1dTec1hO3hWy@mycluster.98leq.mongodb.net?retryWrites=true&w=majority&appName=MyCluster"; // Replace with your MongoDB URI
// const client = new MongoClient(uri);
// const app = express();
// const server = createServer(app);
// const io = new Server(server, {
//   connectionStateRecovery: {},
// });
// const resolvePath = path.resolve("public", "index.html");

// io.on("connection", async (socket) => {
//   console.log("user connected");
//   let page = 0;
//   const limit = 10;

//   try {
//     // Connect to MongoDB
//     await client.connect();

//     // Select the database and collection
//     const database = client.db("sample_mflix"); // Replace with your database name
//     const collection = database.collection("comments"); // Replace with your collection name
//     console.log("database is connected");
//     while (true) {
//       const docs = await collection
//         .find()
//         .skip(page * limit)
//         .limit(limit)
//         .toArray();

//       if (!docs.length) {
//         socket.emit("end", { message: "No more data" });
//         break;
//       }

//       socket.emit("chunk", docs); // Send a chunk
//       page++;

//       await new Promise((resolve) => setTimeout(resolve, 500));
//     }
//   } catch (err) {
//     console.error("Error:", err);
//     socket.emit("error", { message: "An error occurred" });
//   }
// });

// // express app
// app.use(express.static(resolvePath));
// app.get("/", (req, res) => {
//   res.sendFile(resolvePath);
// });
// // http instance server
// server.listen(3000, () => {
//   console.log("server running at http://localhost:3000");
// });
