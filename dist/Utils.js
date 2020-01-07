"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
function getData(ref) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let data = yield new Promise((accept) => {
            ref.on('value', (data) => {
                accept(data ? data.toJSON() : {});
            });
        });
        return data;
    });
}
exports.getData = getData;
