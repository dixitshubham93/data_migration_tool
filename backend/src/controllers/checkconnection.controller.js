import checkConnection from "../utils/checkConnection.utils.js";
import asyncHandler from "../utils/asyncHandler.utils.js";
import ApiResponse from "../utils/ApiResponse.utils.js";

const check = asyncHandler(async(req,res,next)=>{
    
    const {data} = req.body;
     await checkConnection(data).then(() => {
      console.log("database is connected successfully");
      return res.status(200).json(
        new ApiResponse("successful", 200, {
          message: "database is connected successfully",
        })
      );
    });
  
});
export {check};