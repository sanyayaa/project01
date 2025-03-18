import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(cookieParser())
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true,limit : "16kb"}))
app.use(express.static("public"))

//routes import
import userRouter from "./routes/user.routes.js";

// routes declaration
// dont use app.get lyuki we willl call through middleware coz our code is not uin a single file
// http://localost:8000/users/register
app.use("/api/v1/users",userRouter)

export {app}