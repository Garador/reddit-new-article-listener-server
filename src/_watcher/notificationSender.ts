const SENDGRID_KEY = process.env.SENDGRID_KEY;
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(SENDGRID_KEY);

export class NotificationSender {
    async notify(){

    }

    async sendEmail(address:string, subject: string, text: string, html?:string){
        const msg = {
          to: address,
          from: 'reddit-new-listener@indevelopment.com',
          subject,
          text,
          html: html ? html : text,
        };
        console.log({msg});
        try{
            await sgMail.send(msg);
        }catch(e){
            console.log({e: JSON.stringify(e.response.body)});
        }
    }
}

