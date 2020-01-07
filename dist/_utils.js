"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
class UtilsManager {
    static get randomID() {
        return Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
    }
    static getData(ref) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const data = yield new Promise((accept) => {
                ref.on('value', (foundData) => {
                    accept(foundData ? foundData.toJSON() : {});
                });
            });
            return data;
        });
    }
}
exports.UtilsManager = UtilsManager;
//# sourceMappingURL=_utils.js.map