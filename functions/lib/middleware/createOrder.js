

const { createOrder } = require('../service/createOrder')
const { saveSession } = require('../service/session')
const { getMenu } = require('../menu')
const { genProductItems } = require('../service/cart')

const SELLER_INSTRUCTION_IMG = "https://midas-3ca5e.web.app/resources/seller_instruction.JPG"
exports.createOrder = async (ctx, next) => {
    console.log('middleware: order creation')
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
                "label": "shipping",
                "currency_amount": {
                    "amount": "100",
                    "currency": "THB"
                }
            }
        ]

        const result = await createOrder(
            ctx.pageScopeID,
            "Hi Buyer 😅,\r\nThis is welcome message and instructions",
            SELLER_INSTRUCTION_IMG,
            productItems,
            additionalAmount,
            [],
            null
        )
        if (result !== undefined) {
            saveSession(ctx.pageScopeID, "currentInvoice", result.invoiceId)
            saveSession(ctx.pageScopeID, "currentOrder", result.orderId)
            saveSession(ctx.pageScopeID, "cart", cart)
        }
        ctx.shouldEnd = true
    }
    if (!ctx.shouldEnd) await next()
}