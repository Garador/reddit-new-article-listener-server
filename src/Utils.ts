import * as admin from 'firebase-admin';

export async function getData<T>(ref:admin.database.Reference):Promise<T>{
    let data = await new Promise((accept)=>{
        ref.on('value', (data)=>{
            accept(data ? data.toJSON() : {});
        });
    });
    return <T>data;
}