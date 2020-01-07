import * as admin from 'firebase-admin';
import { path_redditSubs } from '../constants';


export class Refs {
    static get subsCollectionRef(){
        return admin.firestore().collection(path_redditSubs);
    }

    static getSubRef(subId:string){
        return this.subsCollectionRef.doc(subId);
    }

    static getSubListenersRef(subId:string){
        return this.getSubRef(subId).collection('listeners');
    }

}