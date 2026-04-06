import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import fileModel from "../Models/fileModel.js";
import directoryModel from "../Models/directoryModel.js";
import userModels from "../Models/userModel.js";
import { isAllowedTOAccess } from "../utils/permission/permission.js";
import { updateFolderSize } from "../utils/StorageManage.js";
import { setPath } from "../utils/setFilePath.js";
import { Config } from "../utils/Config/Config.js";
import { GetCloudFrontUrl } from "../utils/Aws/Clould-Front_Client.js";
import { DeleteS3Object } from "../utils/Aws/Storage_S3_Client.js";

//NOTE:here i did for the same controller to serve the file to user as well as admin so is the admin send a request he must send thorugh :userId in the params and then we cheeck the isAllowed then do our action accordingly

export const CreateFile = async (req, res, next) => {
  const fileName = req.headers.filename;
  const { userData } = req;
  const userId = req.params.userId;
  const parentid = req.params.parentid || userData.rootDirID;
  let isAllowed;
  if (userId) isAllowed = await fileAccess(userId, "canWrite", userData?.role);
  const contentLength = req.headers?.["content-length"];
  if (!fileName)
    return res.status(403).json({ error: "send a file with proper name" });
  const extension = path.extname(fileName);
  const name = path.basename(fileName, extension);
  let isSizeExied = false;
  try {
    //cheeck valid user is acessing or not
    const parentDirData = await directoryModel
      .findById(parentid)
      .select("name size parent")
      .lean();
    if (
      String(parentDirData?.userId) !== String(userData?._id) &&
      !isAllowed?.val
    )
      return res
        .status(401)
        .json({ error: "you are not allowed to create a new file" });

    //cheeck the same name exist or not
    const allFiles = await fileModel.findOne({ parent: parentid, name });
    if (allFiles?.name)
      return res
        .status(409)
        .json({ error: "can not upload the same file again" });
    //get the path
    const { path } = await setPath({ parentId: parentid });
    //create new doc
    const fileRes = await fileModel.create({
      name: name,
      extension: extension,
      parent: parentid,
      size: contentLength,
      path,
    });
    if (!fileRes._id) return next();
    const writableStream = createWriteStream(
      `./storage/${String(fileRes._id)}${extension}`
    );
    //cheeck the originl file size
    let orgFileSize = 0;
    //TODO:chnage the max size accoring to plans
    const maxSize = 200 * 1024 * 1024;
    req.on("data", async (chunk) => {
      if (isSizeExied) return;
      orgFileSize += chunk.length;
      if (orgFileSize > maxSize || orgFileSize > contentLength) {
        isSizeExied = true;
        writableStream.close();
        await fileRes.deleteOne();
        await fs.rm(`./storage/${fileRes._id}${fileRes.extension}`, {
          recursive: true,
        });
        return req.destroy();
      }

      //handling back pressure
      const isContinue = writableStream.write(chunk);
      if (!isContinue) {
        req.pause();
        writableStream.on("drain", () => {
          req.resume();
        });
      }
    });

    req.on("end", async () => {
      await updateFolderSize(parentDirData._id, orgFileSize, fileRes?._id);
      writableStream.end();
      res.status(201).json({ msg: "file created successfully" });
    });

    //if file transfer failed
    writableStream.on("error", async (err) => {
      await fileModel.deleteOne({ _id: fileRes._id });
      await fs.rm(`./storage/${fileRes._id}${fileRes.extension}`, {
        recursive: true,
      });
      res.setHeader("Connection", "close");
      next(err);
    });
  } catch (error) {
    console.log("error while uploading the files", error);
    res.status(404).json({ error: "file uploaded  failed!!" });
  }
};

