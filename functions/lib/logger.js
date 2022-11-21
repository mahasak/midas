const Pino = require('pino')
const { gcpLogOptions } = require('pino-cloud-logging')

const pino = Pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  },gcpLogOptions());

exports.logger = {
    info:  (...data) =>{
        pino.info(...data)
        //console.log(...data)
    }
}