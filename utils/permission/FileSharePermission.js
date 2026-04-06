
import directoryModel from "../../Models/directoryModel"
import userDocumentShareCollection from "../../Models/documentShareModel"
import fileModel from "../../Models/fileModel"


//conditons to handle inside the functions 
// 1. private with limited people access
// 2. public with link access 
// 3. public with viwer access
// 4. public with editor access
// 5. private with specific users role either viwer or editor
// 6. transfer ownership
// 7. remove access of a user
//8. only editor can change the general access type and remove the user and change the role


//handle the operation of the files fuctions
const fileOperation ={
add: async ({memberDetail, docId})=>addOrUpadateUserInFile({docId,memberDetail}),
edit: async ({memberDetail, docId})=>addOrUpadateUserInFile({docId,memberDetail}),
remove: async ({memberDetail, docId})=>removeUserFromFileShare({docId,memberDetail}),
}



const handleFilePermission = async ({ docId, userId, general_access_type, memberDetails, operation }) => {
   try {
      const fileData = await fileModel.findById(docId)
      //if the file belongs to this user so we consider him as owner 
      let isAllowed = userId == fileData?.userId
      if (userId != fileData.userId && !isAllowed) {
         isAllowed = isAllowedTORoleChange({ userId, fileId: docId })
      }
      if (!isAllowed || !fileOperation?.[operation]) return { msg: "now allowed to change the role", res: false }
 
      fileData?.general_access_type = general_access_type
      const opsRes = await fileOperation?.[operation]({memberDetails,docId})
      if(!opsRes) return { msg: "invalid role assign", res: false }
//update in the user shared document colllection
      await fileData.save()
      return { msg: "update the new userRole successfully", res: true }
   } catch (error) {
      console.log("error while handlefile permission", error)
      return { msg: "now allowed to change the role", res: false }
   }
}




//this fuciton i create for cheeking the role of the user if the file or directory does not belongs to user then here we check the user has the valid access or not if the user is editor then we allow to do some changes
export const isAllowedTORoleChange = async ({ userId, fileId, documentType }) => {
   const docType = documentType == 'directory' ? 'sharedDirectory' : 'sharedFiles'
   const userSharedDocData = await userDocumentShareCollection.findOne({ userId, [`${docType}.document_id`]: fileId }, {
      [docType]: 1, userId: 1
   })
   if (!userSharedDocData?._id) return false

   //user allowed to make any changes only if he is an editor
   return userSharedDocData?.[docType]?.[0]?.member_role == 'editor' ? true : false
}



//add new user or change the role of existing user
const addOrUpadateUserInFile = async ({memberDetails, docId})=>{
try {
    const response = await userDocumentShareCollection.updateOne({userId:memberDetails?.id, "sharedFiles.document_id":docId}, {$set:{"sharedFiles.$.member_role":memberDetails?.role}})
 if(response?.modifiedCount) return true
 //we have to add tthe 
 const addNewRes = await userDocumentShareCollection.updateOne({userId:memberDetails?.id}, {$addToSet:{sharedFiles:{document_id:docId, member_role:memberDetails?.role}}},{upsert:true})
 if(addNewRes?.modifiedCount) return true
} catch (error) {
   console.log("error while add or update function", error)
}
}

//remove the existing user
const removeUserFromFileShare = async ({memberDetails, docId})=>{
try {
  const res =  await userDocumentShareCollection.updateOne({userId:memberDetails?.id}, {$pull:{sharedFiles:{document_id:docId}}})
  if(res?.modifiedCount) return true
} catch (error) {
   console.log("error while remove user form file share permission",error)
}
}


