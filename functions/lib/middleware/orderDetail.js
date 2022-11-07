const { sendTextMessage } = require('../service/messenger')
const { saveSession, getSession } = require('../service/session')
const { invoiceAccessInvoiceDetails } = require('../service/invoiceAccessInvoiceDetails')
const { genProductItems } = require('../service/cart')
const { getMenu } = require('../menu')

exports.orderDetail = async (ctx, next) => {
    console.log('middleware: fetch order detail')
    if (ctx.message.text.toString().startsWith("#order_detail")) {
        const cmd = ctx.message.text.split(" ");
        const items = cmd[1].toString().split(",")
        console.log(items)
        await invoiceAccessInvoiceDetails(ctx.pageScopeID, items[0]);
        ctx.shouldEnd = true;
    }
    if (!ctx.shouldEnd) await next()
}