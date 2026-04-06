

export const PlanUpgradation = {
    "freeTier":["*"],
    "Basic Storage Plan":["Pro Storage Plan","Premium Storage Plan"],
    "Pro Storage Plan":["Premium Storage Plan"],
    "Premium Storage Plan":[]
}

export const isAllowedTOBuy = ({currentPlan , PlanTOBuy , currentSubStatus})=>{
if(currentPlan==PlanTOBuy && currentSubStatus)return {stas:false , msg:"can not buy the same plan"}
if(!PlanUpgradation[currentPlan].includes(PlanTOBuy) && !PlanUpgradation[currentPlan].includes("*") ) return {stas:false , msg:"can not downgrade"}
return {stas:true , msg:"allowed"}
}


export const ValidPayment = ({PaymnetDetails , userPlan})=>{
if(PaymnetDetails?.status=="captured" && userPlan.price==PaymnetDetails?.amount/100) return true 
return false
}