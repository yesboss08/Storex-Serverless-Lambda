import directoryModel from "../Models/directoryModel.js"
import userModels from "../Models/userModel.js"
import { Config } from "../utils/Config/Config.js"

export const StorageCheeck = async(req,res,next)=>{
    const {userId}= req.userData 
    const DbUserData = await userModels.findById(userId).populate('rootDirID')
const unusedStorage = DbUserData.rootDirID.size + Number(req.body?.fileSize)
const allocatedStorage = DbUserData.maxStorageInBytes
console.log({unusedStorage,allocatedStorage})
if(unusedStorage<=allocatedStorage){
 return next() 
}
return res.status(405).json({err:"not have enough speace"})
}


export const UsingSubcriptionStorage =()=>{
    const freeStorage = Config.Default_Max_Storage_In_Bytes
}