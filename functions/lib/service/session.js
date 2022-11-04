const NodeCache = require("node-cache");
const sessionCache = new NodeCache();
const functions = require('firebase-functions');
const emptySessionTemplate = {
    currentInvoice: 0,
    currentOrder: 0,
    basket: {},
    orderCommand: {}
}
const createEmptySession = (pageScopeID) => {
    sessionCache.set(pageScopeID, emptySessionTemplate);
}
exports.newSession = createEmptySession

exports.saveSession = (pageScopeID, key, val) => {
    let sessionData = sessionCache.get(pageScopeID);
    functions.logger.log("sessionData:", sessionData);
    if (sessionData === undefined) {
        // session not found
        sessionData = {}
    }

    sessionData[key] = val

    sessionCache.set(pageScopeID, sessionData)
    functions.logger.log("saving session:", sessionData);
}

exports.getSession = (pageScopeID) => {
    const sessionData = sessionCache.get(pageScopeID);

    if (sessionData === undefined) {
        // session not found
        return undefined
    }

    return sessionData;
}

exports.getSessionKey = (pageScopeID, key) => {
    const sessionData = sessionCache.get(pageScopeID);
    console.log(sessionData);
    console.log(Object.keys(sessionData))
    if (sessionData == undefined || !Object.keys(sessionData).includes(key)) {
        // session not found
        return undefined
    }

    return sessionData[key];
}
