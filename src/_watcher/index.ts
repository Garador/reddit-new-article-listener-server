import * as request from "request-promise-native";
import * as admin from 'firebase-admin';
import * as path from 'path';
import { IResultChildren, IListener, IPostData, IUserAddress } from './postData.interface';
import { NotificationSender } from './notificationSender';
const safeEval = require("safe-eval");


const INTERVAL = process.env.TIMER_INTERVAL ? parseInt(process.env.TIMER_INTERVAL) : 10000;
export class NewPostWatcher {
    private static _timeout:NodeJS.Timeout;

    initializeFirebase(){
        var serviceAccount = require(path.resolve('keys/general-practice-444e5-firebase-adminsdk-dyl2r-64f8b2d95d.json'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://general-practice-444e5.firebaseio.com"
        });
    }

    private async _getRedditJsonPost(subId:string, queryString:string = ""):Promise<IResultChildren[]>{
        const baseUrl = `https://www.reddit.com/r/${subId}/new/.json`;
        var options = {
            uri: baseUrl + queryString,
        };
      
        const result = await request.get(options);
        try{
            return JSON.parse(result)['data']['children'];
        }catch(e){
            throw "ERROR PARSING POSTS";
        }
    }

    private async _getPosts(){
        //console.log("_getPosts -- 1");
        let listeners = await admin.firestore().collection('reddit_watchers').get();
        let result:{[index:string]:IPostData[]} = {};
        //console.log({'listeners.docs':listeners.docs.length});
        for(let i=0;i<listeners.docs.length;i++){
            let posts = await this._getRedditJsonPost(listeners.docs[i].id);
            //console.log("_getPosts -- 2");
            let _related_user_listeners = <IListener[]> listeners.docs[i].data().listeners;
            let _lastMatchIndex:{[index:number]:number} = {};
            posts.forEach(({data})=>{
                //console.log("_getPosts -- 3");
                _related_user_listeners.forEach((_listenerData, index:number)=>{
                    //console.log("_getPosts -- 4");
                    try{
                        let title = data.title+"";
                        let text = data.selftext+"";
                        let author = data.author+"";
                        let matches =  safeEval(`
                        ((title, text, author)=>{
                            ${_listenerData.listener}
                        })(title, text, author)
                        `, {
                            title, text, author
                        });
                        if(matches){
                            console.log({'result[_listenerData.UID] first: ':result[_listenerData.UID]});
                            if(!result[_listenerData.UID] || result[_listenerData.UID].length < 1){
                                result[_listenerData.UID] = [];
                            }
                            console.log({'result[_listenerData.UID] second: ':result[_listenerData.UID]});
                            if(data.created_utc > _listenerData.last_matched_post_created_utc){
                                result[_listenerData.UID].push(data);
                                //_related_user_listeners[index].last_matched_post_created_utc = data.created_utc;
                                if(!_lastMatchIndex[index] || data.created_utc > _lastMatchIndex[index]){
                                    _lastMatchIndex[index] = data.created_utc;
                                }
                            }
                            //console.log({'result[_listenerData.UID] third: ':result[_listenerData.UID]});
                        }
                    }catch(e){
                        //console.log("_getPosts -- 5");
                        //console.log({e});
                    }
                });
            });
            Object.keys(_lastMatchIndex)
            .forEach((index)=>{
                _related_user_listeners[parseInt(index)].last_matched_post_created_utc = _lastMatchIndex[parseInt(index)];
            });
            listeners.docs[i].ref.update({
                listeners: _related_user_listeners
            });
        }
        return result;
    }

    async notifyUser(userID:string, data:IPostData[]){
        let userAddress:IUserAddress = <IUserAddress>(await admin.firestore().doc(`reddit_watchers_adresses/${userID}`).get()).data();
        let notificationSender = new NotificationSender();
        let _htmlData = data.map((element)=>{
            //return `<br/><a href="${element.url}>${element.title}</a>"`;
            return `<b>${element.title}</b> (${element.subreddit}) (${element.url}) <br/><br/>`;
        }).join(`\n`) || "No HTML text appended";
        let _nonHTMLData = data.map((element)=>{
            return `${element.title}`;
        }).join(`\n`) || "No plain text appended";
        notificationSender.sendEmail(userAddress.email, `You have ${data.length} posts that match your filters.`, _nonHTMLData, _htmlData);
    }

    async verifyNewPosts(){
        if((<any>(global)).verifying) return;
        console.log(`Verifying...`);
        (<any>(global)).verifying = true;
        let result = await this._getPosts();
        let _users = Object.keys(result);
        for(let i=0;i<_users.length;i++){
            if(result[_users[i]].length && result[_users[i]].length > 0){
                this.notifyUser(_users[i], result[_users[i]]);
            }
        }

        (<any>(global)).verifying = false;
    }

    init(){
        if(NewPostWatcher._timeout){
            clearInterval(NewPostWatcher._timeout);
        }else{
            this.initializeFirebase();
        }
        NewPostWatcher._timeout = setInterval(async ()=>{
            this.verifyNewPosts();
        }, INTERVAL);
    }
}