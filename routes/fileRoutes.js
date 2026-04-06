import express from "express";
import cheeckId from "../middlewares/CheeckId.js";
import {
  CreateFile,
  DeleteFile,
  GetFile,
  RenameFile,
} from "../controllers/fileController.js";
import { AdminCheeck } from "../middlewares/AdminCheeck.js";
import { isAllowedTOAccess } from "../utils/permission/permission.js";
import fileModel from "../Models/fileModel.js";
import userModels from "../Models/userModel.js";
import directoryModel from "../Models/directoryModel.js";
import { StorageCheeck } from "../middlewares/FileUploadAllowed.js";
import { setPath } from "../utils/setFilePath.js";
import path from "path";
import mime from "mime";
import { Config } from "../utils/Config/Config.js";
import {
  CheeckValidFile,
  CreatePutSignedUrl,
  DeleteS3Object,
} from "../utils/Aws/Storage_S3_Client.js";
import { updateFolderSize } from "../utils/StorageManage.js";

const router = express.Router();

//send a post singed url
router.post("/uploads/initiate", async (req, res, next) => {
  const { userData } = req;
  const userDbData = await userModels
    .findById(userData?.userId)
    .populate("rootDirID");
  //TODO:cheeck is allowed for the admin access
  const { fileSize, pid, fileName } = req.body;
  const parentId = pid ? pid : userData.rootDirID;
  const usedStorage = userDbData.rootDirID.size + Number(fileSize);
  const allocatedStorage = userDbData.maxStorageInBytes;
  if (usedStorage >= allocatedStorage) {
    return res.status(405).json({ err: "not have enough speace" });
  }

  //check the pareent is valid or not
  const parentDirData = await directoryModel.findOne({
    _id: parentId,
    userId: userData?.userId,
  });
  if (!parentDirData?.id)
    return res.status(404).json({ err: "invalid parent dir" });
  const filePath = await setPath({ parentId });
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  const fileType = mime.getType(extension);
  //create the file and set isUploading ture
  const fileData = await fileModel.create({
    name: baseName,
    size: fileSize,
    isUploading: true,
    extension: extension,
    isPaid: usedStorage > Config.Default_Max_Storage_In_Bytes ? true : false,
    parent: parentId,
    path: filePath,
  });
  //create the post singed url
  const postUrl = await CreatePutSignedUrl({
    extension,
    fileId: fileData?._id,
    fileSize,
    fileType,
  });
  res.status(201).json({ postUrl,id:fileData?._id });
});

//validate the payment
router.put("/uploads/complete", async (req, res, next) => {
  const { userData } = req;
  const { fileId } = req.body;
  try {
    const fileDbData = await fileModel.findById(fileId);
    const parentDirData = await directoryModel.findOne({
      _id: fileDbData?.parent,
      userId: userData?.userId,
    });
    if (!parentDirData?._id || !fileDbData?.isUploading)
      return res.status(401).json({ err: "invalid user" });
    const validFile = await CheeckValidFile({
      fileId: fileDbData?._id,
      fileSize: fileDbData?.size,
      extension: fileDbData?.extension,
    });
    if (validFile) {
      await fileDbData.updateOne({ isUploading: false });
      await updateFolderSize(fileDbData?.parent, fileDbData?.size);
      res.status(201).json({ msg: "file uploaded" });
    } else {
      await fileDbData.deleteOne();
      await DeleteS3Object({
        Key: `${fileDbData?._id}${fileDbData?.extension}`,
      });
      res.status(403).json({ err: "userd uploades different file" });
    }
  } catch (error) {
    console.log("error while complete the upload routes", error);
    next(new Error("invalid"));
  }
});

router.param("fileId", cheeckId);
router.post("/:parentid?", StorageCheeck, CreateFile);
router.route("/:fileId").get(GetFile).patch(RenameFile).delete(DeleteFile);
//admin and owner file routes for acessing the users
router.param("userId", cheeckId);
router.param("parentid", cheeckId);
router.get("/:userId?/:fileId", AdminCheeck, GetFile);
router.post("/:userId?/:parentid?", AdminCheeck, CreateFile);
router.delete("/:userId?/:fileId", AdminCheeck, DeleteFile);
router.patch("/:userId?/:fileId", AdminCheeck, RenameFile);

//find the user is ellegible to acesse the file or not
const fileAccess = async (userId, action, currentUserRole) => {
  const targetedUserData = await userModels.findById(userId);
  if (targetedUserData) {
    const isAllowed = isAllowedTOAccess(
      currentUserRole,
      action,
      targetedUserData.role
    );
    return isAllowed;
  }
};

export default router;
