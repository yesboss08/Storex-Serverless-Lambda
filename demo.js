// import crypto from 'crypto'
// import { validatePaymentVerification} from "razorpay/dist/utils/razorpay-utils.js"
// const secreate ="5OndELRhmpTtPbBExeD3vtSo"

// const rezSigneture ='e4fef8f6c8b6584e3772032ee1c06a68714a28e72de5ffc0f8d2747470f1e9d9'

// // const verify =({razorpay_payment_id , razorpay_subscription_id})=>{
// //    const payload =`${razorpay_subscription_id}|${razorpay_payment_id}`
// // const mySign = crypto.createHmac("sha256",secreate).update(payload,"utf-8").digest("hex")
// //     console.log(mySign)
// // }

// //verify({razorpay_payment_id:'pay_Re2IaeQ4zWeaSr',razorpay_subscription_id:"sub_Re2Hkw6PWwX6HS"})


// const yo = validatePaymentVerification({subscription_id:'sub_Re2Hkw6PWwX6HS',payment_id:'pay_Re2IaeQ4zWeaSr'},rezSigneture,secreate)
// console.log(yo)


// import { MongoClient, ObjectId } from "mongodb"

 
// console.log(Config.MongoDB_URL)
// export const client = new MongoClient(Config.MongoDB_URL)

// export const connectDB = async () => {
//   await client.connect()

//   const db = client.db('Storage')
//   const user = db.collection('userDB')

//   const data = await user.find({}).toArray()
//   console.log(data)

//   await client.close()
// }

// ;(async () => {
//   await connectDB()
// })()



// import redisClient ,{ ConnectRedis } from "./DB/redisDB.js"

// try {
// await ConnectRedis()
// const userSession={name:"bossis", email:"boss@gmail.com", userId:"12345678"}
// await redisClient.json.set(`session:1234:5678`, "$" , userSession )
// console.log("done")
// } catch (error) {
//     console.log(error)
// }

// const sid ='YzI0ODlmNjZiZTBhY2JhNzJjYzhhM2FkZDg2YmNlZDc'
// const sid2 ='MGFmNDIwMmJjOTA4YjMwMThkYmQxOWU5YjQ4OWQ2NzA'
// const json = Buffer.from(sid, "base64").toString("utf-8")
//         console.log(json)


//TEST: for child spawn executing the bash file
 import {spawn} from "child_process"
 import process from "process"

const a =[1,2,3]

const MODE = a.includes(2)

const childStream = spawn('bash', ["bash.sh"],{
     env: {
    ...process.env,
    MODE: MODE
  }
})


childStream.stdout.on('data', data => {
  process.stdout.write(data); // mirror to terminal
});

childStream.on("close", code =>{
     console.log({code})
    if(code==0){
        console.log("process executed successfuly")
    }else{
        console.log("error while running the bash file")
    }
})

childStream.stderr.on("data",(chunk)=>{
    process.stderr.write(chunk)
})


childStream.on("error" , (err)=>{
    console.log("error while spwanign the bash file")
})
