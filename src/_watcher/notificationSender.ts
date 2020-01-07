import * as admin from 'firebase-admin';
import { path_notificationsQueue } from 'src/constants';
import { INotificationData, IPostData } from 'src/constants/postData.interface';

const SENDGRID_KEY = process.env.SENDGRID_KEY;
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(SENDGRID_KEY);

export class NotificationSender {

    private static _instance:NotificationSender;

    static get instance(){
        this._instance = this._instance ? this._instance : new NotificationSender();
        return this._instance;
    }

    async sendEmail(address:string, subject: string, text: string, html?:string){
        const msg = {
          to: address,
          from: 'reddit-new-listener@indevelopment.com',
          subject,
          text,
          html: html ? html : text,
        };
        //console.log('Sending message: ',{msg});
        try{
            await sgMail.send(msg);
        }catch(e){
            console.log({e: JSON.stringify(e.response.body)});
        }
    }

    assembleEmailBody(_posts:IPostData[]){
        return {
            title: `You have ${_posts.length} posts that match your criteria! (/r/${_posts[0].subreddit_id})`,
            html: `
                You have ${_posts.length} posts that match your criteria!<br/>
                ${
                    (()=>_posts.map((data)=>{
                        return `
                            <b>${data.title}</b> (${data.url})
                        `.trim();
                    }).join("<br/>"))()
                }`.trim(),
            text: `
                You have ${_posts.length} posts that match your criteria!<br/>
                ${
                    (()=>_posts.map((data)=>{
                        return `
                            <b>${data.title}</b> (${data.url})
                        `.trim();
                    }).join("<br/>"))()
                }`.trim()
        }
    }

    listenNotificationsQueue(){
        admin.database().ref(path_notificationsQueue).on('child_added', (data)=>{
            if(data != null){
                let payload = <INotificationData>data.toJSON();
                let _posts:IPostData[] = [];
                if(payload.posts){
                    Object.keys(payload.posts).forEach((index)=>{
                        _posts[parseInt(index)] = payload.posts[index];
                    });
                }
                if(_posts.length>0){
                    let {title, html, text} = this.assembleEmailBody(_posts);
                    let address = payload.contact.email;
                    this.sendEmail(address, title, text, html);
                    admin.database().ref(data.ref).remove();
                }
            }
        });
    }
}

