
export const permission = {
    user:{
    canRead:['own'],
    canWrite:['own'],
    canEdit:['own'],
    canDelete:['own'],
    canChangeRole:[]
    },
    manager:{
    canRead:['own', 'user'],
    canWrite:['own'],
    canEdit:['own'],
    canDelete:['own'],
    canChangeRole:['manager']
    },
    admin:{
        canRead:['own', 'user', 'manager'],
        canWrite:['own',"user"],
        canEdit:['own'],
        canDelete:['own'],
        canChangeRole:['admin','manager'] 
    },
    owner:{
        canRead:["*"],
        canWrite:["*"],
        canEdit:["*"],
        canDelete:["*"],
       canChangeRole:['admin','manager']
    }
}

 //cheeck the user is allowed to change that specific role or not
 export const isAllowedToRoleChange = (currentUserRole, action , allowRole,prevRole)=>{
    //only owner can do the down grade 
    if(currentUserRole=='owner' || !permission[allowRole])return isValid ? {val:true , msg:"role and action assignable"} :{val:false , msg:"role is not assignable"}
    //for manager and admin
    if(!permission[allowRole] || permission[prevRole][action].includes(allowRole)) return {val:false , msg:"invlaid role is not assignable"}
const Role = permission[currentUserRole]
 const isValid = Role[action].includes(allowRole) || Role[action].includes("*")
return isValid ?{val:true , msg:"role and action assignable"} :{val:false , msg:"role is not assignable"}
}

//if the current user allowed to access the other users files
export const isAllowedTOAccess = (CurrentuserRole,action,TargeteduserRole,SubscriptionStatus )=>{
    const role = permission[CurrentuserRole]
    const isAllowed = role[action].includes(TargeteduserRole) || role[action].includes("*")
    return isAllowed ? {val:true , msg:"allowed to access"} :{val:false , msg:"not allowed to access"}
 }






