const {sendOrderCTA} = require('../service/messenger')

exports.orderCommand = async (ctx, next) => {
    console.log('middleware: order retrieval')
    if (ctx.message.text.toString().startsWith("#order")) {
        const orderCmd = ctx.message.text.split(" ");
        if (orderCmd.length === 1 || orderCmd[1] === '' || isNaN(parseInt(orderCmd[1]))) {
            await sendOrderCTA(ctx.pageScopeID, "Test Order (Default)", 0);
        } else {
            await sendOrderCTA(ctx.pageScopeID, `Test Order #${orderCmd[1].toString()}`, parseInt(orderCmd[1]));
        }
        console.log("Request order command detected")
        ctx.shouldEnd = true
    }
    if (!ctx.shouldEnd) await next()
}