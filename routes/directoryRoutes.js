import express from "express"
import cheeckId from "../middlewares/CheeckId.js"
import {CreateDir,GetDirData,RenameDir,DeleteDir, DirData} from "../controllers/directoryController.js"
import {CheeckDirAuth} from "../middlewares/DocsAccessAuth.js"
import userModels from "../Models/userModel.js"
import { isAllowedTOAccess } from "../utils/permission/permission.js"
import directoryModel from "../Models/directoryModel.js"
import { AdminCheeck } from "../middlewares/AdminCheeck.js"
import fileModel from "../Models/fileModel.js"

const router = express.Router()

router.param('directoryId' , cheeckId)
router.post("/",CreateDir )

//change the directory permission
router.put("/changePermission", async (req,res, next)=>{
    const {userData} = req
    const {docId, fileType , sharedUsersId} = req.body


// req.body = {
//     members:["users id"],
//     general_access_type: "private" | "public",
//     documentId:"objectid",
//     userId:"objectId"
// }
    

})


//fix this aggregate pipe line for better speed
router.route("/yo/:directoryId?").get(DirData)
router.route("/:directoryId?").get(GetDirData).patch(RenameDir).delete(DeleteDir)


router.param("userId" , cheeckId)
//owner and admin access the other users file
router.get('/getAccess/:userId/:directoryId?/read',AdminCheeck, async(req,res,next)=>{
const {userId, directoryId} = req.params

try {
    const {userData} = req
if(userData?.role=="manager") return res.status(403).json({err:"u are not allowed"})
const userInfo = await userModels.findOne({_id:userId , role:{$ne:"owner"}, isDeleted:false})
const dirId = directoryId ? directoryId : userInfo.rootDirID
if(!userInfo) return next(new Error)
const isAllowed = isAllowedTOAccess(userData?.role , 'canRead' , userInfo.role)
 if(isAllowed.val){
     //TODO:implement aggregation pipeline
     const dirData = await directoryModel.findOne({_id:dirId, userId:userInfo?._id})
    const userAllDir = await directoryModel.find({parent:dirData?._id}).select("name")
    const userAllFiles = await fileModel.find({parent:dirData?._id}).select("name extension")
    return res.status(200).json({name:dirData?.name, id:dirData?._id ,directories:userAllDir , files:userAllFiles})
 }
} catch (error) {
    console.log("error while reading the users file")
    next(new Error)
}
})


router.delete('/getAccess/:userId/:directoryId/delete', async(req,res,next)=>{
    const {userId, directoryId} = req.params
    try {
        const {userData} = req
    if(userData?.role=="manager") return res.status(403).json({err:"u are not allowed"})
    const userInfo = await userModels.findOne({_id:userId , role:{$ne:"owner"}, isDeleted:false})
    if(!userInfo) return next(new Error)
if(directoryId== userInfo.rootDirID) return res.status(404).json({err:"you can not delete the root folder"})
    const isAllowed = isAllowedTOAccess(userData?.role , 'canDelete' , userInfo.role)
     if(isAllowed.val){
        const dirData = await directoryModel.findById(directoryId).lean().select('userId')
     if(String(dirData?.userId) !== String(userInfo?._id)) return res.status(409)
    await DeleteDirectory(directoryId)
    return  res.status(200).json({msg:"folder deleted successfully"})
     }
     return res.status(409).json({err:isAllowed.msg})
    } catch (error) {
        console.log("error while reading the users file")
        next(new Error)
    }
    })

router.post('/getAccess/:userId/write', async(req,res,next)=>{
    const {userId} = req.params
    const {ParentDirId,dirName} = req.body
    const isValid = ObjectId.isValid(String(ParentDirId))
    if(!isValid) return next(new Error)
    try {
    const {userData} = req
    if(userData?.role=="manager") return res.status(403).json({err:"u are not allowed"})
    const userInfo = await userModels.findOne({_id:userId , role:{$ne:"owner"}, isDeleted:false})
    if(!userInfo) return next(new Error)
    const isAllowed = isAllowedTOAccess(userData?.role , 'canWrite' , userInfo.role)
     if(isAllowed.val){
    await directoryModel.create({parent:ParentDirId,name:dirName})
    return  res.status(200).json({msg:"folder created successfully"})
     }
     return res.status(409).json({err:isAllowed.msg})
    } catch (error) {
        console.log("error while reading the users file")
        next(new Error)
    }
    })

router.put('/getAccess/:userId/edit', async(req,res,next)=>{
    const {userId} = req.params
    const {ParentDirId,newName,dirId} = req.body
    const {userData} = req
    try {
    if(userData?.role=="manager") return res.status(403).json({err:"u are not allowed"})
    const userInfo = await userModels.findOne({_id:userId , role:{$ne:"owner"}, isDeleted:false})
    if(!userInfo) return next(new Error)
if(dirId== userInfo.rootDirID) return res.status(404).json({err:"you can not delete the root folder"})
    const isAllowed = isAllowedTOAccess(userData?.role , 'canEdit' , userInfo.role)
     if(isAllowed.val){
    await directoryModel.findOneAndUpdate({_id:dirId,parent:ParentDirId, userId:userInfo?._id},{name:newName})
    return  res.status(200).json({msg:"folder name changed successfully"})
     }
     return res.status(409).json({err:isAllowed.msg})
    } catch (error) {
        console.log("error while reading the users file")
        next(new Error)
    }
    })




export default router









