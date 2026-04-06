import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { Config } from "../Config/Config.js";

const client = new CloudFrontClient({ credentials:{accessKeyId:Config.AWS_ACCESS_KEY_ID,secretAccessKey:Config.AWS_SECREAT_ACCESS_KEY}});

export const UpdateCloudFrontInvalidation = async ({ items }) => {
  //each item should be included '/' if not then it will not update the invalidtion
  try {
    const command = new CreateInvalidationCommand({
      DistributionId: Config.AWS_CLOUD_FRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: items.length,
          Items: items,
        },
      },
    });
    const response = await client.send(command);
    if (response?.Invalidation.Id)
      return { msg: "invalidtion created", val: response?.Invalidation.Id };
    else return { msg: "invalidtion not created", val: null };
  } catch (error) {
    console.log("error while cretaing  the invalidation", error);
    return { msg: "invalidtion not created", val: null };
  }
};

//getting the get signed url cdn enabled
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import fs from "fs/promises";

export const GetCloudFrontUrl = async ({ key }) => {
  const cloudfrontDistributionDomain =
    Config.AWS_Cloud_Front_Distribution_Domain;
  const s3ObjectKey = key;
  const url = `${cloudfrontDistributionDomain}/${s3ObjectKey}`;
  const privateKey = (
    await fs.readFile("utils/Aws/aws_keys/private.pem")
  ).toString("utf-8");
  const keyPairId = Config.AWS_CLOUD_FRONT_keyPairId;
  const dateLessThan = new Date(Date.now() + 1000 * 300).toISOString();
  const SignedUrl = getSignedUrl({ keyPairId, privateKey, dateLessThan, url });
  return SignedUrl;
};
