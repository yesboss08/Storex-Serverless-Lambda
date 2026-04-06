import userModels from "../Models/userModel.js"


export const AdminCheeck = async(req,res,next)=>{
const {userData} = req
if(userData?.userId){
try {
   const data = await userModels.findById(userData?.userId)
   if(data?.role == "user") return res.status(403).json({message:"user is unAuthorized to access this route"})
   req.role = data?.role
   return next()
} catch (error) {
   console.log("error in admin auth middleware")
}
}
next(new Error)
}