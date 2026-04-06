

export const GetUserStoragePlatformInfo= async({userId})=>{

    //this is right now for demo 
    //TODO: implement a new collection for storing the users 3rd party access and refresh tokens and in this function we call that fetch the info and send to client


     const a = {
        google: { used: 0, total:0 },
        onedrive: { used: 0, total: 0 },
        dropbox: { used: 0,total : 0 },
        totals: { used: 0, total: 0, percentage: 0 },
      }
    
      return a
}