const functions = require('firebase-functions');
const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;
const fetch = require('node-fetch');
exports.sendTextMessage = async (recipientId, messageText) => {
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

exports.sendOrderCTA = async (recipientId, messageText, orderID = 0) => {
    const order = orderID == 0 ? '568543855056670' : `${orderID}`;
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
                            fallback_url: `https://www.facebook.com/third_party_checkout/${order}/`,
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
        const res = await fetch('https://graph.facebook.com/v14.0/' + PAGE_ID + '/messages?access_token=' + ACCESS_TOKEN, {
            method: 'POST',
            body: JSON.stringify(messageData),
            headers: { 'Content-Type': 'application/json' }

        });

        const data = await res.json();
        const recipientId = data.recipient_id;
        const messageId = data.message_id
        
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

exports.markSeen = async (psid) => {
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
        recipient: {
            id: psid
        },
        "sender_action": "mark_seen"
    }

    await callSendAPI(messageData)
}