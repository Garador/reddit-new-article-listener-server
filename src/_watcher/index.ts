import * as request from "request-promise-native";
import * as admin from 'firebase-admin';
import * as path from 'path';
import { IResultChildren, IListener, IPostData, IUserAddress } from '../constants/postData.interface';
import { Refs } from './refs';
import { path_redditPostCheckData, path_lastFetchedPosts, path_lastPostAddedAt, path_lastListenerSetAt, IUserContact, path_userContacts, path_listenerLastNotifiedAtPrev, path_listenerLastNotifiedAt, path_notificationsQueue } from '../constants';
import { getData } from '../Utils';
import { ListenerManager } from '../managers/ListenerManager';
import { UtilsManager } from '../_utils';
import { EvalManager } from '../managers/EvalManager';
import { NotificationSender } from './notificationSender';
const INTERVAL = process.env.TIMER_INTERVAL ? parseInt(process.env.TIMER_INTERVAL) : 10000;
import fbkey from '../../keys/general-practice-444e5-firebase-adminsdk-dyl2r-a0160fc787.json';

export class NewPostWatcher {
    private static _timeout:NodeJS.Timeout;

    initializeFirebase(){
        admin.initializeApp({
            credential: admin.credential.cert(<any>fbkey),
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
        let subs = await Refs.subsCollectionRef.listDocuments();
        let result:{
            [index:string]:{
                posts:IResultChildren[],
                listeners: IListener[]
            }
        } = {};
        let _lastPostAddedAt:{[index:string]:number} = await getData(admin.database().ref(path_lastPostAddedAt));
        let _lastListenerSetAt:{[index:string]:number} = await getData(admin.database().ref(path_lastListenerSetAt));

        for(let i=0;i<subs.length;i++){
            let posts = await this._getRedditJsonPost(subs[i].id);
            if(posts[0].data.created_utc == _lastPostAddedAt[subs[i].id]){
                console.log(`Have not updated: ${subs[i].id}`);
                continue;
            }else{
                console.log(`Updating: ${subs[i].id}`);
            }
            let listeners = await ListenerManager.getListeners(subs[i].id);
            result[subs[i].id] = {
                posts,
                listeners
            };
        }
        return result;
    }

    async markLastFetchedAt(subId:string[]){
        const data:any = (await getData(admin.database().ref(path_lastFetchedPosts))) || {};
        for(let i=0;i<subId.length;i++){
            data[subId[i]] = admin.database.ServerValue.TIMESTAMP;
        }
        await admin.database().ref(path_lastFetchedPosts).set(data);
    }

    async markLastPostAddedAt(posts:{[index:string]:IResultChildren[]}){
        const data:any = (await getData(admin.database().ref(path_lastPostAddedAt))) || {};
        let subId = Object.keys(posts);
        for(let i=0;i<subId.length;i++){
            data[subId[i]] = posts[subId[i]][0].data.created_utc;
        }
        await admin.database().ref(path_lastPostAddedAt).set(data);
    }

    async markListenerLastNotifiedAt(uid:string, listenerId:string, timestamp:number){
        await admin.database().ref(path_listenerLastNotifiedAtPrev(uid))
        .child(listenerId).set(timestamp);
    }

    async analizeListener(listener:IListener, posts:IPostData[]){
        const _lastNotifiedAtData:{
            [index:string]:number
        } = await UtilsManager.getData(admin.database().ref(path_listenerLastNotifiedAtPrev(listener.user)));
        const _lastNotifiedAt = _lastNotifiedAtData[listener.id+""] || 0;
        let _latestNotifiedAt:number = 0;
        let _matchedPosts:IPostData[] = [];
        for(let i=0;i<posts.length;i++){
            if(posts[i].created_utc > _lastNotifiedAt){
                let evalResult = await EvalManager.evaluate(listener.eval_function, posts[i]);
                if(evalResult.valid && evalResult.result){
                    _matchedPosts.push(posts[i]);
                    console.log(`Matched ${i} post: `,{
                        listener, post: posts[i].title
                    });
                }else{
                    console.log(`Did not match ${i} post: `,{
                        listener, post: posts[i].title
                    });
                }
                if(posts[i].created_utc > _latestNotifiedAt){
                    _latestNotifiedAt = posts[i].created_utc;
                }
            }
        }
        let address:IUserContact = <IUserContact>(await admin.firestore().doc(path_userContacts(listener.user)).get()).data();
        let _notifications:{
            contact: IUserContact,
            posts: IPostData[],
            lastTimeNotified: number
        } = {
            contact:address,
            posts: _matchedPosts,
            lastTimeNotified: _latestNotifiedAt ? _latestNotifiedAt : _lastNotifiedAt
        };
        return _notifications;
    }

    async getStoredSubPosts(subId:string){
        let posts:{[
            index:string
        ]:IResultChildren} = await UtilsManager.getData(admin.database().ref(`${path_redditPostCheckData}/${subId}/posts`));
        let _posts:IPostData[] = [];
        if(!posts){
            return [];
        }
        Object.keys(posts).forEach((index:string)=>{
            _posts[parseInt(index)] = posts[index].data;
        })
        return _posts;
    }

    async getSubNotifications(subId:string){
        let posts = await this.getStoredSubPosts(subId);
        let listeners = await ListenerManager.getListeners(subId);
        let listener:IListener;
        let notifications:{
            contact: IUserContact;
            posts: IPostData[];
            lastTimeNotified: number;
        }[] = [];
        for(let i=0;i<listeners.length;i++){
            listener = listeners[i];
            let _result = await this.analizeListener(listener, posts);
            if(_result.posts && _result.posts.length){
                notifications.push(_result);
                await this.markListenerLastNotifiedAt(listener.user, listener.id+"", _result.lastTimeNotified);
            }
        }
        return notifications;
    }

    async setOnNotfQueue(_notfs:{ contact: IUserAddress,
    posts: IPostData[],
    lastTimeNotified: number }[], subId:string){
        let _obj:{
            [index:string]:{ contact: IUserAddress,
                posts: IPostData[],
                lastTimeNotified: number }
        } = {};
        for(let i=0;i<_notfs.length;i++){
            if(_notfs[i].posts.length>0){
                _obj[UtilsManager.randomID] = _notfs[i];
            }
        }
        await admin.database().ref(path_notificationsQueue).update(_obj);
    }

    async saveNewPosts(){
        if((<any>(global)).verifying) return;
        (<any>(global)).verifying = true;
        let result = await this._getPosts();
        console.log("saveNewPosts #1");
        let existingData:{
            [index:string]:{
                posts:IPostData[]
            }
        } = await UtilsManager.getData(admin.database().ref(`${path_redditPostCheckData}`));
        console.log("saveNewPosts #2");
        let _existing = !!existingData;
        if(!_existing){
            existingData = {};
        }
        if(result){
            Object.assign(existingData, result ? result : {});
        }
        if(_existing){
            await admin.database().ref(path_redditPostCheckData).update(existingData);
        }else{
            await admin.database().ref(path_redditPostCheckData).set(existingData);
        }
        console.log("saveNewPosts #3");
        await this.markLastFetchedAt(Object.keys(result));
        let _markLastCreatedAt:{[index:string]:IResultChildren[]} = {};
        Object.keys(result).forEach((key)=>{
            _markLastCreatedAt[key] = result[key].posts;
        });
        //TODO: Mark for checking on posts add.
        await this.markLastPostAddedAt(_markLastCreatedAt);
        console.log("saveNewPosts #4");
        let notfs:{
            [index:string]:{
                contact: IUserContact;
                posts: IPostData[];
                lastTimeNotified: number;
            }[]
        } = {};
        for(let i=0;i<Object.keys(result).length;i++){
            notfs[Object.keys(result)[i]] = await this.getSubNotifications(Object.keys(result)[i]);
        }
        for(let i=0;i<Object.keys(notfs).length;i++){
            let key = Object.keys(notfs)[i];
            this.setOnNotfQueue(notfs[key], key);
        }
        (<any>(global)).verifying = false;
    }

    init(){
        if(NewPostWatcher._timeout){
            clearInterval(NewPostWatcher._timeout);
        }else{
            this.initializeFirebase();
            this.saveNewPosts();
            NotificationSender.instance.listenNotificationsQueue();
        }
        NewPostWatcher._timeout = setInterval(async ()=>{
            this.saveNewPosts();
        }, INTERVAL);
    }
}