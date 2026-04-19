import mongoose from 'mongoose'
import userModels from '../Models/userModel.js'
import directoryModel from "../Models/directoryModel.js"
import bcrypt from 'bcrypt'
import SessionModel from '../Models/Sessions.js'
import { VarifyIdToken } from "../utils/googleOauth.js"
import {redisClient} from '../DB/redisDB.js'
import { randomBytes } from 'crypto'
import { isAllowedToRoleChange } from '../utils/permission/permission.js'
import { AllPlansInfo } from '../utils/Constant/StoragePlans.js'


export const SignupController = async (req, res, next) => {
  const { name, email, password } = req.body

  const newUserId = new mongoose.Types.ObjectId()
  const newUserRootDirId = new mongoose.Types.ObjectId()
  const hasedPswd = await bcrypt.hash(password, 10)

  const newUserData = { _id: newUserId, name, email, password: hasedPswd, rootDirID: newUserRootDirId }
  const rootDirData = { _id: newUserRootDirId, "name": `root-${email}`, userId: newUserId, "parent": null }
  const data = await CreateNewAccount(newUserData, rootDirData)
  if (!data) return next(new Error)
  //send the response 
  return res.status(201).json({ message: "user created successfully" })
}

//login
export const LoginController = async (req, res, next) => {
  const { email, password } = req.body
  try {
    const userData = await userModels.findOne({ email }).lean()
    if (!userData) return res.status(404).json({ err: "users does not exist" })
    const isValidPswd = await bcrypt.compare(password, userData?.password)
    if (!isValidPswd) return res.status(409).json({ err: "invalid credential" })
    //find the sessions exist
    req.userData = userData
    const sesID = await CreateSession(req)
    const sessionData = JSON.stringify({ sesID, uid: userData?._id })
    if (!sesID) return res.status(404).json({ err: "error while login" })
    res.cookie('sid', Buffer.from(sessionData, 'utf-8').toString("base64url"), { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'none', secure: true, signed: true })
    return res.status(200).json({ msg: "user Loggeg in" })
  } catch (error) {
    console.log("error while login", error)
    next(new Error)
  }
}

//gooogle signup & login
export const GoogleOauth = async (req, res, next) => {
  const { token } = req.body
  if (!token) return res.status(404).json({ err: "dont have token" })
  console.log(await VarifyIdToken(token))
  const { sub, name, email, picture } = await VarifyIdToken(token)
  //cheeck if user already exist
  const isExist = await userModels.findOne({ email }).lean()
  let newUserId
  if (!isExist?._id) {
    //create new user acc
    newUserId = new mongoose.Types.ObjectId()
    const newUserRootDirId = new mongoose.Types.ObjectId()

    const newUserData = { _id: newUserId, name, email, rootDirID: newUserRootDirId, GoogleSubID: sub, avatar: picture, emailVarified: true }
    const rootDirData = { _id: newUserRootDirId, "name": `root-${email}`, userId: newUserId, "parent": null }
    const data = await CreateNewAccount(newUserData, rootDirData)
    if (data.err) {
      if (data.err == 11000) return res.status(409).json({ error: "user already exist" })
      if (data.err == 121) return res.status(404).json({ error: "invalid fields" })
      if (data.err == 1) return next(new Error)
    }
  }
  //login after singup
  req.userData = isExist
  const sesID = isExist?._id ? await CreateSession(req) : await CreateSession(req)
  const sesToken = { sesID, uid: isExist._id ? String(isExist._id) : newUserId }
  if (sesID) {
    res.cookie('sid', Buffer.from(JSON.stringify(sesToken), 'utf-8').toString("base64url"), { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'none', secure: true, signed: true })
    return res.status(200).json({ msg: "user Loggeg in" })
  }
  res.status(404).json({ err: "error while login" })
}

//user profile data
export const GetUserData = async (req, res) => {
  const { userData } = req
  const dbData = await userModels.findById(userData?.userId)
                    .populate({path:"rootDirID",select: 'size' }).lean()
  return res.status(200).json({ name: dbData?.name, email: dbData?.email, emailVarified: dbData?.emailVarified, role: dbData?.role, totalStorage: dbData.maxStorageInBytes, usedStorage:dbData?.rootDirID?.size, isSubscribed: dbData?.purchasedPlan?.PlanStatus == "active" ? true : false  })
}

