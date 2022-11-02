const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs')
const path = require('path')


const { initializeApp } = require('firebase-admin/app');

const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;
const JSONfile = fs.readFileSync(path.join(__dirname, '..', '..', `/service-account.json`), 'utf8');
const serviceAccount = JSON.parse(JSONfile);
const FIREBASE_CONFIG = {
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://midas-3ca5e-default-rtdb.firebaseio.com/'
};

const {sendOrderCTA} = require('./messenger')



initializeApp(FIREBASE_CONFIG)

const fetch = require('node-fetch');

exports.createOrder = async (buyerId, instructions, instruction_image, product_items, additional_amounts, seller_bank_accounts, shipping_address) => {

    const orderCountRef = await admin.database().ref('/store/' + PAGE_ID).once('value');
    const orderCountObj = Object.assign({}, orderCountRef.val());
    const orderId = orderCountObj.orderCount.toString().padStart(10, '0')
    const note = `Order #${orderId}`

    const updates = {}
    updates[`store/${PAGE_ID}/orderCount`] = admin.database.ServerValue.increment(1);
    admin.database().ref().update(updates);

    const payload = {
        "external_invoice_id": `${orderId}`,
        "buyer_id": `${buyerId}`,
        "notes": `${note}`,
        "additional_amount": additional_amounts,
        "platform_name": "PapaBear",
        "platform_logo_url": "https://midas-3ca5e.web.app/resources/platform_logo.png",
        "invoice_instructions": `${instructions}`,
        "invoice_instructions_image_url": `${instruction_image}`,
        "product_items": product_items,
        "seller_bank_account_ids": `${seller_bank_accounts}`,
        "features": {
            "enable_messaging": false,
            "enable_product_item_removal": false,
            "allowed_payment_methods": "offsite"
        }
    }

    if (shipping_address !== null) {
        payload['shipping_address'] = shipping_address
    }

    const res = await fetch('https://graph.facebook.com/v14.0/' + PAGE_ID + '/invoice_access_invoice_create?access_token=' + ACCESS_TOKEN, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }

    });

    const data = await res.json();

    if (res.ok) {
        const invoiceId = data.invoice_id

        console.log("Successfully create order with ID %s to recipient %s", invoiceId, buyerId)
        await sendOrderCTA(buyerId, `Order #${orderId} from NativeBear 🐻`, invoiceId)
    } else {
        console.log("Failed create order for recipient %s", buyerId)
        
    }
}
