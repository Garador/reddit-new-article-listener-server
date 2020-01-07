import * as worker_threads from 'webworker-threads';
import { ERROR_CODE, IRedditSubListener } from '../constants';
import {IPostData} from '../constants/postData.interface';
import { PostManager } from './PostManager';
const safeEval = require("safe-eval");

export class EvalManager {
    static async hasErrors(expression: string): Promise<ERROR_CODE> {
        let isValid = await this.evaluate(expression, <any>{
            title:'title',
            author:'author',
            selftext:'text'
        });
        if(isValid.valid){
            return <any>null;
        }else{
            if(isValid.timeout){
                return ERROR_CODE.EVAL_TIMEOUT;
            }else{
                return ERROR_CODE.EVAL_ERROR;

            }
        }
    }

    static async evaluate(expression: string, subData:IPostData):Promise<{timeout?:boolean, valid:boolean, result?:boolean}>{
        let isValid:any = undefined;
        let result:boolean = <any>null;
        const title = subData.title;
        const author = subData.author;
        const text = subData.selftext;

        const _expression = `((title, text, author)=>{
            ${expression}
        })(title, text, author)`;
        
        let completed = false;
        const _T = worker_threads.create()
        .eval(safeEval(_expression, {
            title, text, author
        }), (err, data:'true'|'false')=>{
            if(err){
                console.log({err});
            }
            if(data === 'true' || data === 'false'){
                result = data === 'true' ? true : false;
                isValid = true;
            }
            completed = true;
        });
        await new Promise((accept)=>{
            let _timeout = setTimeout(()=>{
                _T.destroy();
                console.log("Accepting 1");
                clearTimeout(_timeout);
                clearInterval(interval);
                accept();
            }, 300);
            let interval = setInterval(()=>{
                if(completed){
                    console.log("Accepting 2");
                    clearTimeout(_timeout);
                    clearInterval(interval);
                    accept();
                }
            }, 5);
        });
        if(typeof result !== 'boolean'){
            return {
                timeout: true,
                valid: false
            }
        }else{
            if(isValid){
                return {
                    valid: true,
                    result
                }
            }else{
                return {valid: isValid};
            }
        }
    }
}