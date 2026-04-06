import directoryModel from "../Models/directoryModel.js"

export const setPath = async({parentId})=>{
    
 const parentData = await directoryModel.findById(parentId).lean()
if(!parentData.parent){
    return [parentId]
}
const PathArray = [...parentData.path]
PathArray.push(parentId)
return PathArray
}