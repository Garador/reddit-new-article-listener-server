import * as worker_threads from 'webworker-threads';
import { ERROR_CODE } from '../constants';
import {IPostData} from '../constants/postData.interface';
const safeEval = require("safe-eval");

export class EvalManager {
    static async hasErrors(expression: string): Promise<ERROR_CODE> {
        const isValid = await this.evaluate(expression, <any>{
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
        const content = subData.selftext;

        const _expression = `((title, content, author)=>{
            ${expression}
        })(title, content, author)`;
        
        let completed = false;
        const _T = worker_threads.create()
        .eval(safeEval(_expression, {
            title, content, author
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
            const _timeout = setTimeout(()=>{
                _T.destroy();
                console.log("Accepting 1");
                clearTimeout(_timeout);
                clearInterval(interval);
                accept();
            }, 300);
            const interval = setInterval(()=>{
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