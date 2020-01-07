"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const admin = tslib_1.__importStar(require("firebase-admin"));
const constants_1 = require("../constants");
class Refs {
    static get subsCollectionRef() {
        return admin.firestore().collection(constants_1.path_redditSubs);
    }
    static getSubRef(subId) {
        return this.subsCollectionRef.doc(subId);
    }
    static getSubListenersRef(subId) {
        return this.getSubRef(subId).collection('listeners');
    }
}
exports.Refs = Refs;
