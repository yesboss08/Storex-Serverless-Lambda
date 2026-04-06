import { Schema } from "mongoose";
import mongoose from "mongoose";

const OtpSessionSchema = new Schema({
    otp:{
        type:String, required:true
    },
    userEmail:{
        type:String, required:true 
    },
    createdAt:{
        type:Date, default:Date.now , expires:60*5
    }
})

const OtpSessionModel = mongoose.model('optSession', OtpSessionSchema)

export default OtpSessionModel