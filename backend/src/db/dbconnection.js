import mongoose from "mongoose";
import dotenv from "dotenv"; // Import dotenv

// Load environment variables from .env file
dotenv.config();

const dbconnect = async () => {
  try {
    const dataconnection = await mongoose.connect(
      `${process.env.CONNECTION_STRING}`
    );
    console.log(
      `Connected to MongoDB!! DB HOST: ${dataconnection.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default dbconnect;
