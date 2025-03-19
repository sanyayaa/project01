import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true // indexing used for searching
        },
        email : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
        },
        fullName : {
            type : String,
            required : true,
            lowercase : true,
            trim : true,
            index : true 
        },
        avatar : {
            type : String, //cloudinary url
            required : true
        },
        coverImage : {
            type : String,
        },
        watchHistory : [
            {
                type : Schema.Types.ObjectId,
                ref : "Video"
            }
        ],
        password : {
            type : String,
            required : [true, 'Password is required']
        },
        refreshToken : {
            type : String
        }
    }, { timestamps : true }
)
// data k just save hone se phele yeh kaam krdo
// userSchema.pre("save",() => {}) never write like this 
// coz we will use this pointer and this pointe rka mtlab 
// nhi pta hota hai generally and yaha per jo hum kaam kr 
// rahe hai it is very imp ki humko pta vo what n where 
// we r doing so dont use

// this code will run everytime before being saved if user 
// change its name then also it will  be called again n again so i dont want that
userSchema.pre("save",async function (next) {
    if(!this.isModified("password")) 
        return next();

    this.password = await bcrypt.hash(this.password,10)
    next()
})

// check password
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullname : this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullname : this.fullname
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userSchema)