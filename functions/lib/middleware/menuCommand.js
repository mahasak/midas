const { getMenu } = require('../menu')
const {sendTextMessage} = require('../service/messenger')

exports.menuCommand = async (ctx, next) => {
    console.log('middleware: menu')
    if (ctx.message.text.toString().startsWith("#menu")) {
        const menu = getMenu()
        
        let menuString = "Menu Item:\n\n";
        for(const key in menu) {
            menuString = menuString + `${menu[key].id}-${menu[key].name} : ${menu[key].description}\n\n`
        }
        await sendTextMessage(ctx.pageScopeID, menuString)
        ctx.shouldEnd = true
    }
    if (!ctx.shouldEnd) await next()
}