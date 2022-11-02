const functions = require('firebase-functions');

const Pipeline = require('./lib/pipeline')
const { genContext } = require('./lib/context')

const { sendTextMessage, markSeen } = require('./lib/service/messenger')
const { menuCommand } = require('./lib/middleware/menuCommand')
const { helpCommand } = require('./lib/middleware/helpCommand')
const { greetCommand } = require('./lib/middleware/greetCommand')
const { orderCommand } = require('./lib/middleware/orderCommand')
const { createOrder } = require('./lib/middleware/createOrder')
const PAGE_ID = functions.config().facebook.page_id;


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

const processMessage = (req, _res) => {
    const data = req.body;
    console.log("Receive Message");

    if (data.object == 'page') {
        data.entry.forEach(pageEntry => {
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

    const pipeline = Pipeline()
    if (pageScopeID != PAGE_ID) {
        const ctx = genContext()
        ctx.message = message
        ctx.pageScopeID = pageScopeID

        pipeline.push(createOrder)
        pipeline.push(orderCommand)
        pipeline.push(helpCommand)
        pipeline.push(menuCommand)
        pipeline.push(greetCommand)

        await pipeline.execute(ctx)

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
    const watermark = event.read.watermark
    const sequenceNumber = event.read.seq

    console.log(`Received message read event for watermark ${watermark} and sequence number ${sequenceNumber}`)
}
