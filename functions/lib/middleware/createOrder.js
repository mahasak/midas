

const { createOrder } = require('../service/invoice')
const { getMenu } = require('../menu')

const SELLER_INSTRUCTION_IMG = "https://midas-3ca5e.web.app/resources/seller_instruction.JPG"
exports.createOrder = async (ctx, next) => {
    console.log('middleware: order creation')
    if (ctx.message.text.toString().startsWith("#create_order")) {


        const createCmd = ctx.message.text.split(" ");
        let productItems = [];
        if (createCmd.length === 1 || createCmd[1] === '' || !isNaN(parseInt(createCmd[1]))) {
            // default order creation
            productItems = [
                {
                    "external_id": "item01",
                    "name": "Item 01",
                    "quantity": 1,
                    "description": "Item for test number 01",
                    "currency_amount": {
                        "amount": "100",
                        "currency": "THB"
                    }
                }
            ]
        } else {
            const menu = getMenu()
            const menuCode = Object.keys(menu);

            const items = createCmd[1].toString().split(",")

            for (const itemCode of items) {
                if (menuCode.includes(itemCode.trim())) {
                    productItems.push({
                        "external_id": itemCode,
                        "name": menu[itemCode].name,
                        "quantity": 1,
                        "description": menu[itemCode].description,
                        "currency_amount": {
                            "amount": menu[itemCode].price,
                            "currency": "THB"
                        }
                    })
                }
            }
        }

        const additionalAmount = [
            {
                "label": "shipping",
                "currency_amount": {
                    "amount": "100",
                    "currency": "THB"
                }
            }
        ]

        await createOrder(
            ctx.pageScopeID,
            "Hi Buyer,\r\nThis is welcome message and instructions",
            SELLER_INSTRUCTION_IMG,
            productItems,
            additionalAmount,
            [],
            null
        )
        ctx.shouldEnd = true
    }
    if (!ctx.shouldEnd) await next()
}