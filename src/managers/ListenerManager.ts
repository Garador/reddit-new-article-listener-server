import { IListener } from 'src/constants/postData.interface';
import { Refs } from 'src/_watcher/refs';

export class ListenerManager {

    static async getListeners(sub:string){
        return <IListener[]>(await Refs.getSubListenersRef(sub).get()).docs.map((data)=>{
            return {...data.data(), id: data.id};
        });
    }
}