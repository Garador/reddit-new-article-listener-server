"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const refs_1 = require("../_watcher/refs");
class ListenerManager {
    static getListeners(sub) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return (yield refs_1.Refs.getSubListenersRef(sub).get()).docs.map((data) => {
                return Object.assign(Object.assign({}, data.data()), { id: data.id });
            });
        });
    }
}
exports.ListenerManager = ListenerManager;
//# sourceMappingURL=ListenerManager.js.map