//user profile data
export const GetStorageInfo = async (req, res) => {
  const { userData } = req
  const dbData = await userModels.findById(userData?.userId)
                    .populate({path:"rootDirID",select: 'size' }).lean()
  return res.status(200).json({ name: dbData?.name, email: dbData?.email, emailVarified: dbData?.emailVarified, role: dbData?.role, totalStorage: dbData.maxStorageInBytes, usedStorage:dbData?.rootDirID?.size, isSubscribed: dbData?.purchasedPlan?.PlanStatus == "active" ? true : false  })
}

//logout controller
export const Logout = async (req, res) => {
  const { sid } = req.signedCookies
  const sessionID = Buffer.from(sid, "base64url").toString()
  await redisClient.json.del(`user:${sessionID}`, "$")
  res.clearCookie('sid', { sameSite: 'none', secure: true })
  res.status(200).json({ message: "logout successfully happens" })
}


//create new Account for user
async function CreateNewAccount(newUserData, rootDirData) {
  const session = await mongoose.startSession()
  //start the transaction
  session.startTransaction()
  try {
    await userModels.insertOne(newUserData, { session })
    await directoryModel.insertOne(rootDirData, { session })
    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error.code == 121) {
      console.log(error)
      return { err: 121 }
    }
    if (error.code == 11000) {
      return { err: 11000 }
    }
    console.log(error)
    return { err: 1 }
  }
  return true
}

//create session function for login controller
async function CreateSession(req) {
  console.log(req.userData)
  const { _id, rootDirID, role, maxStorageInBytes } = req.userData
  const deviseInfo = parseUserAgent(req.headers['user-agent'])
  const sessionId = randomBytes(16).toString("hex")
  const PurchasedPlan = AllPlansInfo.find((plan) => { plan.storage == maxStorageInBytes && plan.name })
  const userSession = { userId: _id, rootDirID: rootDirID, role: role, deviseInfo, id: sessionId, role, planName: PurchasedPlan?.name && null }
  try {
    const prevSessions = await redisClient.keys(`user:${_id}`)
    if (prevSessions.length > 2) {
      //TODO:make it a diffrent function handle the subscription wise allow and make it more interactive like send a response to ui for logout the previous devises
      const isDelete = await redisClient.json.del(`${prevSessions[0]}`, "$")
      if (!isDelete) return res.status(404).json({ msg: "not allowed to login logout from other device" })
    }
    const data = await redisClient.json.set(`session:${_id}:${sessionId}`, "$", userSession)
    console.log(data)
    await redisClient.expire(`session:${sessionId}`, 60 * 60 * 24)
    return sessionId
  } catch (error) {
    console.log("error while Create session function", error)
    return false
  }
}


// const result = await redisClient.ft.search("nameIdx", "@name:Kumar", {
//   LIMIT: {
//     from: 0,
//     size: 0,
//   },
// });

function parseUserAgent(ua) {
  const result = {
    device_type: /Mobile|Android/i.test(ua) ? 'Mobile' : 'Desktop',
    os_name: '',
    os_version: '',
    browser_name: '',
    browser_version: ''
  };

  // OS
  if (/Windows NT/i.test(ua)) {
    result.os_name = 'Windows';
    const match = ua.match(/Windows NT ([\d.]+)/);
    result.os_version = match ? match[1] : '';
  } else if (/Android/i.test(ua)) {
    result.os_name = 'Android';
    const match = ua.match(/Android ([\d.]+)/);
    result.os_version = match ? match[1] : '';
  }

  // Browser
  if (/Chrome\/([\d.]+)/i.test(ua) && /Edg\//i.test(ua)) {
    result.browser_name = 'Edge';
    const match = ua.match(/Edg\/([\d.]+)/);
    result.browser_version = match ? match[1] : '';
  } else if (/Chrome\/([\d.]+)/i.test(ua)) {
    result.browser_name = 'Chrome';
    const match = ua.match(/Chrome\/([\d.]+)/);
    result.browser_version = match ? match[1] : '';
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    result.browser_name = 'Firefox';
    const match = ua.match(/Firefox\/([\d.]+)/);
    result.browser_version = match ? match[1] : '';
  }

  return result;
}

