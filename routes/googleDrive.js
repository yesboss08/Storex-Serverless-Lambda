import express from "express";
import { DriveOauthClient } from "../utils/googleOauth.js";
import { google } from "googleapis";
import CheeckAuth from "../middlewares/newAuth.js";
import userModels from "../Models/userModel.js";
import mime from "mime";
import fileModel from "../Models/fileModel.js";
import directoryModel from "../Models/directoryModel.js";
import path from "path";
import { createWriteStream } from "fs";
import { GetFile } from "../controllers/fileController.js";
import mongoose from "mongoose";

const router = express.Router();


router.get("/getUrl", CheeckAuth, async (req, res) => {
  const authUrl = DriveOauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive",
    ],
  });
  res.redirect(authUrl);
});

router.get("/redirecturi", CheeckAuth, async (req, res, next) => {
  const { code } = req.query;
  const { userData } = req;
  if (!code) return;
  try {
    const { tokens } = await DriveOauthClient.getToken(code);
    const { access_token, refresh_token, expiry_date } = tokens;
    const newSetDbTokens = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiryDate: expiry_date,
    };
    DriveOauthClient.setCredentials(tokens);
    const dbUser = await userModels.findById(userData?.userId);
    //if the acesse token is not generated or expired before
    console.log({ newSetDbTokens });
    if (dbUser?.Tokens?.refreshToken !== refresh_token) {
      const userres = await userModels.updateOne(
        { _id: userData?.userId },
        { $set: { Tokens: newSetDbTokens } }
      );
      console.log(userres);
    }
    //ChangeLink: deploy ke bad change the link
    res.send(`<html>
            <head><title>Connected</title></head>
            <body>
              <script>
                window.opener.postMessage('drive-connected', 'http://localhost:5173');
                window.close();
              </script>
              <p>Drive connected. You can close this tab.</p>
            </body>
          </html>`);
  } catch (error) {
    console.log("error while getting the tokens from google", error);
    next(new Error());
  }
});

//get the drirectory info routes
router.get("/getDriveData/:folderId?", async (req, res, next) => {
  const { folderId } = req.params;
  const { userData } = req;
  if (!userData?.userId) return next(new Error());
  try {
    const userDbData = await userModels.findById(userData.userId);
    const { accessToken, refreshToken } = userDbData.Tokens;
    DriveOauthClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    const data = await DriveOauthClient.getAccessToken();
    if (data.token !== accessToken) {
      console.log("updating acess token");
      await userModels.updateOne(
        { _id: userData?.userId },
        { $set: { "Tokens.accessToken": data.token } }
      );
    }
    const files = await GetDirectoryData(folderId);
    return res.json(files);
  } catch (error) {
    console.log("error while get drive data", error);
  }
});

//view the file routes
router.get("/file/:fileId", async (req, res, next) => {
  const { fileId } = req.params;
  const { mimeType } = req.query;
  const { userData } = req;
  if (!userData?.userId) return next(new Error());
  try {
    const userDbData = await userModels.findById(userData.userId);
    const { accessToken, refreshToken } = userDbData.Tokens;
    console.log({ accessToken, refreshToken });
    DriveOauthClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    const data = await DriveOauthClient.getAccessToken();
    if (data.token !== accessToken) {
      console.log("updating acess token");
      await userModels.updateOne(
        { _id: userData?.userId },
        { $set: { "Tokens.accessToken": data.token } }
      );
    }
    res.setHeader("content-type", `${mimeType}`);
    res.setHeader("Content-Disposition", "inline");
    const readableStream = await ViewFile(fileId);
    return readableStream.pipe(res);
  } catch (error) {
    console.log("error while get drive data", error);
  }
});

router.post("/download/file/:fileId", async (req, res, next) => {
  const { userData } = req;
  const userDbData = await userModels.findById(userData.userId);
  const { accessToken, refreshToken } = userDbData.Tokens;
  DriveOauthClient.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  const { fileId } = req.params;
  const { mimeType } = req.body;
  const filename = path.basename(file.name, path.extname(file.name));
  const extension = `.${mime.getExtension(file.mimeType)}`;
  if (!extension)
    return res
      .status(404)
      .json({ err: "this file type will not allowed to transfer" });
  let GoogleDrive = await directoryModel.findOne({
    name: "GoogleDrive",
    parent: userData?.rootDirID,
  });
  if (!GoogleDrive?._id) {
    GoogleDrive = await directoryModel.create({
      name: "GoogleDrive",
      parent: userData?.rootDirID,
      userId: userData?.userId,
    });
  }
  try {
    const downloadRes = await DownloadFile(fileId, extension);
    await fileModel.create({
      name: filename,
      extension,
      parent: GoogleDrive?._id,
    });
    return res.status(200).json({ msg: "file successfully Transferd" });
  } catch (error) {
    return res.status(404).json({ err: "invalid file type cant be download" });
  }
});

