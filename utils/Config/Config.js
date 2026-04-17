

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import {config as dotenv} from 'dotenv'
// Initialize the AWS Client
const client = new SecretsManagerClient({
  region:  "ap-south-1" 
});

let Config = {};

const GetENV = ()=>{
  dotenv()
      let envVars = {
  PORT: process.env.PORT,
  ALLOWED_CLIENT_1: process.env.ALLOWED_CLIENT_1,
  ALLOWED_CLIENT_2: process.env.ALLOWED_CLIENT_2,
  MongoDB_URL: process.env.MongoDB_URL,
  Cookie_Secreate: process.env.Cookie_Secreate,
  Redis_DB_Password: process.env.Redis_DB_Password,
  Resend_Api_Key: process.env.Resend_Api_Key,
  Google_Oauth_ClientID: process.env.Google_Oauth_ClientID,
  Google_Oauth_RedirectUri: process.env.Google_Oauth_RedirectUri,
  Google_Oauth_ClientSecret: process.env.Google_Oauth_ClientSecret,
  Google_Oauth_DriveClientId: process.env.Google_Oauth_DriveClientId,
  Google_Oauth_DriveRedirectUri: process.env.Google_Oauth_DriveRedirectUri,
  Google_Oauth_DriveClientSecret: process.env.Google_Oauth_DriveClientSecret,
  Razorpay_Api_Secreate: process.env.Razorpay_Api_Secreate,
  Razorpay_Api_KEY_ID: process.env.Razorpay_Api_KEY_ID,
  Default_Max_Storage_In_Bytes: process.env.Default_Max_Storage_In_Bytes,
  Redis_URL:process.env.Redis_URL,
  Redis_DB_Password:process.env.Redis_DB_Password,
  AWS_LOACL_IAM_USER_PROFILE:process.env.AWS_LOACL_IAM_USER_PROFILE,
  AWS_S3_STORAGE_BUCKET_NAME:process.env.AWS_S3_STORAGE_BUCKET_NAME,
  AWS_CLOUD_FRONT_DISTRIBUTION_ID:process.env.AWS_CLOUD_FRONT_DISTRIBUTION_ID,
  AWS_Cloud_Front_Distribution_Domain:process.env.AWS_Cloud_Front_Distribution_Domain,
  AWS_CLOUD_FRONT_keyPairId:process.env.AWS_CLOUD_FRONT_keyPairId,
  AWS_ACCESS_KEY_ID:process.env.AWS_ACCESS_KEY_ID,
AWS_SECREAT_ACCESS_KEY:process.env.AWS_SECREAT_ACCESS_KEY,
GIT_WEBHOOK_SCREATE:process.env.GIT_WEBHOOK_SCREATE,
};
Object.assign(Config, envVars)
}

const fetchSecrets = async () => {

  try {
   if(process.env.AWS_LAMBDA_FUNCTION_NAME){
    console.log("running inside fetch secrets")
    const secretId = process.env.SecretId; 

  if (!secretId) {
    throw new Error("SECRET_ID environment variable is missing.");
  }
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client.send(command);
    const secrets = JSON.parse(response.SecretString);
    Object.assign(Config, secrets)
   }else{
    GetENV()
   }
  } catch (error) {
    console.error("Error fetching secrets from AWS:", error);
    throw error; 
  }
};


await fetchSecrets();
export { Config };

