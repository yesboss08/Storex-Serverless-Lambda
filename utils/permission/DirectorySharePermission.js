import directoryModel from "../../Models/directoryModel"
import userDocumentShareCollection from "../../Models/documentShareModel"
import fileModel from "../../Models/fileModel"

const handleDirectoryPermission = async ({ docId, userId, general_access_type, membersDetails }) => {
   try {
      const fileData = await fileModel.findById(docId)
      //if the file belongs to this user so we consider him as owner 
      let isAllowed = userId == fileData?.userId
      if (userId != fileData.userId && !isAllowed) {
         isAllowed = isAllowedTORoleChange({ userId, fileId: docId })
      }
      if (!isAllowed) return { msg: "now allowed to change the role", res: false }

      fileData?.general_access_type = general_access_type

      //update in all users shared documnet filed add this using bulkwrite if the members details exist
      if (membersDetails?.length) {
         await userDocumentShareCollection?.bulkWrite(
            membersDetails?.map((memberData) => (
               { updateOne: { filter: { userId: memberData?.id }, update: { $set: { sharedFiles: { document_id: docId, member_role: memberData?.role } } }, upsert: true } }
            ))
         )
      }
      await fileData.save()
      return { msg: "update the new userRole successfully", res: true }
   } catch (error) {
      console.log("error while handlefile permission", error)
      return { msg: "now allowed to change the role", res: false }
   }
}