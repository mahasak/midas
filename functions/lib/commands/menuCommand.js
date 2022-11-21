const { getMenu } = require('../menu')
const {sendTextMessage} = require('../service/messenger')
const {debug,logger} = require('../logger')

exports.menuCommand = async (ctx, next) => {
    logger.info('[command] menu list')
    if (ctx.message.text.toString().startsWith("#menu")) {
        const menu = getMenu()
        
        let menuString = "Menu Item:\n\n";
        for(const key in menu) {
            menuString = menuString + `${menu[key].id}-${menu[key].name} : ${menu[key].description}\n\n`
        }
        await sendTextMessage(ctx.pageScopeID, menuString)

        logger.info('[command] menu list - executed')
        ctx.shouldEnd = true
    }
    if (!ctx.shouldEnd) await next()
}