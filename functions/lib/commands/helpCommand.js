const { sendTextMessage } = require('../service/messenger')
const { debug, logger } = require('../logger')

exports.helpCommand = async (ctx, next) => {
    logger.info('[command] help message')
    if (ctx.message.text.toString().startsWith("#help")) {
        const instructionText = "Available commands:\n\n"
            + "#order - get default order XMA\n\n"
            + "#menu - get item menu\n\n"
            + "#order <order-id> - to get a specific order\n\n"
            + "#create_order - to create new order (WIP)\r\n"
            + "#help - message will display this help"

        await sendTextMessage(ctx.pageScopeID, instructionText)
        
        logger.info('[command] help message - executed')
        ctx.shouldEnd = true;
    }
    if (!ctx.shouldEnd) await next()
}