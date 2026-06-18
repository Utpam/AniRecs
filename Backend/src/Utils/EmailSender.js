import sgMail from '@sendgrid/mail';
import { stringify } from 'querystring';


export const sendMail = (userEmail,{otp, username}) => {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
        to: String(userEmail), // Change to your recipient
        from: 'utpamchaki3090@gmail.com', // Change to your verified sender
        subject: `🌸 Your AniRecs Verification Code : ${otp}`,
        templateId: 'd-1a198431819d4d99a0023112ab4fb4d7',
        dynamic_template_data:{
            otp,
            name: username,
            expiry_minutes: 5
        }   
    }

    sgMail
    .send(msg)
    .then(() => {
        console.log('Email sent')
    })
    .catch((error) => {
        console.error("Error:", error)
      })
}

