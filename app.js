import express from "express"
import cors from 'cors'
import CheeckAuth from "./middlewares/newAuth.js"
import directoryRouter from "./routes/directoryRoutes.js"
import fileRouter from "./routes/fileRoutes.js"
import userRouter from "./routes/userRoutes.js"
import cookieParser from "cookie-parser"
import { ConnectRedis } from "./DB/redisDB.js"
import GoogleDriveRouter from "./routes/googleDrive.js"
import RazorpayRouter from './routes/razorpay.js'
import { Config } from "./utils/Config/Config.js"
import GitWebHookRouter from './routes/gitWebhook.js'
import {connectDB} from "./Models/db.js"


await connectDB()


const AloowedOrigin = [
    Config.ALLOWED_CLIENT_1, Config.AllowedClient2
]


const app = express()
const port = Config.PORT || 4000

app.use(cors({
    origin: function(origin , cb){
        if(!origin || AloowedOrigin.includes(origin)){
            cb(null , true)
        }else{
            cb(new Error("Not allowed by CORS"))
        }
    }, credentials:true
}))




  app.get("/",(req,res)=>{
 return   res.json({Config})
    // res.json({msg:"hello from mostorage app ✅✅  "})
  })





export default app



// import express from "express"
// import cors from 'cors'
// import CheeckAuth from "./middlewares/newAuth.js"
// import directoryRouter from "./routes/directoryRoutes.js"
// import fileRouter from "./routes/fileRoutes.js"
// import userRouter from "./routes/userRoutes.js"
// import cookieParser from "cookie-parser"
// import { ConnectRedis } from "./DB/redisDB.js"
// import GoogleDriveRouter from "./routes/googleDrive.js"
// import RazorpayRouter from './routes/razorpay.js'
// import { Config } from "./utils/Config/Config.js"
// import GitWebHookRouter from './routes/gitWebhook.js'
// import {connectDB} from "./Models/db.js"

// const redisClient = await ConnectRedis()

// await connectDB()


// const AloowedOrigin = [
//     Config.ALLOWED_CLIENT_1, Config.AllowedClient2
// ]


// const app = express()
// const port = Config.PORT || 4000

// try {
// app.use(cors({
//     origin: function(origin , cb){
//         if(!origin || AloowedOrigin.includes(origin)){
//             cb(null , true)
//         }else{
//             cb(new Error("Not allowed by CORS"))
//         }
//     }, credentials:true
// }))


// // app.use(express.json())
// app.use(express.json({
//   verify: (req, res, buf) => {
//     // store raw body as string (exact bytes Razorpay sent)
//     req.rawBody = buf.toString('utf8');
//   }
// }));
// app.use(cookieParser(Config.Cookie_Secreate))

//   app.get("/",(req,res)=>{
//  return   res.json({Config})
//     // res.json({msg:"hello from mostorage app ✅✅  "})
//   })

// app.use("/directory",CheeckAuth, directoryRouter)
// app.use("/file",CheeckAuth, fileRouter)
// app.use("/user",userRouter )
// app.use("/drive", CheeckAuth,GoogleDriveRouter)
// // app.use("/razorpay",RazorpayRouter )
// // app.use("/GitWebhook", GitWebHookRouter)

// app.use((err, req, res, next) => {
//   console.error(err.stack); // log for debugging
//   res.status(err.status || 500).json({
//     error: err.message || "something went wrong intenal server error",
//   });
// });


// if(!process.env?.AWS_LAMBDA_FUNCTION_NAME){
//   app.listen(port, ()=>{
//     console.log("listing at port 4000")
// })
// }

// } catch (error) {
//     console.log("error can not connect to database", error)
// }

// export default app



