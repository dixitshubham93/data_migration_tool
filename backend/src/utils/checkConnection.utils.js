import { MongoClient } from "mongodb";
import ApiError from "./ApiError.utils.js";
import mysql from "mysql2/promise";

const checkConnection = async function(data){
  
  if (!data || !data.protocol) {
    throw new ApiError("All fields are required", 400);
  }

  // Handling MongoDB connection
  if (data.protocol === "mongodb") {
    let client;
    try {
      const connectionString =
        data.host === "localhost"
          ? `mongodb://127.0.0.1:${data.port}/`
          : `mongodb+srv://${data.username}:${data.password}@${data.host}/?retryWrites=true&w=majority&appName=MyCluster`;
      const client = new MongoClient(connectionString);
      await client.connect();
      console.log("✅ MongoDB connected successfully to", data.database);
     
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error);
      throw new ApiError("MongoDB connection failed. Check credentials.", 400);
    } finally {
      if (client) {
        await client.close(); // Ensure connection is closed
        console.log("🔌 MongoDB connection closed.");
      }
    }
  }

  // Handling MySQL connection (Placeholder)
  else if (data.protocol === "mysql") {
    try {
      // ✅ Create a connection
      const client = await mysql.createConnection({
        host: data.host,
        user: data.username,
        port: data.port,
        password:data.password,
        // ✅ Directly specify the database here
      });
  
      console.log("✅ MySQL connected successfully");
  
      // ✅ No need to explicitly run `USE database`
      // MySQL connection automatically selects the database if provided
  
      // ✅ Close the connection
      await client.end();
      console.log("✅ Connection closed ");
  
    } catch (error) {
      console.error("❌ MySQL connection failed:", error.message);
      throw new Error("MySQL connection failed. Check credentials.",400);
    }
  }

  // If protocol is not recognized
  else {
    throw new ApiError("Unsupported database protocol", 400);
  }
}

export default checkConnection;
