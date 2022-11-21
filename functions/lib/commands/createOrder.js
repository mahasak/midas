

const { invoiceAccessInvoiceCreate } = require('../service/invoiceAccessInvoiceCreate')
const { saveSessionData, saveOrderData } = require('../service/session')
const { getMenu } = require('../menu')
const { genProductItems } = require('../cart')
const {debug,logger} = require('../logger')
const SELLER_INSTRUCTION_IMG = "https://midas-3ca5e.web.app/resources/seller_instruction.JPG"
exports.createOrder = async (ctx, next) => {
    logger.info('[command] create new order')
    if (ctx.message.text.toString().startsWith("#create_order")) {


        const createCmd = ctx.message.text.split(" ");
        //let productItems = [];
        const cart = [];
        if (createCmd.length === 1 || createCmd[1] === '' || !isNaN(parseInt(createCmd[1]))) {
            // default order creation
            cart['T01'] = 1
        } else {
            const menu = getMenu()
            const menuCode = Object.keys(menu);

            const items = createCmd[1].toString().split(",")

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
        }

        const productItems = genProductItems(cart);
        console.log(productItems)

        const additionalAmount = [
            {
                "label": "Shipping fee",
                "currency_amount": {
                    "amount": "100",
                    "currency": "THB"
                }
            }
        ]

        const instructions = "Hi Buyer 😀😀,\n"+
        "This is welcome message and instructions\n\n" +
        "Line #1 \n"+
        "Line #2 \n"+
        "Line #3 \n"+
        "Line #4 \n"+
        "Line #5 \n"+
        "Line #6 \n"+
        "Line #7 \n"+
        "Line #8 \n"+
        "Line #9 \n"+
        "Line #10 \n"+
        "Line #11 \n"+
        "Line #12 \n"+
        "Line #13 \n"+
        "Line #14 \n"+
        "Line #15 \n"+
        "Line #16 \n"+
        "Line #17 \n"+
        "Line #18 \n"+
        "Line #19 \n"+
        "Line #20"

        const result = await invoiceAccessInvoiceCreate(
            ctx.pageScopeID,
            instructions,
            SELLER_INSTRUCTION_IMG,
            productItems,
            additionalAmount,
            [],
            null
        )
        if (result !== undefined) {
            saveSessionData(ctx.pageScopeID, result.invoiceId, result.orderId)
            saveOrderData(result.invoiceId, result.orderId, ctx.pageScopeID)
            
        }

        logger.info('[command] create new order - executed')
        ctx.shouldEnd = true
    }
    if (!ctx.shouldEnd) await next()
}