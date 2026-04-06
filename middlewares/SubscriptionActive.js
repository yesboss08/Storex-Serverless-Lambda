import directoryModel from "../Models/directoryModel"
import SubscriptionModel from "../Models/Subscription"
import userModels from "../Models/userModel"
import { Config } from "../utils/Config/config"

export const cheeckSubscription = async()=>{
const {purchasedPlan, userId,rootDirID} = req.userData
if(!purchasedPlan?.purchasedPlanId || purchasedPlan?.status=="active") return

const UserSubData = await SubscriptionModel.findOne({userId})
const currentDate = Date.now()/1000
if(UserSubData?.ends_at<currentDate){
    try {
   await UserSubData.updateOne({$set:{isActive:false,status:""}})
 const userDBdata=  await userModels.updateOne({_id:userId}, {$set:{purchasedPlan:null,maxStorageInBytes:Config.Default_Max_Storage_In_Bytes}})
 const rootDirData = await directoryModel.findById(rootDirID).lean()
 if(rootDirData?.size>Config.Default_Max_Storage_In_Bytes){
//TODO:send email for delete the files user has
 }else{
    //TODO:SENd a email for thanks and tell to resubscribe
 }
   return
    } catch (error) {
        console.log("error while updating the cancelled subscription user", error)
    }
}
return
}