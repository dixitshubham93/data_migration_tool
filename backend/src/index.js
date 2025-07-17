
import dotenv from "dotenv";
import { app } from "./App.js";



  const port = process.env.PORT;
  
  
app.get("/", (req, res) => {
  res.send("<h1>listening started</h1>");
});
  app.listen(port ,()=>{
    console.log(`server is started listening on ${port}`)
  });
