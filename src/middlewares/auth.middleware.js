import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/users.model.js"

// i have user middleware app.use(cookieParser) so request have access to the cookies

// here there was no use of res (req,next) was used but not response so put _ instead of res
export const verifyJWT = asyncHandler(async(req,_,next) => {
    try {
        // if user is from mobile then it will send cookies as header so we have to write req.cookies?
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if(!token){
            throw new ApiError(401,"Unauthorized Request")
        }

        // if token there verify through JWT
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user){
            // if my Token is Invalid then i have to refresh my refreshToken which is stored in my db so for that i have to give an endpoint to my frontend so taht he can click on it and regenretae a new refreshToken  
            throw new ApiError(401,"Invalid Access Token")
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Access Token");
    }
})