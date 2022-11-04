const { getMenu } = require('../menu')

const menu = getMenu()
const menuCode = Object.keys(menu);

exports.genProductItems = (cart) => {
    const productItems = [];
    const currentCartItems = Object.keys(cart);

    for (const itemCode of currentCartItems) {
        if(menuCode.includes(itemCode)) {
            productItems.push({
                "external_id": itemCode,
                "name": menu[itemCode].name,
                "quantity": cart[itemCode],
                "description": menu[itemCode].description,
                "currency_amount": {
                    "amount": parseInt(menu[itemCode].price),
                    "currency": "THB"
                }
            })
        }
    }

    return productItems
}