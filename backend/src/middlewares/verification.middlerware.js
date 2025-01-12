import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.utils.js";
const verification = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new ApiError("Token is not valid", 401);
    }
    const decoded = jwt.verify(refreshToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id);
    req.user = user;
    next();
  } catch (error) {
next( new ApiError("Token is expired", 403))
  }

};
export { verification };
