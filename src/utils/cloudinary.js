import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

// link / unlink -> delete
    // Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUDNAME , 
    api_key: process.env.CLOUDINARY_API_KEY , 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});
    
// Upload an image
const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath)
            return null

        // upload file on cloudinary
        const response = await cloudinary.uploader
        .upload(localFilePath,{
            resource_type : "auto"
        })
        // file has been uploaded successfully
        // console.log("file is uploaded on cloudinary",response.url);
        console.log("file is uploaded on cloudinary");
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch(error) {
        // rmeove the locally saved temporary file as the upload operation got failed
        fs.unlinkSync(localFilePath);
        console.log(error);
        return null;
    }
}

export {uploadOnCloudinary};