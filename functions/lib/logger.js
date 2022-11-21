const functions = require('firebase-functions');
const Pino = require('pino')
const { gcpLogOptions } = require('pino-cloud-logging')

var colors = require('colors');

const ENV_MODE = functions.config().midas.env;

exports.debug = (label, ...data) => {
    if (ENV_MODE == 'dev') {
        console.log(`---------- debug: ${label} ----------`.red)
        data.forEach(item => console.log(colors.yellow(item)))
    }
}

exports.logger = Pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
}, gcpLogOptions())