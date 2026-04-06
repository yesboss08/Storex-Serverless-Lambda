import express from 'express'
import { spawn } from "child_process";
import crypto from 'crypto'
import { Config } from '../utils/Config/Config.js';


const router = express.Router()

router.post("/", async (req, res, next) => {
  const gitSign = req.headers['x-hub-signature-256']
  if (!gitSign) return res.status(403).json({ err: "invalid sign" })

  const mySign = 'sha256=' + crypto.createHmac("sha256", Config.GIT_WEBHOOK_SCREATE).update(JSON.stringify(req.body)).digest("hex")

  if (mySign !== gitSign) return res.status(403).json({ err: "invalid git sign" })


  res.status(200).json({ err: "error while executing the bash file" })
  let childStream
  const repoName = req.body.repository.name

  //this is when the package.json file changed then only do npm i
  console.log({ispackage:req.body?.commits?.modified})
const needInstall = req.body?.commits?.some(commit =>
  commit.added.includes("package.json") ||
  commit.modified.includes("package.json") ||
  commit.removed.includes("package.json")
);
console.log(needInstall)

  if (repoName == "StoreX_Server_Backup") childStream = spawn(
    'bash',
    ['/home/ubuntu/StoreX_Bash.sh'],{
      env:{
        ...process.env , needInstall:needInstall
      }
    }
  )

  if (repoName == "StoreX_Client_Backup") childStream = spawn('bash', ["/home/ubuntu/Clinet_Bash.sh"])

  //  const childStream = spawn('bash', ["/c/Users/Backend\ NODE-JS/section-21/15_Automating_Deployments_with_Bash_Scripting/demo.sh"])

  childStream.stdout.on('data', data => {
    process.stdout.write(data); // mirror to terminal
  });

  childStream.on("close", code => {
    console.log({ code })
    if (code == 0) {
      console.log("process executed successfuly")
    } else {
      console.log("error while running the bash file")
    }
  })

  childStream.stderr.on("data", (chunk) => {
    process.stderr.write(chunk)
  })


  childStream.on("error", (err) => {
    console.log("error while spwanign the bash file")
  })


})

export default router