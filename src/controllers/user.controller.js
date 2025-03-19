import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/users.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req,res) => {
    // get user details from frontend
    // validation - not empty good to check at frontend and backend
    // check if user already exists : by checking username / email
    // check for files (avtar & coverimages)
    // upload them to cloudinary
    // create user object - create entery in db
    // remove password and refresh token field from response
    // check for user creation 
    // return response

    // take data from frontend through body 
    const {fullName,email,username,password} = req.body;
    // console.log("email : ",email);
    // console.log(req.body);

    // validation
    if(fullName === ""){
        throw new ApiError(400,"FullName is required")
    }
    if([fullName,email,username,password].some((field) => field?.trim() === "")){
        throw new ApiError(400,"All fields are required")
    }

    // check if user already exists : by checking username / email
    const existedUser = await User.findOne({
        $or : [ { email } , { username } ]
    })
    console.log(existedUser);

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    // console.log(req.files);

    // check for files (avtar & coverimages)
    // multer ne file le li hai aus ka path return krdega
    const avatarlocalPath = req.files?.avatar[0]?.path;
    // const coverImagelocalPath = req.files?.coverImage[0]?.path;

    // idk wether i hv my coverImage or not sometimes even if user has not send the coverImage i will get some value as null or undefined i have to handel such cases so i will use this code for that 
    let coverImagelocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImagelocalPath = req.files.coverImagelocalPath;
    }

    if(!avatarlocalPath){
        throw new ApiError(400,"Avatar File is required");
    }

    const avatar = await uploadOnCloudinary(avatarlocalPath);
    const coverImage = await uploadOnCloudinary(coverImagelocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar File is required");
    }

    // make entry in database 
    const user = await User.create({
        fullName,
        // ikfor sure that cover image is there 
        avatar : avatar.url,
        // but its is not sure that coverImage is there or not so for that 
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    // check for user creation & remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        // write what i dont want 
        "-password -refreshToken"
    )

    console.log(createdUser);

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

})

export {registerUser}