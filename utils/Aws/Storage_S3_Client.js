import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Config } from "../Config/Config.js";
import crypto from "crypto";
import { UpdateCloudFrontInvalidation } from "./Clould-Front_Client.js";

const client = new S3Client({ credentials:{accessKeyId:Config.AWS_ACCESS_KEY_ID,secretAccessKey:Config.AWS_SECREAT_ACCESS_KEY} ,region:"ap-south-2"});

export const CreatePutSignedUrl = async ({
  fileId,
  extension,
  fileType,
  fileSize,
}) => {
  const hasedData = IsValidHash({ data: { fileId, extension, fileSize } });
  const command = new PutObjectCommand({
    Bucket: Config.AWS_S3_STORAGE_BUCKET_NAME,
    Key: `${fileId}${extension}`,
    ContentType: fileType,
    Metadata: {
      fileInfo: hasedData,
    },
  });
  console.log(fileSize)
  const url = await getSignedUrl(client, command, {
    signableHeaders: new Set(["content-type"]),
    expiresIn: 500,
  });
  return url;
};

export const CheeckValidFile = async ({ fileId, extension, fileSize }) => {
  const comand = new GetObjectCommand({
    Bucket: Config.AWS_S3_STORAGE_BUCKET_NAME,
    Key: `${fileId}${extension}`,
  });
try {
    const res = await client.send(comand);
  const oldHash = res.Metadata?.fileinfo;
  if(res.ContentLength!=fileSize) return false
  const data = { fileId, extension, fileSize };
  const IsValid = IsValidHash({ data, oldHash });
  console.log({IsValid})
  return IsValid;
} catch (error) {
  console.log("error while getting the file data",error)
}
};

export const DeleteS3Object = async ({Key }) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: Config.AWS_S3_STORAGE_BUCKET_NAME,
      Key,
    });
    const res = await client.send(command);
    if(res.$metadata?.httpStatusCode==204){
   const {val}=   await UpdateCloudFrontInvalidation({items:[`/${Key}`]})
    if(val)  return { err: false };
    }
      return { err: true };
  } catch (error) {
    console.log("error while delete the s3 object", error);
    return { err: true };
  }
};
export const DeleteMutipleS3Object = async ({keys }) => {
  try {
    const command = new DeleteObjectsCommand({
      Bucket: Config.AWS_S3_STORAGE_BUCKET_NAME,
      Delete:{Objects: keys, Quiet:true}
    });
    const res = await client.send(command);
    if(res.$metadata?.httpStatusCode==204){
   const {val}=   await UpdateCloudFrontInvalidation({items:[`/${Key}`]})
    if(val)  return { err: false };
    }
      return { err: true };
  } catch (error) {
    console.log("error while delete the s3 object", error);
    return { err: true };
  }
};



const IsValidHash = ({ oldHash, data }) => {
  const newHash = crypto
    .createHmac("sha256", Config.Cookie_Secreate)
    .update(JSON.stringify(data))
    .digest("base64url");
  if (!oldHash) return newHash;
  if (oldHash == newHash) return true;
  return false;
};



