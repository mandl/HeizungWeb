const winston = require('winston');

const logger = winston.createLogger({
	  level: 'debug',
	  transports: [
	 	    new winston.transports.File({ filename: '../temp.log' })
	  ]
	});

module.exports = logger;