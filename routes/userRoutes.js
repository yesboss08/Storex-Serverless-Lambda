import express from 'express'
import AuthCheeck from '../middlewares/newAuth.js'
import {SignupController,LoginController,GoogleOauth, GetUserData, Logout, GetAllUser,LogoutUserByAdmin,DeleteUserByAdmin,PermanetDelete,SoftDeletedUsers,recoverUserAccount, ChangeUserRole} from "../controllers/userConrtoller.js"
import { VarificationEmail } from '../utils/EmailOtpVarification.js'
import OtpSessionModel from '../Models/OtpSession.js'
import userModels from '../Models/userModel.js'
import {AdminCheeck} from '../middlewares/AdminCheeck.js'
import { GenerateMessageForOTP } from '../utils/ResendMessageGenerate.js'

const router = express.Router()
router.post("/signup", SignupController)
router.post("/login", LoginController)
router.post('/logout', AuthCheeck,Logout)
//get the name and user email
router.get('/profile',AuthCheeck,GetUserData )
router.post("/gooleOauth",GoogleOauth)

//admin routes
router.get("/allUsers", AuthCheeck, AdminCheeck, GetAllUser)
router.post("/AdminLogout", AuthCheeck, AdminCheeck,LogoutUserByAdmin)
router.delete("/:userId/deleteUserAccount",AuthCheeck, AdminCheeck,DeleteUserByAdmin)
router.delete('/:userId/hard', AuthCheeck ,AdminCheeck, PermanetDelete )
router.put('/:userId/recoverDeletedUser', AuthCheeck,AdminCheeck , recoverUserAccount)
router.get('/softDeletedUsers', AuthCheeck ,AdminCheeck ,SoftDeletedUsers )
router.put("/:userId/changeRole/:assignRole", AuthCheeck , AdminCheeck , ChangeUserRole)

//otp and verify email routes
router.post('/generateOtp',AuthCheeck, async(req,res,next)=>{
const {email ,emailVarified } = req
if(emailVarified) return res.status(204)
const userOtp = (1000 + Math.random() * 9000).toFixed(0);
const message = GenerateMessageForOTP(userOtp)
const subject = `StoreX OTP: ${userOtp} (Expires in 5 Minutes)`
try {
    const otpRes = await VarificationEmail({userEmail:email,message,subject})
if(!otpRes) return res.status(404).json({err:"can't generate otp"}) 
//TODO:create the opt docs in redis for fast response
await OtpSessionModel.create({otp:userOtp, userEmail:email})
return res.status(200).json({msg:"Otp sent to ur email"})
} catch (error) {
    console.log("error while generating otp", error)
    next(new Error)
}
})

router.post('/varifyOtp',AuthCheeck,async (req,res,next)=>{
    const {userData} = req
    const {userOtp} = req.body
   try {
    const otpDoc = await OtpSessionModel.findOne({userEmail:userData?.email})
    if(!otpDoc?._id) return res.status(404).json({err:"not found"})
        if(otpDoc?.otp != userOtp) return res.status(409).json({err:"incorect Opt"})
   await otpDoc.deleteOne() 
  const dbRes = await userModels.updateOne({_id:userData?._id}, {emailVarified:true})
  console.log(dbRes)
  if(dbRes.modifiedCount)return res.status(200).json({msg:"email varified"})
next(new Error)
   } catch (error) {
    console.log("error while varify otp", error)
    next(new Error)
   }
})






export default router


