"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const worker_threads = tslib_1.__importStar(require("webworker-threads"));
const constants_1 = require("../constants");
const safeEval = require("safe-eval");
class EvalManager {
    static hasErrors(expression) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const isValid = yield this.evaluate(expression, {
                title: 'title',
                author: 'author',
                selftext: 'text'
            });
            if (isValid.valid) {
                return null;
            }
            else {
                if (isValid.timeout) {
                    return constants_1.ERROR_CODE.EVAL_TIMEOUT;
                }
                else {
                    return constants_1.ERROR_CODE.EVAL_ERROR;
                }
            }
        });
    }
    static evaluate(expression, subData) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let isValid = undefined;
            let result = null;
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
            }), (err, data) => {
                if (err) {
                    console.log({ err });
                }
                if (data === 'true' || data === 'false') {
                    result = data === 'true' ? true : false;
                    isValid = true;
                }
                completed = true;
            });
            yield new Promise((accept) => {
                const _timeout = setTimeout(() => {
                    _T.destroy();
                    console.log("Accepting 1");
                    clearTimeout(_timeout);
                    clearInterval(interval);
                    accept();
                }, 300);
                const interval = setInterval(() => {
                    if (completed) {
                        console.log("Accepting 2");
                        clearTimeout(_timeout);
                        clearInterval(interval);
                        accept();
                    }
                }, 5);
            });
            if (typeof result !== 'boolean') {
                return {
                    timeout: true,
                    valid: false
                };
            }
            else {
                if (isValid) {
                    return {
                        valid: true,
                        result
                    };
                }
                else {
                    return { valid: isValid };
                }
            }
        });
    }
}
exports.EvalManager = EvalManager;
