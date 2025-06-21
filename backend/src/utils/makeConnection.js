import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import ApiError from "./ApiError.utils.js";

const connectMongo = async (config) => {
  try {
    const uri =
      config.host === "localhost"
        ? "mongodb://127.0.0.1:27017/"
        : `mongodb+srv://${config.username}:${config.password}@${config.host}/?retryWrites=true&w=majority&appName=MyCluster`;

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(config.database);

    console.log(`✅ MongoDB connected: ${config.database}`);
    return { client, db };
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    throw new ApiError("MongoDB connection failed. Check credentials.", 400);
  }
};

const connectMySQL = async (config) => {
  try {
    const conn = await mysql.createConnection({
      host: config.host,
      user: config.username,
      port: config.port,
      password: config.password,
    });

    console.log(`✅ MySQL connected:`);
    return conn;
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    throw new ApiError("MySQL connection failed. Check credentials.", 400);
  }
};

const makeConnection = async function (data) {
    console.log(data.source,data.target);
  if (!data?.source || !data?.target) {
    throw new ApiError("Both source and target config are required", 400);
  }

  const result = {};

  // Connect to source
  if (data.source.protocol === "mongodb") {
    result.source = await connectMongo(data.source);
  } else if (data.source.protocol === "mysql") {
    result.source = await connectMySQL(data.source);
  } else {
    throw new ApiError("Unsupported source protocol", 400);
  }

  // Connect to target
  if (data.target.protocol === "mongodb") {
    result.target = await connectMongo(data.target);
  } else if (data.target.protocol === "mysql") {
    result.target = await connectMySQL(data.target);
  } else {
    throw new ApiError("Unsupported target protocol", 400);
  }

  return result;
};

export default makeConnection;
