const functions = require('firebase-functions');
const fetch = require('node-fetch');
const { sendOrderCTA, sendTextMessage } = require('./messenger')

const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;

const { invoiceAccessInvoiceEdit2 } = require('../service/invoiceAccessInvoiceEdit')

exports.receivedChanges = async (change) => {
    // process payment signal / bank slips
    if (change.field === 'invoice_access_invoice_draft_change') {
        
        console.log(change)
        console.log('####################################################')
        await console.log("invoice draft change detected")
        console.log('####################################################')
        var startTime = performance.now()

        const res = await fetch(`https://graph.facebook.com/v14.0/${PAGE_ID}/invoice_access_invoice_details?invoice_id=${change.value.invoice_id}&access_token=${ACCESS_TOKEN}`, {
            method: 'GET',
        });

        const data = await res.json();
        console.log(data)

        if (res.ok) {
            const invoiceIdFromAPI = data.data[0].invoice_id
            let additionalAmounts = data.data[0].additional_amounts

            // address changes
            let newShippingAddress = null
            if (change.value.updates.shipping_address !== undefined) {
                console.log('----------- shipping address changes ----------')
                console.log(change.value.updates.shipping_address)
                newShippingAddress = change.value.updates.shipping_address.new_value
                // generate random shipping fee
                const shippingFeeFactor = Math.floor((Math.random() * 10) + 1);
                additionalAmounts = [
                    {
                        "label": "Shipping fee (update)",
                        "currency_amount": {
                            "amount": `${shippingFeeFactor * 1000}`,
                            "currency": "THB"
                        }
                    }
                ]
            }
        


            let paid_amount = 0
            if (data.data[0].payments !== undefined) {
                for (const payment of data.data[0].payments) {
                    console.log(payment)
                    console.log(payment.metadata)
                    if (payment.metadata.bank_slip.validation_status === "verified") {
                        paid_amount += parseFloat(payment.payment_amount.amount)
                    }
                    if (payment.metadata.bank_slip.validation_status === "not_verified") {
                        if (payment.metadata.bank_slip.validation_error.includes('ACCOUNT_MATCH:ACCOUNT_MATCH')) {
                            paid_amount += parseFloat(payment.payment_amount.amount)
                        }
                    }
                }
            }



            console.log(`Total Paid: ${paid_amount}`)

            console.log("Successfully fetch order with ID %s", invoiceIdFromAPI)
            const result = await invoiceAccessInvoiceEdit2(
                data.data[0].external_invoice_id,
                data.data[0].invoice_id,
                data.data[0].buyer_notes,
                paid_amount,
                additionalAmounts,
                data.data[0].product_items,
                newShippingAddress
            )
            var endTime = performance.now()
            console.log(`Call to invoice_access_invoice_edit took ${(endTime - startTime)/1000} seconds`)
            return {
                invoiceId: invoiceIdFromAPI,
            }
        }
    }

    // process order updates
    if (change.field === 'invoice_access_invoice_change') {
        console.log('####################################################')
        await console.log("invoice change detected")
        console.log('####################################################')

    }
}