import asyncHandler from "../utils/asyncHandler.utils.js";
import ApiError from '../utils/ApiError.utils.js'
import checkConnection from "../utils/checkConnection.utils.js";
import ApiResponse from "../utils/ApiResponse.utils.js"
const migrate = async function(req,res) {
    const {source,filter,target} = req.body;
   if(!source||!filter||!target){console.log("all fields must be presents")}

   if(checkConnection(source)){
    console.log("database is connected successfully")
   return res.status(200).json(
        new ApiResponse("successful", 200, {
          message: "New genrated succesfully",
        }))
}
    
}

export { migrate};