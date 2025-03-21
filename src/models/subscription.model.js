import mongoose,{ Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        // user
        subscriber :  {
            type : Schema.Types.ObjectId,// one who is subscribing
            ref : "User"
        },
        // user
        channel : {
            type : Schema.Types.ObjectId,// one to whom 'sunscriber' is subscribing
            ref : "User"
        },
        // createdAt : {

        // },
    
        // updatedAt : {
            
        // }
    }, { timestamps : true }
)
export const Subscription = mongoose.model("Subscription",subscriptionSchema);