//routes for download dir
router.post("/download/directory/:dirID", async (req, res, next) => {
  const { userData } = req;
  const userDbData = await userModels.findById(userData.userId);
  const { accessToken, refreshToken } = userDbData.Tokens;
  DriveOauthClient.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  const { dirID } = req.params;
  const { dirName, parentId } = req.body;
  let GoogleDrive;
  if (!parentId) {
    GoogleDrive = await directoryModel.findOne({
      name: "GoogleDrive",
      parent: userData?.rootDirID,
    });
    if (!GoogleDrive?._id) {
      GoogleDrive = await directoryModel.create({
        name: "GoogleDrive",
        parent: userData?.rootDirID,
        userId: userData?.userId,
      });
    }
  }
  const dirParentId = parentId ? parentId : GoogleDrive?._id;
  console.log({ name: dirName, parent: dirParentId, userId: userData?.userId });
  //const dirData = await directoryModel.create({name:dirName,parent:dirParentId,userId:userData?.userId})
  //for Server‑Sent Events headers
  // res.writeHead(200, {
  //   'Content-Type': 'text/event-stream',
  //   'Cache-Control': 'no-cache',
  //   Connection: 'keep-alive',
  // });

  try {
    const resDir = await DownloadDir(
      res,
      dirID,
      dirName,
      dirParentId,
      userData?.userId
    );
    if (!resDir?.status)
      return res
        .status(404)
        .json({ msg: "server-error:cant import files and directory now" });
    //  res.write("download completed");
    //  return res.end();
    res.status(201).json({ msg: "folder downloaded" });
  } catch (error) {
    console.log("error while dowload the directory", error);
    next(new Error("internal server error"));
  }
});

router.get("/storageInfo", async (req, res, next) => {
  try {
    const { userData } = req;
    const userDbData = await userModels.findById(userData.userId);
    if (!userDbData) return res.status(404).json({ error: "User not found" });
    if(!userDbData?.Tokens) return res.status(204).json({msg:'user is not connect with the google drive'});
    const { accessToken, refreshToken, expiryDate } = userDbData?.Tokens;
    DriveOauthClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    });
    const drive = google.drive({ version: "v3", auth: DriveOauthClient });
    const driveRes = await drive.about.get({ fields: "storageQuota" });
    return res.status(200).json(driveRes.data?.storageQuota);
  } catch (error) {
    console.error("error while getting the storage quota", error);
    return next(error);
  }
});

router.get("/Getfile/:type?", async (req, res, next) => {
  const { userData } = req;
  const { type } = req.params;
  const AllowedFileTypes = [
    "image",
    "pdf",
    "folder",
    "document",
    "video",
    "spreadsheet",
  ];
  if (!AllowedFileTypes.includes(type) && type)
    return res.status(401).json({ err: "invalid file type" });
  try {
    const userDbData = await userModels.findById(userData.userId);
    if (!userDbData) return res.status(404).json({ error: "User not found" });
    const { accessToken, refreshToken, expiryDate } = userDbData.Tokens;
    DriveOauthClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    });
    const AllFiles = await GetFileOfSpecificType(null, type);
    res.json(AllFiles);
  } catch (error) {
    console.log("error while gettin specific file type", error);
    next(new Error());
  }
});

//route for downloading all the images
router.get("/download/AllImgs", async (req, res, next) => {
  const { userData } = req;
  const userDbData = await userModels.findById(userData.userId);
  if (!userDbData) return res.status(404).json({ error: "User not found" });
  const { accessToken, refreshToken, expiryDate } = userDbData.Tokens;
  DriveOauthClient.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryDate,
  });
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  //get all the imgs
  const allImgs = await GetFileOfSpecificType(null, "image");

  //create a image folder in the rootdir as a parent dir
  let ImageDir = await directoryModel.findOne({
    name: "IMAGES",
    parent: userData?.rootDirID,
  });
  if (!ImageDir?._id) {
    ImageDir = await directoryModel.create({
      name: "IMAGES",
      parent: userData?.rootDirID,
      userId: userData?.userId,
    });
  }
  let downloadedNumber = 0;
  for (const imgFile of allImgs) {
    try {
      const fileDbId = new mongoose.Types.ObjectId();
      const filename = path.basename(imgFile.name, path.extname(imgFile.name));
      const extension = `.${mime.getExtension(imgFile.mimeType)}`;
      if (!extension) return false;
      const response = await DownloadFile(imgFile.id, fileDbId, extension);
      await fileModel.create({
        name: filename,
        extension,
        parent: ImageDir?._id,
      });
      downloadedNumber++;
      res.write(
        `data: ${JSON.stringify({ total: allImgs.length, completed: downloadedNumber })}\n\n`
      );
    } catch (error) {
      console.log(`error while downloadingg the img ${imgFile}`, error);
    }
  }
  res.write(`event: done\ndata: complete\n\n`);
  res.end();
});

