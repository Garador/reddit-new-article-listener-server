import * as admin from 'firebase-admin';
import { path_notificationsQueue } from '../constants';
import { INotificationData, IPostData } from '../constants/postData.interface';
import * as moment from 'moment-timezone';

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
            title: `You have ${_posts.length} posts that match your criteria! (/r/${_posts[0].subreddit})`,
            html: `
                You have ${_posts.length} posts that match your criteria!<br/>
                ${
                    (()=>_posts.map((data)=>{
                        let _date = moment.utc(new Date(data.created_utc*1000)).tz('America/Caracas').format("HH:mm:ss z")
                        return `
                            <b><h3>${data.title}</h3></b>(${_date}) (${data.url})
                            <br/>
                            ${data.selftext_html}
                        `.trim();
                    }).join("<br/><br/><hr/>"))()
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

