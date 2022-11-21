const NodeCache = require("node-cache");
const sessionCache = new NodeCache();
const functions = require('firebase-functions');
const emptySessionTemplate = {
    currentInvoice: 0,
    currentOrder: 0,
    basket: {},
    orderCommand: {}
}
const PAGE_ID = functions.config().facebook.page_id;
const { db, dbAdmin } = require('./firebase');
const createEmptySession = (pageScopeID) => {
    sessionCache.set(pageScopeID, emptySessionTemplate);
}
exports.newSession = createEmptySession

exports.saveOrderData = (invoiceId, externalOrderId, pageScopeID) => {
    const orderRef = db.ref(`store/${PAGE_ID}/orders/${invoiceId}`)
    orderRef.update({
            psid: pageScopeID,
            orderId: externalOrderId
    })
}

exports.saveSessionData = (psid, InvoiceId, externalOrderId) => {
    const sessionRef = db.ref(`store/${PAGE_ID}/sessions/${psid}`)
    sessionRef.update({
            invoiceId: InvoiceId,
            orderId: externalOrderId
    })
}
exports.getOrderData = async (invoiceId) => {
    const orderRef = await db.ref(`store/${PAGE_ID}/orders/${invoiceId}`).once('value');
    return Object.assign({}, orderRef.val())
}
exports.getSessionData = async (psid) => {
    const sessionRef = await db.ref(`store/${PAGE_ID}/sessions/${psid}`).once('value');
    return Object.assign({}, sessionRef.val())
}