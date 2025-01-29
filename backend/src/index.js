import dotenv from "dotenv";
import fatchMongoDatabase from "./from/mongoconnection.js"
import { app } from "./App.js";

dotenv.config({
  path: "./.env",
});
const uri = 'mongodb+srv://dixitshubham8873:LV1G1dTec1hO3hWy@mycluster.98leq.mongodb.net/?retryWrites=true&w=majority&appName=MyCluster';
  const database = "sample_mflix";
fatchMongoDatabase(uri,database);
  
