const { sendTextMessage } = require('../service/messenger')
const {debug,logger} = require('../logger')

exports.greetCommand = async (ctx, _next) => {
    logger.info('[command] greeting')

    const hey = "Hi,\r\nPlease send #help to see suppport commands."

    await sendTextMessage(ctx.pageScopeID, hey)
    logger.info('[command] greeting - executed')
}