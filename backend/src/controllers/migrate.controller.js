import asyncHandler from "../utils/asyncHandler.utils.js";
import ApiError from "../utils/ApiError.utils.js";
import checkConnection from "../utils/checkConnection.utils.js";
import ApiResponse from "../utils/ApiResponse.utils.js";
const migrate = asyncHandler(async(req, res,next)=>{
  const { source, filter, target } = req.body;
  try {
    if (!source || !filter || !target) {
      console.log("all fields must be presents");
    }

 await checkConnection(source).then(() => {
      console.log("database is connected successfully");
      return res.status(200).json(
        new ApiResponse("successful", 200, {
          message: "database is connected successfully",
        })
      );
    });
  } catch (error) {
    next(error);
  }
  
});
export { migrate };
