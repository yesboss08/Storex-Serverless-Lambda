
import ServerlessHttp from "serverless-http";
import app from './app.js'
import { Config } from "./utils/Config/Config.js";
import { ConnectRedis } from "./DB/redisDB.js";
import {connectDB} from './Models/db.js'

await connectDB()
await ConnectRedis()

const proxyHandler = ServerlessHttp(app)

export const handler = async(event, context)=>{
    context.callbackWaitsForEmptyEventLoop = false;
    proxyHandler(event, context)
}

