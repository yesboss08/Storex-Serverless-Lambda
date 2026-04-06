import { Resend } from 'resend';
import { Config } from './Config/Config.js';

const resend = new Resend(Config.Resend_Api_Key);

export const VarificationEmail = async ({userEmail, message, subject})=>{
   
    const result = await resend.emails.send({
        from: 'moStorage.cloud <otp@brawlingcoder.shop>',
        to: [userEmail],
        subject: `${subject}`,
        html: `${message}`,
      })
      if(result.error)  return  false
       return result.data
}
