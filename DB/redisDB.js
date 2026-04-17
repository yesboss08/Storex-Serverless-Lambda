import {createClient} from 'redis'
import { Config } from '../utils/Config/Config.js'


//const redisClient = createClient({password:Config.Redis_DB_Password})
const redisClient = createClient({
    url:Config.Redis_URL
})
export default redisClient

let cachedClient =  {conn:null , promise:null}
let count = 1

export const ConnectRedis = async()=>{
    if(cachedClient.conn) return cachedClient.conn
    try {
        console.log("redis functions")
     if(!cachedClient.promise){
        count+=1
        console.log("connecting to redis",{count})
         cachedClient.promise =  redisClient.connect()
     }

    cachedClient.conn = await cachedClient.promise 
    } catch (error) {
        console.log("error while connecting to redis", error)
    }
}




// process.on("SIGINT", async()=>{
//     try {
//         await redisClient.quit()
//     } catch (error) {
//         console.log("error while quit the redis client", error)
//     }
// })