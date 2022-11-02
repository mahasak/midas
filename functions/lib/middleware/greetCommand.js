const { sendTextMessage } = require('../service/messenger')

exports.greetCommand = async (ctx, _next) => {
    console.log('middleware: greeting')

    const hey = "Hi,\r\nPlease send #help to see suppport commands."

    await sendTextMessage(ctx.pageScopeID, hey)
}