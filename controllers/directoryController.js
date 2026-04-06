import  { rm} from "node:fs/promises"
import directoryModel from "../Models/directoryModel.js"
import FileModel from "../Models/fileModel.js"
import { updateFolderSize } from "../utils/StorageManage.js"
import { setPath } from "../utils/setFilePath.js"
import mongoose from "mongoose"
import fileModel from "../Models/fileModel.js"
import userModels from "../Models/userModel.js"

//import fileModel from "../Models/fileModel.js"
//create dir
export const CreateDir = async (req, res)=>{
  const userData = req.userData
const parentId = req.headers?.parentid || userData.rootDirID

const name = req.body.newName || "New Folder"

const isParent = await directoryModel.find({_id:parentId , userId:userData.userId})
if(!isParent.length) return res.status(401).json({err:"user is unauthorized for creating here"})

try {
const path =  await setPath({parentId})
console.log(path)
await directoryModel.insertOne({name:name , parent:parentId, userId:userData.userId,path})
return res.status(201).json({message:"Directory created succesfully"})
} catch (error) {
  console.log("error while creting the directory", error)
  if (err.code === 121) {
    res
      .status(400)
      .json({ error: "Invalid input, please enter valid details" });
  } else {
    next(err);
  }
}
}

//serving dir data
export const GetDirData = async (req,res,next)=>{
  const userData = req.userData
  console.log("hello")
const dirId = req.params.directoryId || userData.rootDirID
const dirData = await directoryModel.findOne({_id:dirId , userId:userData.userId}).populate({path:'path', select:'name'}).lean()
if(!dirData) return res.status(401).json({msg:"no drirectory exist"})
  const userDB = await userModels.findById(userData?.userId)
try {
  let ResDirData =[]
  const childDirData = await directoryModel.find({parent:dirId, userId:userData.userId}, "-path").lean()
  for (const dir of childDirData) {
    const totalChildFolder = (await directoryModel.find({parent:dir._id})).length
    const totalChildFiles = (await fileModel.find({parent:dir._id})).length
    ResDirData.push({...dir, totalChildFiles,totalChildFolder})
  }
  let FileData 
  if(userDB?.purchasedPlan?.PlanStatus=="active") {
  FileData = await FileModel.find({parent:dirId,isUploading:false},"name extension size isPaid").lean()
}else{
  FileData = await FileModel.find({parent:dirId,isPaid:false,isUploading:false},"name extension size isPaid").lean()
}
  return res.status(200).json({name:dirData.name, id:dirId ,directories:ResDirData, files:FileData,size:dirData.size,path:dirData.path})
} catch (error) {
  console.log("error while getting the directory data", error)
  res.status(404).json({error:"not found"})
}
}

//rename dir
export const RenameDir = async (req,res,next)=>{
  debugger
  if(!req.params.directoryId) return res.status(404).json({error:"Invalid directory"})
   const userData = req.userData
   const dirId =   req.params.directoryId
   const newName = req.body.newName
   try {
      await directoryModel.updateOne({_id:dirId, userId:userData.userId} , {name:newName}).lean()
      res.json({message:"file renamed succesfully"})
   } catch (error) {
      res.status(500).json({message:"error while renaming the directory"})
   }
    }


//delete directory
export const DeleteDir =  async(req,res)=>{
    const {directoryId} = req.params
    if(!directoryId) return res.status(404).json({error:"what are u doing man send the dir id"})
    if (directoryId == String(req.userData.rootDirID)) {
     res.status(404).json({message:"Cannot delete the root directory!"});
    }
try {
  const dirData = await DeleteDirectory(directoryId )
   updateFolderSize(dirData.parent, -dirData.size)
   console.log("done")
   return res.status(200).json({message:"Deleted succesfully"});
} catch (error) {
 res.status(404).json( {message:`error while delting ${directoryId}`})
}
 }

//delete dir function
 export const DeleteDirectory =async (Id)=>{
const id = Id
const childDir = await directoryModel.find({parent:Id}, "_id")
if(childDir.length>0){
  for(const item of childDir){
    await DeleteDirectory(item._id  )
  }
}

const files = await FileModel.find({parent:Id},"_id extension")
const fileIds = []
const fileKeys = []
 files.forEach((item)=>{
  fileIds(item._id)
  fileKeys.push(`${item._id}${item?.extension}`)
 })
 console.log(fileIds, fileKeys)

if(files.length){
  try {
 const deleteS3Res= await DeleteMutipleS3Object({keys:fileKeys})
//TODO: handle the error in better way 
    await DeleteMutipleS3Object()
    await FileModel.deleteMany({_id:{$in: fileIds}})
  } catch (error) {
    console.log("error while deleting the files from storage", error)
  }
}

try {
const dirData = await directoryModel.findByIdAndDelete(Id)
return dirData
} catch (error) {
console.log("error while delete the directory data",error, id)
}
    }



//aggregation
export const DirData = async (req,res,next)=>{
  const userData = req.userData
const dirId = req.params?.directoryId || userData.rootDirID
const data = await directoryModel.aggregate([
  {$match:{_id:new mongoose.Types.ObjectId(dirId), userId:new mongoose.Types.ObjectId(userData?.userId)}},
  {$unwind:{path:"$path",preserveNullAndEmptyArrays:true}},
  {$lookup:{
    from:"directoryDB",
    localField:"path",
    foreignField:"_id",
    as:"path",
    pipeline:[
      {$project:{name:1, _id:1}}
    ]
  }},
  
{$unwind:{path:"$path",preserveNullAndEmptyArrays:true}},

{
  $group: {
    _id: "$_id",
   name:{ $first: "$name" },
   size:{$first:"$size"},
userId:{$first:"$userId"},
path:{
  $push:"$path"
}
  }
},

{
  $lookup:{
  from:"directoryDB",
  localField:"_id",
  foreignField:"parent",
  as:"directories",
    pipeline:[
    {$project:{ path:0}}
  ], 
}},

{$unwind:{path:"$directories",preserveNullAndEmptyArrays:true}},

    {$lookup:{
from:"directoryDB", foreignField:"parent",localField:"directories._id",as:"directories.totalFolders",
  }},

    {$lookup:{
from:"fileDB", foreignField:"parent",localField:"directories._id",as:"directories.totalFiles",
  }},

    {
    $addFields:{
      "directories.childFolders":{$size:{$ifNull:["$directories.totalFolders", []]}},
      "directories.childFiles":{$size:{$ifNull:["$directories.totalFiles", []]}}
    }
  },
  {
    $project:{
      "directories.totalFolders":0,"directories.totalFiles":0
    }
  },

  {
    $group:{
      _id:"$_id",name:{ $first: "$name" },
   size:{$first:"$size"},
userId:{$first:"$userId"},directories:{$push:"$directories"}, path:{$first:"$path"}
    }
  },


{
  $lookup:{
  from:"fileDB",
  localField:"_id",
  foreignField:"parent",
  as:"files",
  pipeline:[
    {$project:{ path:0}}
  ]
  }
},

])
 res.status(200).json(data)
}

// pipeline:[
//   {$project:{_id:1,path:0}}
// ]