/*
    Heizung
    
    Copyright (C) 2018 Mandl

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



const https = require('https');
const child_process = require('child_process');
const querystring = require('querystring');
const SerialPort = require('serialport');
const TempStations = require('../app/models/tempstation');

const configData = require('../config.json');
const logger = require('../lib/logger');
const fs = require('fs');
const path = require('path');
const pnpFolder = path.join('../' ,'picture');

const stationData = require(configData.station_file);
var stations = new TempStations.TempStations(stationData);

const  Readline = SerialPort.parsers.Readline;

var serial;
var parser;
var crcError = 0;

var sendOutData = function(data) {
	
	// logger.info(data);
	var headers = {
		    'Content-Type': 'application/json',
		    'Content-Length': Buffer.byteLength(data)
		  };
		const options = {
		  hostname: configData.server_url,
		  port: configData.server_port,
		  path: configData.location_temp,
		  rejectUnauthorized: false,
		  encoding: "utf8",
		  method: 'POST',
		  headers: headers,
		  json: true
		  
		};
	const req = https.request(options, (res) => {
	  logger.debug('statusCode:', res.statusCode);
	  logger.debug('headers:', res.headers);
	
	  res.on('data', (d) => {
	    // process.stdout.write(d);
	  });
	});
	
	req.on('error', (e) => {
	  logger.error(e);
	});
	req.write(data);
	req.end();

};

var sendPic = function() {
	
	// logger.info(data);
	var camFile = path.join(pnpFolder,'cam.jpg')
	child_process.execSync('raspistill -a 12 -md 0 -o '+ camFile);
	
	var data = fs.readFileSync(camFile);
	// logger.info(data);
	var headers = {
		    'Content-Type': 'image/jpeg',
		    'Content-Length': Buffer.byteLength(data)
		  };

		const options = {
		  hostname: configData.server_url,
		  port: configData.server_port,
		  path: configData.location_pic,
		  rejectUnauthorized: false,
		  encoding: "utf8",
		  method: 'POST',
		  headers: headers
		  
		  
		};
	const req = https.request(options, (res) => {
	  logger.debug('statusCode:', res.statusCode);
	  logger.debug('headers:', res.headers);
	
	  res.on('data', (d) => {
	    // process.stdout.write(d);
	  });
	});
	
	req.on('error', (e) => {
	  logger.error(e);
	});
	req.write(data);
	req.end();

};


var searchForDevice = function() {
	logger.info('searchForDevice');
	setTimeout(function() {
		connectDevice();
	}, 10000);
};

var connectDevice = function() {
	var portFound=false;
	SerialPort.list(function(err, ports) {
		ports.forEach(function(port) {
			logger.info(port.comName);
			// logger.info(port.pnpId);
			// logger.info(port.manufacturer);
			if (port.manufacturer != undefined) {
				var name = port.manufacturer;
				if (name.startsWith('Arduino')) {
					logger.info('Found Arduino at: ' + port.comName);
					DoConnect(port);
					portFound = true;
				}
			}
		 
		});
		if(portFound == false)
		{
			searchForDevice();
		}
		
	});
	
};
	
var DoConnect=function(port)
{
   
		serial = new SerialPort(port.comName, {
			baudRate : 115200
		});
		parser = serial.pipe(new Readline({
			delimiter : '\r\n'
		}));
	
		serial.on('close', function() {
			logger.info('close port');
			serial = null;
			parser = null;
			reconnectDevice();
		});
		
		serial.on('open', function() {
			logger.info('port open ');
			setInterval(function() {
				logger.debug('send data');
				logger.debug(JSON.stringify(stations));		
				sendOutData(JSON.stringify(stations));	
				
			}, 1000 * 60 * 5); // send every 5 minutes
			
		});
		
		serial.on('error', function(err) {
		    // error do reconnect
			serial = null;
			parser = null;
			logger.error("error", err);
			reconnectDevice();
		});
	
		parser.on('data', function(data) {
	
			var my = data.toString();
			// { ID: 5, Reset: 0, LOWBAT: 0, Temp: 22.3, Hygro: 47 }
			logger.debug(my);
			try {
				var obj = JSON.parse(my);
				if (obj.frame == 'data')
				{	
					var data = stations.findWhere({id: obj.ID});						
					if(data  === undefined)
					{
						logger.debug('new id');
						if((obj.Reset) && (configData.add_new_stations))
						{
							stations.add({id: obj.ID,
							       label: 0,
							       name : "New",
							       state : 0,
							       time : Date.now(),
							       reset : obj.Reset,
							       lowbattery : obj.LOWBAT,
							       timestr: new Date().toLocaleString(),
							       datasource: "-1"});
						}	
					}		
					else{
						// logger.info(data);
						// Update
						data.set({"temp": obj.Temp});
						data.set({"hum" : obj.Hygro});
						data.set({"time": Date.now()});
						data.set({"reset": obj.Reset});
						data.set({"lowbattery": obj.LOWBAT});
						data.set({"timestr": new Date().toLocaleString()});
						// logger.info(dataTemp);
					}
				}
				else if (obj.frame == 'info')
				{
					// crc error
					crcError = crcError + 1;
					logger.debug("CRC errors: ",crcError);
				}	
				else
				{			
					logger.error(obj);
				}
			} catch (e) {
				logger.error(e);
			}
		});
};

// check for connection errors or drops and reconnect
var reconnectDevice = function() {
	logger.info('initiating reconnect');
	setTimeout(function() {
		logger.info('reconnecting to arduino');
		connectDevice();
	}, 10000);
};

logger.info('Connect to:          ' + configData.server_url);
logger.info('Using port:          ' + configData.server_port);
logger.info('Path temp data:      ' + configData.location_temp);
logger.info('Path pic data:       ' + configData.location_pic);
logger.info('Add new station:     ' + configData.add_new_stations);
logger.info('Send remote picture: ' + configData.remote_cam);
logger.info('Send temp data:      ' + configData.remote_temp);
logger.info('Log level:           ' + configData.loglevel);
logger.info('Station filename:    ' + configData.station_file);

if(configData.remote_temp)
{	
	setTimeout(connectDevice, 1000);
}

setInterval(function() {
	
	if(configData.remote_cam)
	{	
		var strDate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') 
		logger.debug('send image: ' + strDate);
		sendPic();
	}
	
}, 1000 * 60 * 30); // send every 30 minutes


