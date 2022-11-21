const functions = require('firebase-functions');
const fetch = require('node-fetch');
const { sendOrderCTA } = require('./messenger')

const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;


const { db, dbAdmin } = require('./firebase');

exports.invoiceAccessInvoiceCreate = async (buyerId, instructions, instruction_image, productItems, additionalAmounts, seller_bank_accounts, shipping_address) => {

    const orderCountRef = await db.ref('/store/' + PAGE_ID).once('value');
    const orderCountObj = Object.assign({}, orderCountRef.val());
    const orderId = orderCountObj.orderCount.toString().padStart(10, '0')

    let note = `Order #${orderId} from NativeBear 🐻 (Create)\n\n`
    note += 'Order summary\n'
    note += '--------------------\n'
    let total = 0
    for (const productItem of productItems) {
        note += `${productItem.name} x ${productItem.quantity} = ${productItem.currency_amount.amount * productItem.quantity} ${productItem.currency_amount.currency}\n`
        total += (productItem.currency_amount.amount * productItem.quantity)
    }
    note += '--------------------\n'
    for (const additionalAmount of additionalAmounts) {
        note += `${additionalAmount.label} = ${additionalAmount.currency_amount.amount} ${additionalAmount.currency_amount.currency}\n`
        total += parseInt(additionalAmount.currency_amount.amount)
    }
    note += '--------------------\n'
    note += `Paid amount: 0 THB\n`
    note += `Total amount: ${total} THB`
    const updates = {}
    updates[`store/${PAGE_ID}/orderCount`] = dbAdmin.ServerValue.increment(1);
    db.ref().update(updates);

    const payload = {
        "external_invoice_id": `${orderId}`,
        "buyer_id": `${buyerId}`,
        "notes": `${note}`,
        "additional_amounts": additionalAmounts,
        "platform_name": "PapaBear",
        "platform_logo_url": "https://midas-3ca5e.web.app/resources/platform_logo.png",
        "invoice_instructions": `${instructions}`,
        "invoice_instructions_image_url": `${instruction_image}`,
        "product_items": productItems,
        "seller_bank_account_ids": `${seller_bank_accounts}`,
        "features": {
            "enable_messaging": false,
            "enable_product_item_removal": false,
            "allowed_payment_methods": "BANK_SLIP"
        }
    }

    if (shipping_address !== null) {
        payload['shipping_address'] = shipping_address
    }

    console.log(payload);

    const res = await fetch('https://graph.facebook.com/v14.0/' + PAGE_ID + '/invoice_access_invoice_create?access_token=' + ACCESS_TOKEN, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }

    });

    const data = await res.json();

    if (res.ok) {
        const invoiceId = data.invoice_id

        console.log("Successfully create order with ID %s to recipient %s", invoiceId, buyerId)
        await sendOrderCTA(buyerId, note, invoiceId)
        return {
            invoiceId: invoiceId,
            orderId: orderId
        }
    } else {
        console.log("Failed create order for recipient %s", buyerId)
        console.log(data)
        return undefined
    }

}
