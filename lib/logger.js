const winston = require('winston');
const path = require('path');
const configData = require('../config.json');

const logFolder = path.join(__dirname );

const logger = winston.createLogger({
	  level: configData.loglevel,
	  transports: [
	 	    new winston.transports.File({ filename: logFolder+ '/temp.log' })
	  ]
	});

module.exports = logger;