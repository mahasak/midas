const { sendTextMessage } = require('../service/messenger')
const { getSession } = require('../service/session')
const { sendOrderCTA } = require('../service/messenger')

exports.currentOrder = async (ctx, next) => {
    console.log('middleware: current order')
    if (ctx.message.text.toString().startsWith("#current")) {
        const session = getSession(ctx.pageScopeID);
        if (session !== undefined) {
            console.log(session)
            await sendOrderCTA(ctx.pageScopeID, `Current Order #${session['currentOrder']}`, parseInt(session["currentInvoice"]));
        } else {
            await sendTextMessage(ctx.pageScopeID, "No current order")
        }
        ctx.shouldEnd = true;
    }
    if (!ctx.shouldEnd) await next()
}