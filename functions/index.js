const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
//admin.initializeApp();
const fs = require('fs')
const path = require('path')

const JSONfile = fs.readFileSync(path.join(__dirname, `/service-account.json`), 'utf8');

const serviceAccount = JSON.parse(JSONfile);

const FIREBASE_CONFIG = {
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://midas-3ca5e-default-rtdb.firebaseio.com/'
};

initializeApp(FIREBASE_CONFIG)

const db = admin.database().ref();
const fetch = require('node-fetch');


const PAGE_ID = functions.config().facebook.page_id;
const SELLER_INSTRUCTION = "https://midas-3ca5e.web.app/resources/seller_instruction.JPG"
const SELLER_INSTRUCTION_IMG = "https://midas-3ca5e.web.app/resources/seller_instruction.JPG"

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

    if (pageScopeID != PAGE_ID) {
        if (message.text.toString().startsWith("#order")) {
            const orderCmd = message.text.split(" ");
            if (orderCmd.length === 1 || orderCmd[1] === '' || isNaN(parseInt(orderCmd[1]))) {
                sendOrderCTA(pageScopeID, "Test Order (Default)", 0);
            } else {
                sendOrderCTA(pageScopeID, `Test Order #${orderCmd[1].toString()}`, parseInt(orderCmd[1]));
            }
            console.log("Request order command detected")
        } else if (message.text.toString().startsWith("#help")) {
            const instructionText = "Available commands:\r\n"
                + "#order - get default order XMA\r\n"
                + "#order <order-id> - to get a specific order\r\n"
                + "#create_order - to create new order (WIP)\r\n"
                + "any other message will display this help"

            sendTextMessage(pageScopeID, instructionText)


        } else if (message.text.toString().startsWith("#create_order")) {
            const productItems = [
                {
                    "external_id": "item01",
                    "name": "Item 01",
                    "quantity": 1,
                    "description": "Item for test number 01",
                    "currency_amount": {
                        "amount": "100",
                        "currency": "THB"
                    }
                }
            ]
            const additionalAmount = [
                {
                    "label": "shipping",
                    "currency_amount": {
                        "amount": "100",
                        "currency": "THB"
                    }
                }
            ]

            await createOrder(
                pageScopeID,
                "Hi Buyer,\r\nThis is welcome message and instructions",
                SELLER_INSTRUCTION_IMG,
                productItems,
                additionalAmount,
                [],
                null
            )

        } else {
            const hey = "Hi,\r\nPlease send #help to see suppport commands."
            sendTextMessage(pageScopeID, hey)
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

const createOrder = async (buyerId, instructions, instruction_image, product_items, additional_amounts, seller_bank_accounts, shipping_address) => {

    const orderCountRef = await admin.database().ref('/store/' + PAGE_ID).once('value');
    const orderCountObj = Object.assign({}, orderCountRef.val());

    const orderId = orderCountObj.orderCount.toString().padStart(10, '0')
    const note = `Order #${orderId}`
    
    const updates = {}
    updates[`store/${PAGE_ID}/orderCount`] = admin.database.ServerValue.increment(1);
    admin.database().ref().update(updates);

    const payload = {
        "external_invoice_id": `${orderId}`,
        "buyer_id": `${buyerId}`,
        "notes": `${note}`,
        "additional_amount": additional_amounts,
        "platform_name": "PapaBear",
        "platform_logo_url": "https://midas-3ca5e.web.app/resources/platform_logo.png",
        "invoice_instructions": `${instructions}`,
        "invoice_instructions_image_url": `${instruction_image}`,
        "product_items": product_items,
        "seller_bank_account_ids": `${seller_bank_accounts}`,
        "features": {
            "enable_messaging": false,
            "enable_product_item_removal": false,
            "allowed_payment_methods": "offsite"
        }
    }

    if (shipping_address !== null) {
        payload['shipping_address'] = shipping_address
    }

    const res = await fetch('https://graph.facebook.com/v14.0/' + PAGE_ID + '/invoice_access_invoice_create?access_token=' + functions.config().facebook.access_token, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }

    });

    const data = await res.json();
    console.log(data)


    if (res.ok) {
        const invoiceId = data.invoice_id

        console.log("Successfully create order with ID %s to recipient %s", invoiceId, buyerId)
        await sendOrderCTA(buyerId, `Order #${orderId} from NativeBear 🐻`, invoiceId)
    } else {
        console.log("Failed create order for recipient %s", buyerId)
    }
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

const sendOrderCTA = async (recipientId, messageText, orderID = 0) => {
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
        const res = await fetch('https://graph.facebook.com/v14.0/' + PAGE_ID + '/messages?access_token=' + functions.config().facebook.access_token, {
            method: 'POST',
            body: JSON.stringify(messageData),
            headers: { 'Content-Type': 'application/json' }

        });

        //console.log(messageData)

        const data = await res.json();
        //console.log(data)
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