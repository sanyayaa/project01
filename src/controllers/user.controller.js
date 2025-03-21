import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/users.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // we have to store refresh token in the database
        user.refreshToken = refreshToken;
        // whenever we save validation is called and checks password but here we r not giving any password and also we dont want to validate so we use validateBeforeSave : false sp that validation is not done
        await user.save({validateBeforeSave : false});
        return {accessToken,refreshToken}
    }

    catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access tokens")
    }
}

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

const loginUser = asyncHandler(async(req,res) => {
    // tods
    // req bosy -> data from frontend
    // login using username or email

    // find user
    // check password 
    // access and refresh token generation 
    // send token through cookie 
    // if user doesnot already exists then ask him to register first

    const {email,username,password} = req.body;
    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }
    // OR
    // if(!(username || email)){
    //     throw new ApiError(400,"username or email is required")
    // }

    const user = await User.findOne({
        $or : [{email},{username}]
    });

    if(!user){
        throw new ApiError(404,"User does not exist. Kindly Register first")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credientals. Password Incorrect")
    }

    // now make tokens
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

    // when i check for user in db i got its data from db but that data had refrestoken as empty but we hv generate it so we will have to again take user data from db if this retrieveing data from db is not expensive if it is expensive then we update an object
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        // we can see cookie and cookies bydefault can be modified by anyone but when we use httpOnly : true then it will not allow anyone to modify cookie only server can modify cookie
        httpOnly : true,
        secure : true
    }

    // send these token to cookies
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res) => {
    // clear cookie
    // reset refreshToken

    // how will i know ki kisko logout karwana hai 
    // so i have to get user data so we will do by verifying the user using JWT 
    await User.findByIdAndUpdate(
        // find user in db
        req.user._id,
        // reset refreshToken
        {
            $set : {
                refreshToken : undefined
            }
        },
        // return the new updated value
        {
            new : true
        }
    )

    // remove cookies
    const options = {
        // we can see cookie and cookies bydefault can be modified by anyone but when we use httpOnly : true then it will not allow anyone to modify cookie only server can modify cookie
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))

})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshAccessToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = await User.findById(decodedToken?._id)
        
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
        // if user exists then we hv to check the token in db and this incoming token
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
        // if user exists and refreshtoken & incomingtoken is matched then generate new token
        const options = {
            httpOnly : true,
            secure : true
        }
        const {accessToken,newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken : newrefreshToken
                },
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)  => {
    const {oldPassword,newPassword,confPassword} = req.body;
    if(newPassword !== confPassword){
        throw new ApiError(400,"Password doesnot match.")
    }
    // if user can change its passwor dthat means it is definately loggeg in so in my auth.middleware i have my user in my body and i can can use this user 
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave : false});
    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"));
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(200,req.user,"Current User fetched successfully");
})

// if we want to update files make a seperate controller for that dont do it heree
const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName,email} = req.body;
    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName : fullName,
                email : email
            }
        },
        // return the updated response
        {new : true}
    ).select("-password")

    return res
    .staus(200)
    .json(new ApiResponse(200,user,"Accounts Details Updated Successfully"))
});

const updateUserAvatar = asyncHandler(async(req,res) => {
    //got files through req.file from multer
    const avatarlocalPath = req.file?.path;
    if(!avatarlocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarlocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading Avatar Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        // return the updated response
        {new : true}
    ).select("-password")

    return res
    .staus(200)
    .json(new ApiResponse(200,user,"Avatar Image Updated Successfully"))
}) 

const updateUserCoverImage = asyncHandler(async(req,res) => {
    //got files through req.file from multer
    const avatarlocalPath = req.file?.path;
    if(!coverImagelocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImagelocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading Cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        // return the updated response
        {new : true}
    ).select("-password")

    return res
    .staus(200)
    .json(new ApiResponse(200,user,"Cover Image Updated Successfully"))
}) 

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage
}