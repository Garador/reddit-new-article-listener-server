"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const admin = tslib_1.__importStar(require("firebase-admin"));
const constants_1 = require("../constants");
const moment = tslib_1.__importStar(require("moment-timezone"));
const SENDGRID_KEY = process.env.SENDGRID_KEY;
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(SENDGRID_KEY);
class NotificationSender {
    static get instance() {
        this._instance = this._instance ? this._instance : new NotificationSender();
        return this._instance;
    }
    sendEmail(address, subject, text, html) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const msg = {
                to: address,
                from: 'reddit-new-listener@indevelopment.com',
                subject,
                text,
                html: html ? html : text,
            };
            try {
                yield sgMail.send(msg);
            }
            catch (e) {
                console.log({ e: JSON.stringify(e.response.body) });
            }
        });
    }
    assembleEmailBody(_posts) {
        return {
            title: `You have ${_posts.length} posts that match your criteria! (/r/${_posts[0].subreddit})`,
            html: `
                You have ${_posts.length} posts that match your criteria!<br/>
                ${(() => _posts.map((data) => {
                let _date = moment.utc(new Date(data.created_utc * 1000)).tz('America/Caracas').format("HH:mm:ss z");
                return `
                            <b><h3>${data.title}</h3></b>(${_date}) (${data.url})
                            <br/>
                            ${data.selftext_html}
                        `.trim();
            }).join("<br/><br/><hr/>"))()}`.trim(),
            text: `
                You have ${_posts.length} posts that match your criteria!<br/>
                ${(() => _posts.map((data) => {
                return `
                            <b>${data.title}</b> (${data.url})
                        `.trim();
            }).join("<br/>"))()}`.trim()
        };
    }
    listenNotificationsQueue() {
        admin.database().ref(constants_1.path_notificationsQueue).on('child_added', (data) => {
            if (data != null) {
                let payload = data.toJSON();
                let _posts = [];
                if (payload.posts) {
                    Object.keys(payload.posts).forEach((index) => {
                        _posts[parseInt(index)] = payload.posts[index];
                    });
                }
                if (_posts.length > 0) {
                    let { title, html, text } = this.assembleEmailBody(_posts);
                    let address = payload.contact.email;
                    this.sendEmail(address, title, text, html);
                    admin.database().ref(data.ref).remove();
                }
            }
        });
    }
}
exports.NotificationSender = NotificationSender;
