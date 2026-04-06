import mongoose, { Schema } from "mongoose";

const deviseSchema = new Schema({
devise_type:{type:String , default:""}, os_name:{type:String , default:""},os_version:{type:String , default:""},browser_name:{type:String , default:""},browser_version:{type:String , default:""}
})

const sessionSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId , required:true
    },
    createdAt:{
        type:Date, expires:60*60*24 , default:Date.now
    },
    devises:{
        type:deviseSchema, default:{}
    },
}, { methods:{
addNewDevise(devise){
    if(this.devises.os_name) return 
    this.devises =devise
}
}})



const SessionModel = mongoose.model('session', sessionSchema)

export default SessionModel