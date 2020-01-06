import * as request from "request-promise-native";
import * as admin from 'firebase-admin';
import * as path from 'path';
import { IResultChildren, IListener } from './postData.interface';
import { Refs } from './refs';
import { path_redditPostCheckData, path_lastFetchedPosts, path_lastPostAddedAt, path_lastListenerSetAt } from 'src/constants';
import { getData } from 'src/Utils';
const INTERVAL = process.env.TIMER_INTERVAL ? parseInt(process.env.TIMER_INTERVAL) : 10000;

export class NewPostWatcher {
    private static _timeout:NodeJS.Timeout;

    initializeFirebase(){
        var serviceAccount = require(path.resolve('keys/general-practice-444e5-firebase-adminsdk-dyl2r-a0160fc787.json'));
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
            let listeners = <IListener[]>(await Refs.getSubListenersRef(subs[i].id).get()).docs.map((data)=>{
                return data.data();
            });
            result[subs[i].id] = {
                posts,
                listeners
            };
        }
        return result;
    }

    async markLastFetchedAt(subId:string[]){
        const data:any = await new Promise((accept)=>{
            admin.database().ref(path_lastFetchedPosts)
            .on('value', (data)=>{
                accept(data ? data.toJSON() ? data.toJSON() : {} : {});
            })
        });
        for(let i=0;i<subId.length;i++){
            data[subId[i]] = admin.database.ServerValue.TIMESTAMP;
        }
        await admin.database().ref(path_lastFetchedPosts).set(data);
    }

    async markLastPostAddedAt(posts:{[index:string]:IResultChildren[]}){
        const data:any = await new Promise((accept)=>{
            admin.database().ref(path_lastPostAddedAt)
            .on('value', (data)=>{
                accept(data ? data.toJSON() ? data.toJSON() : {} : {});
            });
        });
        let subId = Object.keys(posts);
        for(let i=0;i<subId.length;i++){
            data[subId[i]] = posts[subId[i]][0].data.created_utc;
        }
        await admin.database().ref(path_lastPostAddedAt).set(data);
    }

    async saveNewPosts(){
        if((<any>(global)).verifying) return;
        (<any>(global)).verifying = true;
        let result = await this._getPosts();
        await admin.database().ref(path_redditPostCheckData).set(result);
        await this.markLastFetchedAt(Object.keys(result));
        let _markLastCreatedAt:{[index:string]:IResultChildren[]} = {};
        Object.keys(result).forEach((key)=>{
            _markLastCreatedAt[key] = result[key].posts;
        });
        await this.markLastPostAddedAt(_markLastCreatedAt);
        (<any>(global)).verifying = false;
    }

    init(){
        if(NewPostWatcher._timeout){
            clearInterval(NewPostWatcher._timeout);
        }else{
            this.initializeFirebase();
            this.saveNewPosts();
        }
        NewPostWatcher._timeout = setInterval(async ()=>{
            this.saveNewPosts();
        }, INTERVAL);
    }
}