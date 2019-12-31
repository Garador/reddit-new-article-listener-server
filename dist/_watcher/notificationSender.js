"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const SENDGRID_KEY = process.env.SENDGRID_KEY;
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(SENDGRID_KEY);
class NotificationSender {
    notify() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
        });
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
            console.log({ msg });
            try {
                yield sgMail.send(msg);
            }
            catch (e) {
                console.log({ e: JSON.stringify(e.response.body) });
            }
        });
    }
}
exports.NotificationSender = NotificationSender;
