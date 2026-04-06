import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({region:'ap-south-1'})

const command = new GetSecretValueCommand(
    {SecretId:'arn:aws:secretsmanager:ap-south-1:133014338522:secret:mysecret-sKVLmW'}
)

const response = await client.send(command)
const secretString = response.SecretString
const secrets = JSON.parse(secretString)
console.log(secrets)