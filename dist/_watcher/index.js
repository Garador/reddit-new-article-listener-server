"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const request = tslib_1.__importStar(require("request-promise-native"));
const admin = tslib_1.__importStar(require("firebase-admin"));
const path = tslib_1.__importStar(require("path"));
const notificationSender_1 = require("./notificationSender");
const safeEval = require("safe-eval");
const INTERVAL = process.env.TIMER_INTERVAL ? parseInt(process.env.TIMER_INTERVAL) : 10000;
class NewPostWatcher {
    initializeFirebase() {
        var serviceAccount = require(path.resolve('keys/general-practice-444e5-firebase-adminsdk-dyl2r-64f8b2d95d.json'));
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
            let listeners = yield admin.firestore().collection('reddit_watchers').get();
            let result = {};
            for (let i = 0; i < listeners.docs.length; i++) {
                let posts = yield this._getRedditJsonPost(listeners.docs[i].id);
                let _related_user_listeners = listeners.docs[i].data().listeners;
                let _lastMatchIndex = {};
                posts.forEach(({ data }) => {
                    _related_user_listeners.forEach((_listenerData, index) => {
                        try {
                            let title = data.title + "";
                            let text = data.selftext + "";
                            let author = data.author + "";
                            let matches = safeEval(`
                        ((title, text, author)=>{
                            ${_listenerData.listener}
                        })(title, text, author)
                        `, {
                                title, text, author
                            });
                            if (matches) {
                                console.log({ 'result[_listenerData.UID] first: ': result[_listenerData.UID] });
                                if (!result[_listenerData.UID] || result[_listenerData.UID].length < 1) {
                                    result[_listenerData.UID] = [];
                                }
                                console.log({ 'result[_listenerData.UID] second: ': result[_listenerData.UID] });
                                if (data.created_utc > _listenerData.last_matched_post_created_utc) {
                                    result[_listenerData.UID].push(data);
                                    if (!_lastMatchIndex[index] || data.created_utc > _lastMatchIndex[index]) {
                                        _lastMatchIndex[index] = data.created_utc;
                                    }
                                }
                            }
                        }
                        catch (e) {
                        }
                    });
                });
                Object.keys(_lastMatchIndex)
                    .forEach((index) => {
                    _related_user_listeners[parseInt(index)].last_matched_post_created_utc = _lastMatchIndex[parseInt(index)];
                });
                listeners.docs[i].ref.update({
                    listeners: _related_user_listeners
                });
            }
            return result;
        });
    }
    notifyUser(userID, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let userAddress = (yield admin.firestore().doc(`reddit_watchers_adresses/${userID}`).get()).data();
            let notificationSender = new notificationSender_1.NotificationSender();
            let _htmlData = data.map((element) => {
                return `<b>${element.title}</b> (${element.subreddit}) (${element.url}) <br/><br/>`;
            }).join(`\n`) || "No HTML text appended";
            let _nonHTMLData = data.map((element) => {
                return `${element.title}`;
            }).join(`\n`) || "No plain text appended";
            notificationSender.sendEmail(userAddress.email, `You have ${data.length} posts that match your filters.`, _nonHTMLData, _htmlData);
        });
    }
    verifyNewPosts() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if ((global).verifying)
                return;
            console.log(`Verifying...`);
            (global).verifying = true;
            let result = yield this._getPosts();
            let _users = Object.keys(result);
            for (let i = 0; i < _users.length; i++) {
                if (result[_users[i]].length && result[_users[i]].length > 0) {
                    this.notifyUser(_users[i], result[_users[i]]);
                }
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
        }
        NewPostWatcher._timeout = setInterval(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.verifyNewPosts();
        }), INTERVAL);
    }
}
exports.NewPostWatcher = NewPostWatcher;
