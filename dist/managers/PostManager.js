"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const admin = tslib_1.__importStar(require("firebase-admin"));
const constants_1 = require("../constants");
const _utils_1 = require("../_utils");
class PostManager {
    static getStoredPosts(subId) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const data = yield _utils_1.UtilsManager.getData(admin.database().ref(`${constants_1.path_redditPostCheckData}/${subId}/posts`));
            return data;
        });
    }
    static getStorePostsData() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const data = yield _utils_1.UtilsManager.getData(admin.database().ref(`${constants_1.path_redditPostCheckData}`));
            return data;
        });
    }
}
exports.PostManager = PostManager;
//# sourceMappingURL=PostManager.js.map