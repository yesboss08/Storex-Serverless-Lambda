import directoryModel from "../Models/directoryModel.js";
import fileModel from "../Models/fileModel.js";
import { Config } from "./Config/Config.js";

//folder size change
export const updateFolderSize = async (parentDir, folderSize, fileDocId) => {
  try {
    const directoryData = await directoryModel.findById(parentDir);
    await directoryData.updateOne({ $inc: { size: folderSize } });
    if (directoryData.parent) {
      await updateFolderSize(directoryData.parent, folderSize);
    }
    //*fileDOcId is present while i am uploading a file just to reduse the db request
    if (!directoryData?.parent && fileDocId) {
      //cheeck the user is exciding the free storage plan
      const isPaid = directoryData?.size + folderSize > 20971520;
      //const isPaid = directoryData?.size +contentLength > Config.Default_Max_Storage_In_Bytes
      await fileModel.updateOne({ _id: fileDocId }, { $set: { isPaid } });
    }
    return;
  } catch (error) {
    console.log("error hwile updating the folderSize");
  }
};
