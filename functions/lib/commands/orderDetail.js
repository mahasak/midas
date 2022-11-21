const { sendTextMessage } = require('../service/messenger')
const { saveSession, getSession } = require('../service/session')
const { invoiceAccessInvoiceDetails } = require('../service/invoiceAccessInvoiceDetails')
const { genProductItems } = require('../cart')
const { getMenu } = require('../menu')
const {debug,logger} = require('../logger')

exports.orderDetail = async (ctx, next) => {
    logger.info('[command] debug order')
    if (ctx.message.text.toString().startsWith("#order_detail")) {
        const cmd = ctx.message.text.split(" ");
        const items = cmd[1].toString().split(",")
        console.log(items)
        await invoiceAccessInvoiceDetails(ctx.pageScopeID, items[0]);
        logger.info('[command] debug order - executed')
        ctx.shouldEnd = true;
    }
    if (!ctx.shouldEnd) await next()
}