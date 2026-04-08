
import ServerlessHttp from "serverless-http";
import app from './app.js'


// const proxyHandler = ServerlessHttp(app)

// export const handler = async(event, context)=>{
//     console.log("yo")
//     context.callbackWaitsForEmptyEventLoop = false;
//     proxyHandler()
// }

export const handler = ServerlessHttp(app)