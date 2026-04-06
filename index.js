
import ServerlessHttp from "serverless-http";
import app from './app.js'


export const handler = ServerlessHttp(app)