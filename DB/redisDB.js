import {createClient} from 'redis'
import { Config } from '../utils/Config/Config.js'

//const redisClient = createClient({password:Config.Redis_DB_Password})
const redisClient = createClient({
    url:Config.Redis_URL
})

export default redisClient

export const ConnectRedis = async()=>{
    try {
      const client = await redisClient.connect()
      return client
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