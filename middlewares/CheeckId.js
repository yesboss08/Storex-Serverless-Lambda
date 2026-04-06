import { ObjectId } from "mongodb"
import fileModel from "../Models/fileModel.js";
import directoryModel from "../Models/directoryModel.js";

const checkId=async(req,res,next,id)=>{
const isValid = ObjectId.isValid(String(id))
if(isValid){
        next()
}else{
    next(new Error("invalid id sends from client"))
}
}
export default checkId



