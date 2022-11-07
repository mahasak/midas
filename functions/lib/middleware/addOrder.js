const { sendTextMessage } = require('../service/messenger')
const { saveSession, getSession } = require('../service/session')
const { invoiceAccessInvoiceEdit } = require('../service/invoiceAccessInvoiceEdit')
const { genProductItems } = require('../service/cart')
const { getMenu } = require('../menu')

exports.addOrder = async (ctx, next) => {
    console.log('middleware: add order')
    if (ctx.message.text.toString().startsWith("#add_order")) {
        const session = getSession(ctx.pageScopeID);
        if (session !== undefined) {
            console.log(session)
            const addCmd = ctx.message.text.split(" ");
            const items = addCmd[1].toString().split(",")
            const cart = session.cart

            const menu = getMenu()
            const menuCode = Object.keys(menu);
            console.log(cart)
            for (const itemCode of items) {
                if (menuCode.includes(itemCode.trim())) {
                    const currentCartItems = Object.keys(cart);
                    if (currentCartItems.includes(itemCode)) {
                        cart[itemCode]++
                    } else {
                        cart[itemCode] = 1
                    }
                }
            }
            console.log(cart)
            const productItems = genProductItems(cart);

            const additionalAmount = [
                {
                    "label": "shipping",
                    "currency_amount": {
                        "amount": "100",
                        "currency": "THB"
                    }
                }
            ]
            const result = await invoiceAccessInvoiceEdit(
                ctx.pageScopeID,
                session.currentOrder,
                session.currentInvoice,
                "Hi Buyer,\r\nThis is welcome message and instructions - updated",
                0,
                additionalAmount,
                productItems
            )
            if (result !== undefined) {
                saveSession(ctx.pageScopeID, "currentInvoice", result.invoiceId)
                saveSession(ctx.pageScopeID, "currentOrder", result.orderId)
                saveSession(ctx.pageScopeID, "cart", cart)
            }
            ctx.shouldEnd = true
        } else {
            await sendTextMessage(ctx.pageScopeID, "No current order")
        }
        ctx.shouldEnd = true;
    }
    if (!ctx.shouldEnd) await next()
}