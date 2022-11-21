const functions = require('firebase-functions');
const fetch = require('node-fetch');
const { sendOrderCTA } = require('./messenger')
const { getSessionData, getOrderData } = require('./session')
const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;
//const {db, dbAdmin} = require('../service/firebase');
const {debug,logger} = require('../logger')

exports.invoiceAccessInvoiceEdit = async (buyerId, orderId, invoiceId, note, paidAmount, additionalAmounts, productItems, shippingAddress) => {
    const payload = {
        "invoice_id": `${invoiceId}`,
        "notes": `${note}`,
        "paid_amount": paidAmount,
        "product_items": productItems
    }
    const updateAdditionalAmount = []
    if (additionalAmounts !== null) {
        console.log(additionalAmounts)
        for (const additionalAmount of additionalAmounts) {
            updateAdditionalAmount.push({
                label: additionalAmount.label,
                currency_amount: {
                    amount: parseInt(additionalAmount.currency_amount.amount) / 100,
                    currency: additionalAmount.currency_amount.currency
                }
            })
        }
    }
    payload["additional_amounts"] = updateAdditionalAmount


    if (shippingAddress !== null) {
        payload['shipping_address'] = shippingAddress
    }
    console.log('----------------- PAYLOAD ----------------')
    console.log(payload)

    const res = await fetch('https://graph.facebook.com/v14.0/' + PAGE_ID + '/invoice_access_invoice_edit?access_token=' + ACCESS_TOKEN, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }

    });

    const data = await res.json();

    if (res.ok) {
        const invoiceId = data.invoice_id

        let note = `Order #${orderId} from NativeBear (Edit) 🐻\n\n`
        note += 'Order summary\n'
        note += '--------------------\n'
        let total = 0
        if (productItems !== null && productItems !== undefined)  {
            for (const productItem of productItems) {
                note += `${productItem.name} x ${productItem.quantity} = ${productItem.currency_amount.amount * productItem.quantity} ${productItem.currency_amount.currency}\n`
                total += (productItem.currency_amount.amount * productItem.quantity)
            }
        }
        note += '--------------------\n'
        for (const additionalAmount of updateAdditionalAmount) {
            note += `${additionalAmount.label} = ${additionalAmount.currency_amount.amount} ${additionalAmount.currency_amount.currency}\n`
            total += parseInt(additionalAmount.currency_amount.amount)
        }
        note += '--------------------\n'

        note += `Paid amount: ${paidAmount.amount} THB\n`
        note += `Total amount: ${total} THB`

        console.log("Successfully update order with ID %s to recipient %s", invoiceId, buyerId)
        await sendOrderCTA(buyerId, note, invoiceId)
        return {
            invoiceId: invoiceId,
            orderId: orderId
        }
    } else {
        console.log(data);
        console.log("Failed to uptdate order for recipient %s", buyerId)
        return undefined
    }
}