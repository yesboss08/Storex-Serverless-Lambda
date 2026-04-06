import { ObjectId } from "mongodb"
import userModels from "../Models/userModel.js"
import crypto from 'crypto'

 const CheeckAuth =async (req,res,next)=>{

if(!req.cookies.uid) return

const {id ,expire,signeture } =  JSON.parse(Buffer.from(req.cookies.uid , "base64url").toString("utf-8"))


//cheeck the data is tamperd or not
if(!signeture) return next(Error)
    const cookiesData = {id ,expire}
const key = 'Sanat1234@'
const hash = crypto.createHash('sha256').update(JSON.stringify(cookiesData)).update(key).digest('base64url')
if(hash != signeture){
  return LogoutFn(res)
}


const validId = ObjectId.isValid(id)

//cheeck the cookies expire 
const currentTime = Math.floor(Date.now()/1000)
if(validId && currentTime < expire ){
    const userData = await userModels.findById(id).lean()
    console.log({userData})
    req.userData = userData
    next()
}else{
LogoutFn(res)
}
}

export default CheeckAuth

const LogoutFn = (res)=>{
    res.clearCookie('uid' , { sameSite:'none', secure:true} )
res.status(401).json({error:"user is not allowed to access"})
return console.log("logout")
}

   
