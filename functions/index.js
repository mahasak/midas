const { firebaseConfig } = require("firebase-functions");
const functions = require("firebase-functions");
const fetch = require('node-fetch');

exports.webhook = functions.https.onRequest((req, res) => {
    switch (req.method) {
        case 'GET':
            verifySubscription(req, res)
            break
        case 'POST':
            processMessage(req, res)
            res.sendStatus(200)
            break
    }


})

const verifySubscription = (req, res) => {
    console.log("Validating webhook")
    console.log(req.query['hub.verify_token'])
    console.log(functions.config().facebook.verify_token)
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === functions.config().facebook.verify_token) {

        res.status(200).send(req.query['hub.challenge'])
    } else {
        console.error("Failed validation. Make sure the validation tokens match.")
        res.sendStatus(403)
    }
}

const processMessage = (req, res) => {
    const data = req.body;
    console.log("Receive Message");

    console.log(data.object)
    if (data.object == 'page') {
        data.entry.forEach(pageEntry => {
            const pageID = pageEntry.id
            const timeOfEvent = pageEntry.time

            pageEntry.messaging.forEach(async function (event) {
                if (event.message) {
                    await receivedMessage(event)
                } else if (event.delivery) {
                    receivedDeliveryConfirmation(event)
                } else if (event.postback) {
                    receivedPostback(event)
                } else if (event.read) {
                    receivedMessageRead(event)
                } else if (event.account_linking) {
                    receivedAccountLink(event)
                } else {
                    console.log(`Webhook received unknown messagingEvent: ${event}`)
                }
            });
        });
    }
}


const receivedMessage = async (event) => {
    const pageScopeID = event.sender.id
    const recipientID = event.recipient.id
    const message = event.message
    const isEcho = message.is_echo
    const messageId = message.mid
    const appId = message.app_id
    const metadata = message.metadata
    const quickReply = message.quick_reply

    if (pageScopeID != functions.config().facebook.page_id) {
        if (message.text.toString().startsWith("#order")) {
            const orderCmd = message.text.split(" ");
            if (orderCmd.length === 1 || orderCmd[1] === '' || isNaN(parseInt(orderCmd[1]))) {
                sendOrderCTA(pageScopeID, "Test Order (Default)", 0);
            } else {
                sendOrderCTA(pageScopeID, `Test Order #${orderCmd[1].toString()}`, parseInt(orderCmd[1]));
            }
            console.log("Request order command detected")

            
        } else {
            const instructionText = "Please send '#order' to get demo order"
            sendTextMessage(pageScopeID, instructionText)
        }
    }

    if (isEcho) {
        console.log(`Received echo for message ${messageId} and app ${appId} with metadata ${metadata}`)
        return
    } else if (quickReply) {
        const quickReplyPayload = quickReply.payload
        console.log(`Quick reply for message ${messageId} with payload ${quickReplyPayload}`)

        await sendTextMessage(senderID, "Quick reply tapped")
        return
    }

    console.log(`Received message from ${pageScopeID} and page ${recipientID} with mesage ${message.text}`)
    await markSeen(pageScopeID)
}

const receivedDeliveryConfirmation = (event) => {
    const delivery = event.delivery
    const messageIDs = delivery.mids
    const watermark = delivery.watermark

    if (messageIDs) {
        messageIDs.forEach((messageID) => {
            console.log(`Received delivery confirmation for message ID: ${messageID}`)
        })
    }

    console.log(`All message before ${watermark} were delivered.`)
}

const receivedMessageRead = (event) => {
    // All messages before watermark (a timestamp) or sequence have been seen.
    const watermark = event.read.watermark
    const sequenceNumber = event.read.seq

    console.log(`Received message read event for watermark ${watermark} and sequence number ${sequenceNumber}`)
}

const sendTextMessage = async (recipientId, messageText) => {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText,
            metadata: "DEVELOPER_DEFINED_METADATA"
        }
    }

    await callSendAPI(messageData)
}

const sendOrderCTA = async (recipientId, messageText, orderID=0) => {
    const order = orderID == 0 ? '568543855056670': `${orderID}`;
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: messageText,
                    buttons: [
                        {
                            type: "web_url",
                            url: "https://www.messenger.com",
                            title: "View Order",
                            messenger_extensions: true,
                            internal_native_url: `fb-messenger://3pp_checkout/?order_id=${order}`
                        }
                    ]
                }
            }
        }
    }

    await callSendAPI(messageData)
}

const callSendAPI = async (messageData) => {
    try {
        const res = await fetch('https://graph.facebook.com/v14.0/' + functions.config().facebook.page_id + '/messages?access_token=' + functions.config().facebook.access_token, {
            method: 'POST',
            body: JSON.stringify(messageData),
            headers: { 'Content-Type': 'application/json' }

        });

        console.log(messageData)

        const data = await res.json();
        console.log(data)
        var recipientId = data.recipient_id;
        var messageId = data.message_id
        if (res.ok) {
            console.log("Successfully sent message with id %s to recipient %s",
                messageId, recipientId)
        } else {
            console.log("Failed called Send API for recipient %s",
                recipientId)
        }


    } catch (error) {
        console.log(error)
    }
}

const markSeen = async (psid) => {
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
        recipient: {
            id: psid
        },
        sender_action: "mark_seen"
    }

    await callSendAPI(messageData)
}