import { createClient } from "redis";
import { Config } from "../utils/Config/config";

const redisClient = createClient({
  password: Config.Redis_DB_Password,
});

try {
  await redisClient.connect();
  try {
    await redisClient.ft.info("uidIndex");
    console.log("index already exist");
  } catch (error) {
    await redisClient.ft.create(
      "uidIndex",
      { "$.userId": { type: "TAG", AS: "userId" } },
      {
        ON: "JSON",
        PREFIX: "session:",
      }
    );
    console.log("new index created");
  } finally {
    await redisClient.quit();
    process.exit();
  }
} catch (error) {
  console.log("error while connect to redis db", error);
}
