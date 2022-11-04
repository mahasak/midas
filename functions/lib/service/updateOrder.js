const functions = require('firebase-functions');
const fetch = require('node-fetch');
const { sendOrderCTA } = require('./messenger')

const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;
const {db, dbAdmin} = require('../service/firebase');

exports.updateOrder = async (buyerId, orderId, invoiceId, note, paidAmount, additionalAmounts, productItems, shippingAddress) => {
    const payload = {
        "invoice_id": `${invoiceId}`,
        "notes": `${note}`,
        "paid_amount": {
            "amount": `${paidAmount}`,
            "currency": "THB"
        },
        "additional_amount": additionalAmounts,
        "product_items": productItems
    }

    if (shippingAddress !== null) {
        payload['shipping_address'] = shippingAddress
    }

    const res = await fetch('https://graph.facebook.com/v14.0/' + PAGE_ID + '/invoice_access_invoice_edit?access_token=' + ACCESS_TOKEN, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }

    });

    const data = await res.json();

    if (res.ok) {
        const invoiceId = data.invoice_id

        console.log("Successfully update order with ID %s to recipient %s", invoiceId, buyerId)
        await sendOrderCTA(buyerId, `Order #${orderId} from NativeBear 🐻`, invoiceId)
        return {
            invoiceId: invoiceId,
            orderId: orderId
        }
    } else {
        console.log("Failed to uptdate order for recipient %s", buyerId)
        return undefined
    }
}