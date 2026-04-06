import mongoose from "mongoose";
import { Config } from "../utils/Config/Config.js";


let cached = global?.mongooseConn

if(!cached){
cached = global.mongooseConn = { promise: null, conn: null };
}


export const connectDB = async()=>{
if(cached?.conn)return cached.conn

if(!cached?.promise){
  cached.promise = mongoose.connect(Config.MongoDB_URL).then((mongoose)=>mongoose)
}

cached.conn = await cached.promise
return cached.conn
}
