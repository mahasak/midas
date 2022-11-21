const { sendTextMessage } = require('../service/messenger')
const { getSessionData } = require('../service/session')
const { sendOrderCTA } = require('../service/messenger')
const {debug,logger} = require('../logger')

exports.currentOrder = async (ctx, next) => {
    logger.info('[command] get current order')
    if (ctx.message.text.toString().startsWith("#current")) {
        const session = await getSessionData(ctx.pageScopeID);
        if (session !== undefined) {
            await sendOrderCTA(ctx.pageScopeID, `Current Order #${session.orderId}`, parseInt(session.invoiceId));
        } else {
            await sendTextMessage(ctx.pageScopeID, "No current order")
        }

        logger.info('[command] get current order - executed')
        ctx.shouldEnd = true;
    }
    if (!ctx.shouldEnd) await next()
}