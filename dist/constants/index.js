"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var REQUEST_STATUS;
(function (REQUEST_STATUS) {
    REQUEST_STATUS[REQUEST_STATUS["PENDING"] = 0] = "PENDING";
    REQUEST_STATUS[REQUEST_STATUS["PROCESSED"] = 1] = "PROCESSED";
    REQUEST_STATUS[REQUEST_STATUS["ERROR"] = 2] = "ERROR";
})(REQUEST_STATUS = exports.REQUEST_STATUS || (exports.REQUEST_STATUS = {}));
var ERROR_CODE;
(function (ERROR_CODE) {
    ERROR_CODE[ERROR_CODE["EVAL_TIMEOUT"] = 1] = "EVAL_TIMEOUT";
    ERROR_CODE[ERROR_CODE["EVAL_ERROR"] = 2] = "EVAL_ERROR";
    ERROR_CODE[ERROR_CODE["INVALID_SUBS_AMMOUNT"] = 3] = "INVALID_SUBS_AMMOUNT";
    ERROR_CODE[ERROR_CODE["INVALID_SUB_NAME"] = 10] = "INVALID_SUB_NAME";
    ERROR_CODE[ERROR_CODE["INVALID_ID"] = 11] = "INVALID_ID";
    ERROR_CODE[ERROR_CODE["PROCESSING_ERROR"] = 50] = "PROCESSING_ERROR";
})(ERROR_CODE = exports.ERROR_CODE || (exports.ERROR_CODE = {}));
exports.ROOTS = {
    LISTENERS_METADATA: {
        _: 'meta_listener/listener',
        LAST_LISTENER_SET: 'last_listener_set',
    },
    SUBS_METADATA: {
        _: 'meta_sub/sub',
        LAST_SUB_SET: 'last_subreddit_set'
    }
};
exports.path_lastListenerSetAt = exports.ROOTS.LISTENERS_METADATA._ + "/" + exports.ROOTS.LISTENERS_METADATA.LAST_LISTENER_SET;
function path_userListeners(uid) {
    return `reddit_users/${uid}/listeners`;
}
exports.path_userListeners = path_userListeners;
exports.path_redditSubs = 'reddit_subs';
function path_subListeners(subid) {
    return `${exports.path_redditSubs}/${subid}/listeners`;
}
exports.path_subListeners = path_subListeners;
function path_subListener(subid, lid) {
    return `${exports.path_redditSubs}/${subid}/listeners/${lid}`;
}
exports.path_subListener = path_subListener;
function path_userContacts(uid) {
    return `contacts/${uid}`;
}
exports.path_userContacts = path_userContacts;
function path_listenerUpdateRequest(uid) {
    return `requests/${uid}/update_listener`;
}
exports.path_listenerUpdateRequest = path_listenerUpdateRequest;
function path_listenerCreateRequest(uid) {
    return `requests/${uid}/new_listener`;
}
exports.path_listenerCreateRequest = path_listenerCreateRequest;
exports.path_redditPostCheckData = 'reddit_posts_check_data';
exports.path_lastFetchedPosts = 'posts_last_fetched_at';
exports.path_lastPostAddedAt = 'last_post_added_at';
function path_lastFetchedSub(subID) {
    return `${exports.path_lastFetchedPosts}/${subID}`;
}
exports.path_lastFetchedSub = path_lastFetchedSub;
function path_listenerLastNotifiedAtPrev(uid) {
    return `listener_last_notified_at/${uid}`;
}
exports.path_listenerLastNotifiedAtPrev = path_listenerLastNotifiedAtPrev;
function path_listenerLastNotifiedAt(uid, listenerId) {
    return `listener_last_notified_at/${uid}/${listenerId}`;
}
exports.path_listenerLastNotifiedAt = path_listenerLastNotifiedAt;
exports.path_notificationsQueue = 'reddit_ntfs_q';
