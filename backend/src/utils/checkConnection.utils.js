import { MongoClient } from "mongodb";
import asyncHandler from "./asyncHandler.utils.js";
import ApiError from "./ApiError.utils.js";


const checkConnection = async function (data) {
  if (!data) {
    throw new ApiError("all field are must required", 400);
  }
//   handling mongodb connection
  if (data.protocol == "mongodb") {
    try {
      const connectionString = `mongodb://${data.database}:${data.password}@${data.host}:${data.port}/${data.database}?authSource=admin`;
      const client = new MongoClient(connectionString);
      await client.connect();
      const db = client.db(database);
      if (!db) {
        throw new ApiError(
          "database is not found check for any spelling mistake in database name",
          404
        );
      }
      console.log("database connected succesfully");
      return true;
    } catch (error) {
      console.log("connection is failed", error);
      throw new ApiError(
        "database is not connected may be credential are wrong",
        500
      );
      return false;
    }
    // handling mysql connection
  } else if (data.protocol == "mysql") {

  }

};

export default checkConnection;
