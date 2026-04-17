import mongoose from "mongoose";
import { Config } from "../utils/Config/Config.js";


let cached = { promise: null, conn: null }


export const connectDB = async()=>{
if(cached?.conn)return cached.conn

try {
  if(!cached?.promise){
  cached.promise = mongoose.connect(Config.MongoDB_URL).then((mongoose)=>mongoose)
}

cached.conn = await cached.promise
return cached.conn
} catch (error) {
  console.log("error while connecting to mongoose db", error)
  throw(error)
}
}
