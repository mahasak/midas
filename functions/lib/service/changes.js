const functions = require('firebase-functions');
const fetch = require('node-fetch');
const { sendOrderCTA, sendTextMessage } = require('./messenger')
const { getSessionData, getOrderData } = require('./session')
const PAGE_ID = functions.config().facebook.page_id;
const ACCESS_TOKEN = functions.config().facebook.access_token;

const { invoiceAccessInvoiceEdit } = require('../service/invoiceAccessInvoiceEdit')
const { debug, logger } = require('../logger')

exports.receivedChanges = async (change) => {
    // process payment signal / bank slips
    if (change.field === 'invoice_access_invoice_draft_change') {
        debug('Incoming changeset for invoice_access_invoice_draft_change', change)
        debug('Incoming changeset for invoice_access_invoice_draft_change', JSON.stringify(change))
        logger.info(`[webhook-invoice-draft-change-handler] Changeset for ${change.value.invoice_id}`)
        const startTime = performance.now()

        const res = await fetch(`https://graph.facebook.com/v14.0/${PAGE_ID}/invoice_access_invoice_details?invoice_id=${change.value.invoice_id}&access_token=${ACCESS_TOKEN}`, {
            method: 'GET',
        });

        const data = await res.json();
        debug('order details', data)

        if (res.ok) {
            
            const invoiceIdFromAPI = data.data[0].invoice_id
            let additionalAmounts = data.data[0].additional_amounts
            logger.info(`[webhook-changes-handler] Successfully fetch order with ID ${invoiceIdFromAPI}`)

            // address changes
            let newShippingAddress = null
            if (change.value.updates.shipping_address !== undefined) {
                debug('shipping address changes', change.value.updates.shipping_address)
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
                    debug('payment changes', payment)
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

            logger.info(`[webhook-invoice-draft-changes-handler] Invoice ${invoiceIdFromAPI} total paid: ${paid_amount}`)
            const orderDetail = await getOrderData(data.data[0].invoice_id)
            const result = await invoiceAccessInvoiceEdit(
                orderDetail.psid,
                data.data[0].external_invoice_id,
                data.data[0].invoice_id,
                data.data[0].buyer_notes,
                {
                    "amount": `${paid_amount}`,
                    "currency": "THB"
                },
                additionalAmounts,
                data.data[0].product_items,
                newShippingAddress
            )
            const endTime = performance.now()
            logger.info(`[webhook-invoice-draft-changes-handler] Call to invoice_access_invoice_edit took ${(endTime - startTime) / 1000} seconds`)
            return {
                invoiceId: invoiceIdFromAPI,
            }
        }
    }

    // process order updates
    if (change.field === 'invoice_access_invoice_change') {
        debug('Incoming changeset for invoice_access_invoice_change', change)
        logger.info(`[webhook-invoice-change-handler] Changeset for ${change.value.invoice_id}`)
    }
}