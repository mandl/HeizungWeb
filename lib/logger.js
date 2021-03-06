/*
    Heizung
    
    Copyright (C) 2018 - 2020Mandl

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint, printf } = format;

const path = require('path');
const configData = require('../config.json');



const logFolder = path.join(__dirname, 'temp.log');

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
        new transports.File({ filename: logFolder })
    ]
    //,
    //exceptionHandlers: [
    //      new transports.File({ filename: __dirname + '/exceptions.log' })
    //]      
});
var getLogFolder = function () {
    return logFolder;
}

exports.logfolder = getLogFolder;
exports.logger = logger;