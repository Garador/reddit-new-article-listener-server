"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const request = tslib_1.__importStar(require("request-promise-native"));
const admin = tslib_1.__importStar(require("firebase-admin"));
const refs_1 = require("./refs");
const constants_1 = require("../constants");
const Utils_1 = require("../Utils");
const ListenerManager_1 = require("../managers/ListenerManager");
const _utils_1 = require("../_utils");
const EvalManager_1 = require("../managers/EvalManager");
const notificationSender_1 = require("./notificationSender");
const INTERVAL = process.env.TIMER_INTERVAL ? parseInt(process.env.TIMER_INTERVAL) : 10000;
class NewPostWatcher {
    initializeFirebase() {
        var serviceAccount = require('../../keys/general-practice-444e5-firebase-adminsdk-dyl2r-a0160fc787.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://general-practice-444e5.firebaseio.com"
        });
    }
    _getRedditJsonPost(subId, queryString = "") {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const baseUrl = `https://www.reddit.com/r/${subId}/new/.json`;
            var options = {
                uri: baseUrl + queryString,
            };
            const result = yield request.get(options);
            try {
                return JSON.parse(result)['data']['children'];
            }
            catch (e) {
                throw "ERROR PARSING POSTS";
            }
        });
    }
    _getPosts() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let subs = yield refs_1.Refs.subsCollectionRef.listDocuments();
            let result = {};
            let _lastPostAddedAt = yield Utils_1.getData(admin.database().ref(constants_1.path_lastPostAddedAt));
            let _lastListenerSetAt = yield Utils_1.getData(admin.database().ref(constants_1.path_lastListenerSetAt));
            for (let i = 0; i < subs.length; i++) {
                let posts = yield this._getRedditJsonPost(subs[i].id);
                if (posts[0].data.created_utc == _lastPostAddedAt[subs[i].id]) {
                    console.log(`Have not updated: ${subs[i].id}`);
                    continue;
                }
                else {
                    console.log(`Updating: ${subs[i].id}`);
                }
                let listeners = yield ListenerManager_1.ListenerManager.getListeners(subs[i].id);
                result[subs[i].id] = {
                    posts,
                    listeners
                };
            }
            return result;
        });
    }
    markLastFetchedAt(subId) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const data = (yield Utils_1.getData(admin.database().ref(constants_1.path_lastFetchedPosts))) || {};
            for (let i = 0; i < subId.length; i++) {
                data[subId[i]] = admin.database.ServerValue.TIMESTAMP;
            }
            yield admin.database().ref(constants_1.path_lastFetchedPosts).set(data);
        });
    }
    markLastPostAddedAt(posts) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const data = (yield Utils_1.getData(admin.database().ref(constants_1.path_lastPostAddedAt))) || {};
            let subId = Object.keys(posts);
            for (let i = 0; i < subId.length; i++) {
                data[subId[i]] = posts[subId[i]][0].data.created_utc;
            }
            yield admin.database().ref(constants_1.path_lastPostAddedAt).set(data);
        });
    }
    markListenerLastNotifiedAt(uid, listenerId, timestamp) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield admin.database().ref(constants_1.path_listenerLastNotifiedAtPrev(uid))
                .child(listenerId).set(timestamp);
        });
    }
    analizeListener(listener, posts) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const _lastNotifiedAtData = yield _utils_1.UtilsManager.getData(admin.database().ref(constants_1.path_listenerLastNotifiedAtPrev(listener.user)));
            const _lastNotifiedAt = _lastNotifiedAtData[listener.id + ""] || 0;
            let _latestNotifiedAt = 0;
            let _matchedPosts = [];
            for (let i = 0; i < posts.length; i++) {
                if (posts[i].created_utc > _lastNotifiedAt) {
                    let evalResult = yield EvalManager_1.EvalManager.evaluate(listener.eval_function, posts[i]);
                    if (evalResult.valid && evalResult.result) {
                        _matchedPosts.push(posts[i]);
                        console.log(`Matched ${i} post: `, {
                            listener, post: posts[i].title
                        });
                    }
                    else {
                        console.log(`Did not match ${i} post: `, {
                            listener, post: posts[i].title
                        });
                    }
                    if (posts[i].created_utc > _latestNotifiedAt) {
                        _latestNotifiedAt = posts[i].created_utc;
                    }
                }
            }
            let address = (yield admin.firestore().doc(constants_1.path_userContacts(listener.user)).get()).data();
            let _notifications = {
                contact: address,
                posts: _matchedPosts,
                lastTimeNotified: _latestNotifiedAt ? _latestNotifiedAt : _lastNotifiedAt
            };
            return _notifications;
        });
    }
    getStoredSubPosts(subId) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let posts = yield _utils_1.UtilsManager.getData(admin.database().ref(`${constants_1.path_redditPostCheckData}/${subId}/posts`));
            let _posts = [];
            if (!posts) {
                return [];
            }
            Object.keys(posts).forEach((index) => {
                _posts[parseInt(index)] = posts[index].data;
            });
            return _posts;
        });
    }
    getSubNotifications(subId) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let posts = yield this.getStoredSubPosts(subId);
            let listeners = yield ListenerManager_1.ListenerManager.getListeners(subId);
            let listener;
            let notifications = [];
            for (let i = 0; i < listeners.length; i++) {
                listener = listeners[i];
                let _result = yield this.analizeListener(listener, posts);
                if (_result.posts && _result.posts.length) {
                    notifications.push(_result);
                    yield this.markListenerLastNotifiedAt(listener.user, listener.id + "", _result.lastTimeNotified);
                }
            }
            return notifications;
        });
    }
    setOnNotfQueue(_notfs, subId) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let _obj = {};
            for (let i = 0; i < _notfs.length; i++) {
                if (_notfs[i].posts.length > 0) {
                    _obj[_utils_1.UtilsManager.randomID] = _notfs[i];
                }
            }
            yield admin.database().ref(constants_1.path_notificationsQueue).update(_obj);
        });
    }
    saveNewPosts() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if ((global).verifying)
                return;
            (global).verifying = true;
            let result = yield this._getPosts();
            console.log("saveNewPosts #1");
            let existingData = yield _utils_1.UtilsManager.getData(admin.database().ref(`${constants_1.path_redditPostCheckData}`));
            console.log("saveNewPosts #2");
            let _existing = !!existingData;
            if (!_existing) {
                existingData = {};
            }
            if (result) {
                Object.assign(existingData, result ? result : {});
            }
            if (_existing) {
                yield admin.database().ref(constants_1.path_redditPostCheckData).update(existingData);
            }
            else {
                yield admin.database().ref(constants_1.path_redditPostCheckData).set(existingData);
            }
            console.log("saveNewPosts #3");
            yield this.markLastFetchedAt(Object.keys(result));
            let _markLastCreatedAt = {};
            Object.keys(result).forEach((key) => {
                _markLastCreatedAt[key] = result[key].posts;
            });
            yield this.markLastPostAddedAt(_markLastCreatedAt);
            console.log("saveNewPosts #4");
            let notfs = {};
            for (let i = 0; i < Object.keys(result).length; i++) {
                notfs[Object.keys(result)[i]] = yield this.getSubNotifications(Object.keys(result)[i]);
            }
            for (let i = 0; i < Object.keys(notfs).length; i++) {
                let key = Object.keys(notfs)[i];
                this.setOnNotfQueue(notfs[key], key);
            }
            (global).verifying = false;
        });
    }
    init() {
        if (NewPostWatcher._timeout) {
            clearInterval(NewPostWatcher._timeout);
        }
        else {
            this.initializeFirebase();
            this.saveNewPosts();
            notificationSender_1.NotificationSender.instance.listenNotificationsQueue();
        }
        NewPostWatcher._timeout = setInterval(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.saveNewPosts();
        }), INTERVAL);
    }
}
exports.NewPostWatcher = NewPostWatcher;
