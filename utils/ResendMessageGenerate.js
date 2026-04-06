
//message for OTP while login
export const GenerateMessageForOTP = (otp)=>{
return    `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your One-Time Password (OTP)</title>
    <style>
        /* Ensure styles are inline for best email client compatibility */
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); }
        .header { text-align: center; margin-bottom: 20px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #007bff; background-color: #eaf4ff; padding: 15px 20px; border-radius: 5px; display: inline-block; margin: 15px 0; letter-spacing: 3px; }
        .security-note { font-size: 14px; color: #777; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="color: #333;">🔐 One-Time Verification Code</h2>
        </div>

        <p>Hi there,</p>

        <p>You requested a one-time password (OTP) to complete your login with StoreX.</p>
        
        <p style="text-align: center;">Use the following code to proceed:</p>

        <div style="text-align: center;">
            <span class="otp-code">
                ${otp}
            </span>
        </div>
        <p>This code is valid for **5 minutes**.</p>

        <p class="security-note">
            **Security Note:** Do not share this code with anyone, including our support staff. If you did not request this code, you can safely ignore this email.
        </p>
        
        <p style="margin-top: 30px;">Thanks,<br>
        The StoreX Team</p>
    </div>
</body>
</html>`
}