const functions = require('firebase-functions')
const PAGE_ID = functions.config().facebook.page_id
const ACCESS_TOKEN = functions.config().facebook.access_token
const fetch = require('node-fetch')
const { debug, logger } = require('../logger')

exports.sendTextMessage = async (recipientId, messageText) => {
    logger.info(`[messenger] Sending text message to PSID: ${recipientId}`)

    const messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    }

    await callSendAPI(messageData)
}

exports.sendOrderCTA = async (recipientId, messageText, orderID = 0) => {
    logger.info(`[messenger] Sending Order CTA ${orderID !== 0 ? 'for order ID: ' + orderID : ''} to PSID: ${recipientId}`)

    const order = orderID == 0 ? '568543855056670' : `${orderID}`
    const payload = {
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

    await callSendAPI(payload)
}

const callSendAPI = async (messageData) => {
    try {
        const res = await fetch('https://graph.facebook.com/v14.0/' + PAGE_ID + '/messages?access_token=' + ACCESS_TOKEN, {
            method: 'POST',
            body: JSON.stringify(messageData),
            headers: { 'Content-Type': 'application/json' }

        })

        const data = await res.json()
        const recipientId = data.recipient_id
        const messageId = data.message_id

        if (res.ok) {
            logger.info(`[messenger] Successfully send message to PSID: ${recipientId} ${messageId !== undefined ? 'messageId:' + messageId : ''}`)
        } else {
            logger.error(`[messenger] Failed to send message to PSID: ${recipientId}`)
        }
    } catch (error) {
        logger.error(`[messenger] Send API error`,error)
    }
}

exports.markSeen = async (psid) => {
    logger.info('[messenger] Marking messages as seen')

    const messageData = {
        recipient: {
            id: psid
        },
        "sender_action": "mark_seen"
    }

    await callSendAPI(messageData)
}