export default router;

//download the dir by id
const DownloadDir = async (res, dirID, dirName, parentId, userId) => {
  debugger;
  const dirData = await GetDirectoryData(dirID);
  if (dirData.length <= 0)
    return { status: true, msg: "no child files exsits" };

  //create dir in the db
  const newDirInfo = await directoryModel.create({
    name: dirName,
    parent: parentId,
    userId: userId,
  });
  console.log({ newDirInfo });
  // download the files and save it in db and save the parent also
  let done = 0;
  //res.write(`data:${JSON.stringify({totalFiles:dirData.length, completed:done , currentDirName:dirName})}\n\n`)
  for (const file of dirData) {
    try {
      const filename = path.basename(file.name, path.extname(file.name));
      const extension = `.${mime.getExtension(file.mimeType)}`;
      if (!extension) return false;
      const fileMongoDoc = await fileModel.create({
        name: filename,
        extension,
        parent: newDirInfo._id,
      });
      await DownloadFile(file.id, fileMongoDoc?._id, extension);
      done++;
      //res.write(`data:${JSON.stringify({totalFiles:dirData.length, completed:done , currentDirName:dirName})}\n\n`)
    } catch (error) {
      console.log("error while downloading the", file.name);
      return;
    }
  }

  //filter all the folders inside this dir
  const childDir = dirData.filter((item) => item.mimeType.includes(".folder"));
  if (childDir.length > 0) return { status: true, msg: "no child dir present" };

  //recursive call for all child dirs
  for (const dir of childDir) {
    await DownloadDir(dir.id, dir.name, newDirInfo._id, userId);
    done++;
    //res.write(`data:${JSON.stringify({totalFiles:dirData.length, completed:done , currentDirName:dirName})}\n\n`)
  }
  //res.write(`data:${JSON.stringify({totalFiles:dirData.length, completed:done , currentDirName:dirName})}\n\n`)
  return { status: true, msg: "child directories downloaded" };
};

//get the all files and dir from the dirID
const GetDirectoryData = async (folderId) => {
  const drive = google.drive({ version: "v3", auth: DriveOauthClient });
  try {
    const allFiles = await drive.files.list({
      pageSize: 1000,
      fields: "nextPageToken, files(id, name, mimeType,parents)",
      q: folderId ? `'${folderId}' in parents` : "",
    });
    return allFiles.data.files;
  } catch (error) {
    console.log("error while geeting the dir data", error);
    return null;
  }
};

//download the file by the id
const DownloadFile = async (fileId, dbID, extension) => {
  debugger;
  const drive = google.drive({ version: "v3", auth: DriveOauthClient });
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  return new Promise((resolve, reject) => {
    const { data } = response;
    const fileStream = createWriteStream(`storage/${dbID}${extension}`);
    fileStream.on("finish", () => {
      // TODO:create the db docs here for file
      resolve(true);
    });
    fileStream.on("error", () => {
      reject(new Error("invalid file"));
    });

    data.pipe(fileStream);
  });
};

//ViewFile the file by the id
const ViewFile = async (fileId) => {
  const drive = google.drive({ version: "v3", auth: DriveOauthClient });
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  const { data } = response;
  return data;
};

//get all imgs a cross thr drive
const GetFileOfSpecificType = async (folderId, fileType) => {
  const drive = google.drive({ version: "v3", auth: DriveOauthClient });
  const type = `${fileType}`;
  let allFiles;
  if (type) {
    allFiles = await drive.files.list({
      pageSize: 1000,
      fields: "nextPageToken, files(id, name, mimeType,parents)",
      q: folderId
        ? `'${folderId}' in parents and mimeType contains '${type}'`
        : `mimeType contains '${type}'`,
    });
  } else {
    allFiles = await drive.files.list({
      pageSize: 1000,
      fields: "nextPageToken, files(id, name, mimeType,parents)",
      q: "",
    });
  }
  return allFiles.data.files;
};
