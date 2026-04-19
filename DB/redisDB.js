import {createClient} from 'redis'
import { Config } from '../utils/Config/Config.js'


export const redisClient = createClient({
    url:Config.Redis_URL
})


redisClient.on("error", (err) => {
  console.log("Redis Client Error", err);
});


let cachedClient =  {conn:null , promise:null}
globalThis.redisCount  = 0

export const ConnectRedis = async()=>{
    if(cachedClient.conn) return cachedClient.conn
    try {
        console.log("redis functions")
     if(!cachedClient.promise){
         cachedClient.promise =  redisClient.connect()
     }

    cachedClient.conn = await cachedClient.promise 
     console.log("redis connected", {count:globalThis?.redisCount});
    } catch (error) {
        console.log("error while connecting to redis", error)
    }
}


process.on("SIGINT", async()=>{
    try {
        await redisClient.quit()
    } catch (error) {
        console.log("error while quit the redis client", error)
    }
})

