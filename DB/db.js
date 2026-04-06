import { MongoClient, ObjectId } from "mongodb"
import { Config } from "../utils/Config/Config.js"


export const client = new MongoClient()

export const connectDB= async ()=>{
    await client.connect(Config.MongoDB_URL)
 const db = client.db('Storage')
 return db
}

process.on("SIGINT" , async()=>{
    await client.close()
    console.log("db disconnected")
    process.exit()
})


// db.getCollectionInfos({name:"userDB"}).find({$nor:[{$jsonSchema:db.getCollectionInfos({name:"userDB"})[0].options.validator.$jsonSchema}]}