//Serving the file
export const GetFile = async (req, res, next) => {
  const userData = req.userData;
  const { fileId, userId } = req.params;
  let isAllowed;

  if (userId) isAllowed = await fileAccess(userId, "canRead", userData?.role);
  if (!fileId) return res.status(404).json({ message: "file not found" });

  try {
    const fileData = await fileModel
      .findById(fileId)
      .populate({ path: "parent", select: "userId -_id" });

    if (
      String(userData.userId) !== String(fileData.parent.userId) &&
      !isAllowed?.val
    )
      return res
        .status(401)
        .json({ error: "you are not allowed to open this file" });

    //only the user who has the file can only download admin and owner can only view the files
    if (
      req.query.action === "download" &&
      String(userData.userId) !== String(fileData.parent.userId)
    ) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileData.name}${fileData.extension}"`
      );
    }
    const signedUrl = await GetCloudFrontUrl({
      key: `${fileId}${fileData.extension}`,
    });
    res.status(200).json({ url: signedUrl });
  } catch (error) {
    console.log("error in the get file route", error);
    next(error);
  }
};

//rename file
export const RenameFile = async (req, res, next) => {
  const userData = req.userData;
  const { fileId, userId } = req.params;
  const newName = req.body.newName;
  const parentDirClient = req.headers?.parentid || userData.rootDirID;
  const extension = path.extname(newName);
  const name = path.basename(newName, extension);
  if (!newName) return res.json({ message: "name is missing" });
  let isAllowed;
  if (userId) isAllowed = await fileAccess(userId, "canChange", userData?.role);
  try {
    //TODO:implement aggrigation pipe line
    const fileData = await fileModel
      .findOne({ _id: fileId, parent: parentDirClient })
      .populate({
        path: "parent",
      });
    if (
      String(fileData.parent.userId) !== String(userData.userId) &&
      !isAllowed?.val
    ) {
      return res
        .status(401)
        .json({ error: "you are not allowed to rename this folder" });
    }
    try {
      const dbres = await fileModel.findByIdAndUpdate(
        fileId,
        { $set: { name: name } },
        { new: true }
      );
      if (!dbres._id)
        res.status(409).json({ message: "name must not be same" });
      res.json({ message: "Renamed succesfully" });
    } catch (error) {
      console.log("error while renaming the file", error);
      next(new Error("failed to rename"));
    }
  } catch (error) {
    console.log(error);
    next(new Error("failed to run this handler function"));
  }
};

//file delete
export const DeleteFile = async (req, res, next) => {
  const { fileId, userId } = req.params;
  const userData = req.userData;
  const parentDirId = req.headers.parentid || userData.rootDirID;
  let isAllowed;

  if (userId) isAllowed = await fileAccess(userId, "canDelete", userData?.role);

  try {
    const dirData = await directoryModel.findOne({
      _id: parentDirId,
      userId: userId ? userId : userData.userId,
    });
    if (
      String(dirData?.userId) !== String(userData?.userId) &&
      !isAllowed?.val
    ) {
      return res
        .status(401)
        .json({ error: "you are not allowed to delete this file" });
    }
    const fileData = await fileModel.findById(fileId);
    const deleteRes = await DeleteS3Object({Key:`${fileData._id}${fileData?.extension}`});
    if(deleteRes.err) return next((new Error("delete operation failed")))
    await fileData.deleteOne()
    await updateFolderSize(fileData.parent, -fileData?.size);
    res.status(200).json({ message: "deleted succesefully" });
  } catch (error) {
    console.log("error while delete a file", error);
    res.json({ message: error });
  }
};

//find the user is ellegible to acesse the file or not
const fileAccess = async (userId, action, currentUserRole) => {
  const targetedUserData = await userModels.findById(userId).lean();
  if (
    currentUserRole == "user" &&
    targetedUserData?.purchasedPlan.PlanStatus !== "active" &&
    action == "canRead"
  )
    return {
      val: false,
      msg: "dont have valid subscription please purcahsed to use extra storage",
    };

  if (targetedUserData) {
    const isAllowed = isAllowedTOAccess(
      currentUserRole,
      action,
      targetedUserData.role
    );
    return isAllowed;
  }
};
