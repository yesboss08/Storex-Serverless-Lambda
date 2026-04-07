
import ServerlessHttp from "serverless-http";
import app from './app.js'


const proxyHandler = ServerlessHttp(app)

export const handler = async(event, context)=>{
    context.callbackWaitsForEmptyEventLoop = false;
    proxyHandler()
}