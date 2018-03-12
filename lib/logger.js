const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint,printf } = format;

const path = require('path');
const configData = require('../config.json');

const logFolder = path.join(__dirname );

const myFormat = printf(info => {
	  return `${info.timestamp} ${info.level}: ${info.message}`;
	});

const logger = createLogger({
	  level: configData.loglevel,
	  format: combine(
		        
		        format.timestamp({
		            format: 'YYYY-MM-DD HH:mm:ss'
		        }),
		        myFormat
	  ),
	  transports: [
	 	    new transports.File({ filename: logFolder+ '/temp.log' })
	  ],
      exceptionHandlers: [
            new transports.File({ filename: logFolder+ + '/exceptions.log' })
      ]      
	});

module.exports = logger;