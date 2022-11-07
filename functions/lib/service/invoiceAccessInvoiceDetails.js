const functions = require('firebase-functions');
const fetch = require('node-fetch');
const { sendOrderCTA, sendTextMessage} = require('./messenger')

const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;
//const {db, dbAdmin} = require('../service/firebase');

exports.invoiceAccessInvoiceDetails = async (buyerId, invoiceId) => {
    const res = await fetch(`https://graph.facebook.com/v14.0/${PAGE_ID}/invoice_access_invoice_details?invoice_id=${invoiceId}&access_token=${ACCESS_TOKEN}`, {
        method: 'GET',
    });

    const data = await res.json();

    if (res.ok) {
        console.log(data)
        console.log("#################")
        console.log(data.data)
        const invoiceIdFromAPI = data.data[0].invoice_id

        console.log("Successfully fetch order with ID %s", invoiceIdFromAPI)

        let productItemStr = ''
        for (const productItems of data.data[0].product_items) {
            productItemStr += `- ${productItems.name} x ${productItems.quantity} = ${productItems.currency_amount.amount} ${productItems.currency_amount.currency}\r\n\r\n`
        }

        console.log(data.data[0].payments)

        console.log(data.data[0].payments[0].metadata)

        const txt = `Order Detail for #${invoiceIdFromAPI}\r\n\r\n`
        + `invoice ID: ${data.data[0].invoice_id}\r\n\r\n`
        + `order ID: ${data.data[0].external_order_id}\r\n\r\n`
        + `notes: ${data.data[0].buyer_notes}\r\n\r\n`
        + `currency amount: ${data.data[0].currency_amount.amount} ${data.data[0].currency_amount.currency}\r\n\r\n`
        + "Summary \r\n\r\n"
        + productItemStr
        + "Payments \r\n\r\n"
        + `method: ${data.data[0].payments[0].payment_method}\r\n\r\n`
        + `amount: ${data.data[0].payments[0].payment_amount.amount} ${data.data[0].payments[0].payment_amount.currency}\r\n\r\n`
        + `validation ID: ${data.data[0].payments[0].metadata.bank_slip.validation_id}\r\n\r\n`
        + `validation_status: ${data.data[0].payments[0].metadata.bank_slip.validation_status}\r\n\r\n`
        + `validation_error: ${data.data[0].payments[0].metadata.bank_slip.validation_error}\r\n\r\n`
        await sendTextMessage(buyerId, txt)
        
        //await sendOrderCTA(buyerId, `Please See order detail for #${invoiceId} here`, invoiceId)
        return {
            invoiceId: invoiceId,
        }
    } else {
        console.log(res.body)
        console.log("Failed to fetch order for invoice ID %s", invoiceId)
        return undefined
    }
}