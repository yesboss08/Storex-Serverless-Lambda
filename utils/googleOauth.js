import {OAuth2Client} from 'google-auth-library'
import { google } from 'googleapis'
import { Config } from './Config/Config.js'

export const clientId =Config.Google_Oauth_ClientID
const redirectUri = Config.Google_Oauth_RedirectUri
const clientSecret = Config.Google_Oauth_ClientSecret

export const OauthClient = new OAuth2Client({
    clientId:clientId ,redirectUri,clientSecret
})


export const VarifyIdToken =async (token)=>{
    console.log({token})
try {
    const data =  await OauthClient.verifyIdToken({idToken:token, audience:clientId})
    return   data.getPayload()
} catch (error) {
    console.log("error while varifying the id_token",error)
}
}

export const DriveClientId =Config.Google_Oauth_DriveClientId
const DriveRedirectUri = Config.Google_Oauth_DriveRedirectUri
const DriveClientSecret = Config.Google_Oauth_DriveClientSecret

export const DriveOauthClient = new google.auth.OAuth2(
    DriveClientId,
    DriveClientSecret,
    DriveRedirectUri
  );


