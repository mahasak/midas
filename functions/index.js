const functions = require('firebase-functions');
const Pipeline = require('./lib/pipeline')
const { genContext } = require('./lib/context')
const { sendTextMessage, markSeen } = require('./lib/service/messenger')
const { menuCommand } = require('./lib/commands/menuCommand')
const { helpCommand } = require('./lib/commands/helpCommand')
const { greetCommand } = require('./lib/commands/greetCommand')
const { orderCommand } = require('./lib/commands/orderCommand')
const { createOrder } = require('./lib/commands/createOrder')
const { currentOrder } = require('./lib/commands/currentOrder')
const { addOrder } = require('./lib/commands/addOrder')
const { orderDetail } = require('./lib/commands/orderDetail')
const { receivedChanges } = require('./lib/service/changes')
const { debug, logger } = require('./lib/logger')
const PAGE_ID = functions.config().facebook.page_id;


exports.webhook = functions.https.onRequest((req, res) => {
    switch (req.method) {
        case 'GET':
            verifySubscription(req, res)
            break
        case 'POST':
            processMessage(req, res)
            
            break
    }
})

const verifySubscription = (req, res) => {
    logger.info('[webhook-verify] Incoming webhook verification request')
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === functions.config().facebook.verify_token) {
        logger.info('[webhook-verify] Successfully validating webhook token')
        res.status(200).send(req.query['hub.challenge'])
    } else {
        logger.error('[webhook-verify] Failed validation. Make sure the validation tokens match.')
        res.sendStatus(403)
    }
}

const processMessage = (req, res) => {
    logger.info('[webhook-handler] Incoming webhook messages/changes')

    const data = req.body;
    if (data.object == 'page' && data.entry !== undefined) {
        data.entry.forEach(pageEntry => {
            // process messaging
            if (pageEntry.messaging !== undefined) {
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
                        logger.error(`Webhook received unknown messagingEvent: ${event}`)
                    }
                });
            }
            //process changes
            if (pageEntry.changes !== undefined) {
                console.log(pageEntry)
                pageEntry.changes.forEach(async function (change) {
                    await receivedChanges(change);
                });
            }
        });
    }
    res.sendStatus(200)
}


const receivedMessage = async (event) => {
    const pageScopeID = event.sender.id
    const _recipientID = event.recipient.id
    const message = event.message
    const isEcho = message.is_echo
    const messageId = message.mid
    const appId = message.app_id
    const metadata = message.metadata
    const quickReply = message.quick_reply

    const pipeline = Pipeline()
    debug('Incoming event', event)
    debug('Incoming message', message)

    if (pageScopeID != PAGE_ID) {
        const ctx = genContext()
        ctx.message = message
        ctx.pageScopeID = pageScopeID

        if (!message.text) {
            logger.error(`Unsupported messages type (non-text)`, message)
        } else {
            pipeline.push(currentOrder)
            pipeline.push(orderDetail)
            pipeline.push(addOrder)
            pipeline.push(createOrder)
            pipeline.push(orderCommand)
            pipeline.push(helpCommand)
            pipeline.push(menuCommand)
            pipeline.push(greetCommand)

            await pipeline.execute(ctx)
        }
    }

    if (isEcho) {
        logger.info(`Received echo for message ${messageId} and app ${appId} with metadata ${metadata}`)
        return
    } else if (quickReply) {
        const quickReplyPayload = quickReply.payload
        logger.info(`Quick reply for message ${messageId} with payload ${quickReplyPayload}`)
        await sendTextMessage(senderID, "Quick reply tapped")
        return
    }

    await markSeen(pageScopeID)
}

const receivedDeliveryConfirmation = (event) => {
    const delivery = event.delivery
    const messageIDs = delivery.mids
    const watermark = delivery.watermark

    if (messageIDs) {
        messageIDs.forEach((messageID) => {
            logger.info(`Received delivery confirmation for message ID: ${messageID}`)
        })
    }

    logger.info(`All message before ${watermark} were delivered.`)
}

const receivedMessageRead = (event) => {
    const watermark = event.read.watermark
    const sequenceNumber = event.read.seq

    logger.info(`Received message read event for watermark ${watermark} and sequence number ${sequenceNumber}`)
}
