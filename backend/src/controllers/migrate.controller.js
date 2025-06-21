import asyncHandler from "../utils/asyncHandler.utils.js";
import ApiError from "../utils/ApiError.utils.js";
import checkConnection from "../utils/checkConnection.utils.js";
import ApiResponse from "../utils/ApiResponse.utils.js";
import transform from "../from/githubrepo.js";

const migrate = asyncHandler(async(req, res,next)=>{
  console.log("request aa gai");
  const {data} = req.body;

  try {
    if (!data) {
      console.log("all fields must be presents");
    }
  await transform(data).then(() => {
      console.log("data migrated");
      return res.status(200).json(
        new ApiResponse("successful", 200, {
          message: "data migrated",
        })
      );
    });
  } catch (error) {
    next(error);
  }
  
//  await checkConnection(source).then(() => {
//       console.log("database is connected successfully");
//       return res.status(200).json(
//         new ApiResponse("successful", 200, {
//           message: "database is connected successfully",
//         })
//       );
//     });
//   } catch (error) {
//     next(error);
//   }
  
});
export { migrate };