//admin controllers
//get all user 
export const GetAllUser = async (req, res, next) => {
  const a = performance.now()
  const allUser = await userModels.find({ isDeleted: false }).lean()
  const usersData = []
  for (let user of allUser) {
    let MyCursor = "0"
    const activeDevices = []
    do {
      const { cursor, keys } = await redisClient.scan(MyCursor, { MATCH: `session:${String(user._id)}*`, COUNT: 100 })
      activeDevices.push(keys)
      MyCursor = cursor
      //console.log(activeDevices.length)
      usersData.push({ ...user, totalActiveDev: activeDevices.length, isLogedIn: activeDevices.length ? true : false })
    } while (MyCursor != "0");
  }
  const b = performance.now()
  // console.log(usersData)
  return res.status(200).json(usersData)
}

//looged out by admin
export const LogoutUserByAdmin = async (req, res, next) => {
  //if(req.role != "manager") return res.status(404).json({err:"you dont have the acesse"})
  const { userId } = req.params
  try {
    const allSessions = await redisClient.ft.search('uidIndex', `@userId:{${userId}}`)
    const data = await Promise.all(
      allSessions.documents.map((sesDoc) => redisClient.json.del(sesDoc.id, "$"))
    )
    if (data) return res.status(200).json({ message: "user logged out" })
    return res.status(404).json({ err: "user session does not exist" })
  } catch (error) {
    console.log("error while admin logout a user", { error })
    next(new Error)
  }
}

//delete the user account by admin
export const DeleteUserByAdmin = async (req, res) => {
  //this is soft deletion of user
  if (req.role != "admin" && req.role != "owner") return res.status(404).json({ err: "not allowed to perform" })
  const { userId } = req.params
  const { userData } = req
  if (userData.userId == userId) return res.status(403).json({ message: "user dont have the permission" })
  const mongooseSession = await mongoose.startSession()
  mongooseSession.startTransaction()
  try {
    const data = await userModels.updateOne({ _id: userId }, { isDeleted: true })
    if (!data.modifiedCount) return res.status(404).json({ message: "user deleted request unsusessfull" })
    //delete sessions from redis
    await redisClient.json.del(`session:${userId}`, "$")
    await mongooseSession.commitTransaction()
    return res.status(200).json({ message: "user account deleted" })
  } catch (error) {
    console.log("error while delete the user account", error)
    await mongooseSession.abortTransaction()
    return res.status(404).json({ err: "user account not deleted" })
  } finally {
    await mongooseSession.endSession()
  }
}

//hard delete user account by owner
export const PermanetDelete = async () => {
  if (req.role !== 'owner') return
  const { userId } = req.params
  try {
    await userModels.deleteOne({ id: userId })
    return res.status(200).json({ msg: "user permanetly deleted" })
  } catch (error) {
    console.log("error while hard delete the user", error)
    next(new Error)
  }
}


//recover the account 
export const recoverUserAccount = async (req, res, next) => {
  const { userId } = req.params
  if (userId == userData?._id) return res.status(403).json({ err: "user can not perform admin action on his own account" })
  try {
    await userModels.updateOne({ _id: userId }, { isDeleted: false })
    return res.status(200).json({ msg: "user account recoverd" })
  } catch (error) {
    console.log("error while recover the user account", error)
    next(new Error)
  }
}

//get all soft deleted user
export const SoftDeletedUsers = async (req, res, next) => {
  if (req.userData.role != "owner") return res.status(403).json({ err: "you are not allowed to hit this route" })
  try {
    const allUsers = await userModels.find({ isDeleted: true })
    console.log(allUsers)
    return res.status(200).json(allUsers)
  } catch (error) {
    console.log("error while get all soft deleted users", error)
    next(new Error)
  }
}

//change user role
export const ChangeUserRole = async (req, res, next) => {
  const { userId, assignRole } = req.params
  const CurrentUserData = req?.userData
  const assigUserData = await userModels.findById(userId)
  if (!assigUserData?._id || assignRole == 'owner') res.status(403).json({ err: "invalid user id or role" })

  if (userId == CurrentUserData?._id) return res.status(403).json({ err: "u can't change ur own role" })
  const isAllowed = isAllowedToRoleChange(CurrentUserData?.role, "canChangeRole", assignRole, assigUserData?.role)
  if (isAllowed.val) {
    await userModels.updateOne({ isDeleted: false, _id: userId }, { role: assignRole })
    return res.status(200).json({ msg: `${assignRole} assigned` })
  }
  return res.status(404).json({ err: "not allowed assigned new role to the user" })
}

//chnage the password and if add the password is null also add a new one
// const ChnageOrAddPassword = async =(req,res,next)=>{

//   const {}
// }

