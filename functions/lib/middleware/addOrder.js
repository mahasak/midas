const { sendTextMessage } = require('../service/messenger')
const { saveSessionData, getSessionData } = require('../service/session')
const { invoiceAccessInvoiceEdit } = require('../service/invoiceAccessInvoiceEdit')
const { genProductItems } = require('../service/cart')
const { getMenu } = require('../menu')
const fetch = require('node-fetch');
const functions = require('firebase-functions');
const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;



exports.addOrder = async (ctx, next) => {
    console.log('middleware: add order')
    if (ctx.message.text.toString().startsWith("#add_order")) {
        const session = await getSessionData(ctx.pageScopeID)
        console.log('----------- Session Data -----------')
        console.log(session)
        if (session !== undefined) {
            const addCmd = ctx.message.text.split(" ");
            const items = addCmd[1].toString().split(",")

            // Fetch order details
            const fetchInvoice = await fetch(`https://graph.facebook.com/v14.0/${PAGE_ID}/invoice_access_invoice_details?invoice_id=${session.invoiceId}&access_token=${ACCESS_TOKEN}`, {
                method: 'GET',
            });

            const data = await fetchInvoice.json();
            console.log(data.data[0].product_items);
            const cart = [];
            for(const item of data.data[0].product_items) {
                console.log(item)
                cart[item.external_id]= item.quantity
            }
            console.log(cart)

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

            const result = await invoiceAccessInvoiceEdit(
                ctx.pageScopeID,
                session.orderId,
                session.invoiceId,
                data.data[0].buyer_notes,
                data.data[0].paid_amount,
                data.data[0].additional_amounts,
                productItems
            )
            if (result !== undefined) {
                saveSessionData(ctx.pageScopeID, result.invoiceId, result.orderId)
            }
            ctx.shouldEnd = true
        } else {
            await sendTextMessage(ctx.pageScopeID, "No current order")
        }
        ctx.shouldEnd = true;
    }
    if (!ctx.shouldEnd) await next()
}