/*
	Heizung
    
	Copyright (C) 2018-2021 Mandl

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
const { logger, logfolder } = require('../lib/logger');
const fs = require('fs');
const path = require('path');
const pnpFolder = path.join('../', 'picture');
const rpio = require('../lib/sx1276');
const sensor = require('../lib/dht-sensor');
const powerData = require('../PowerData.json');
const power = require('../app/models/heizungPower');

const os = require('os');


const stationData = require(configData.station_file);
var stations = new TempStations.TempStations(stationData);

const Readline = SerialPort.parsers.Readline;

var serial;
var parser;
var crcError = 0;

var RelaisStat = true;

var hostname = os.hostname()
var piHardwareVersion = fs.readFileSync('/proc/device-tree/model', { encoding: 'utf8' });
var hostdata = { hostname: hostname, release: os.release(), node: process.version, piHardwareVersion: piHardwareVersion };

var sendOutData = function (data) {

	//console.log(data);
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
		logger.debug(e);
	});
	req.write(data);
	req.end();

};

var pollStatus = function (data) {

	var headers = {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(data)
	};
	const options = {
		hostname: configData.server_url,
		port: configData.server_port,
		path: "/mucon",
		rejectUnauthorized: false,
		encoding: "utf8",
		method: 'GET',
		headers: headers,
		json: true

	};
	const req = https.request(options, (res) => {
		logger.debug('statusCode:', res.statusCode);
		logger.debug('headers:', res.headers);
		res.on('data', (d) => {
			try {
				let result = JSON.parse(d.toString('utf8'));
				// console.log(result)
				if (result.PowerState === true) {
					if (RelaisStat === true) {
						logger.info('Relais off');
						rpio.RelaisOff();
						RelaisStat = false;
					}
				}
				else {
					if (RelaisStat === false) {
						logger.info('Relais on');
						rpio.RelaisOn();
						RelaisStat = true;
					}
				}
			} catch (e) {

				logger.debug(e)
			}
		});
	});

	req.on('error', (e) => {
		logger.debug(e);
	});
	req.write(data);
	req.end();
}



var sendHostdata = function (data) {

	var headers = {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(data)
	};
	const options = {
		hostname: configData.server_url,
		port: configData.server_port,
		path: "/hostdata",
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
		logger.debug(e);
	});
	req.write(data);
	req.end();
}
var sendPic = function () {

	// logger.info(data);
	var camFile = path.join(pnpFolder, 'cam.jpg')
	child_process.execSync('raspistill -a 12 -md 0 -o ' + camFile);

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
		logger.debug(e);
	});
	req.write(data);
	req.end();
};


var searchForDevice = function () {
	logger.info('searchForDevice');
	setTimeout(function () {
		connectDevice();
	}, 10000);
};

var connectDevice = function () {
	var portFound = false;
	SerialPort.list(function (err, ports) {
		ports.forEach(function (port) {
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
		if (portFound == false) {
			searchForDevice();
		}

	});

};

var DoConnect = function (port) {

	serial = new SerialPort(port.comName, {
		baudRate: 115200
	});
	parser = serial.pipe(new Readline({
		delimiter: '\r\n'
	}));

	serial.on('close', function () {
		logger.info('close port');
		serial = null;
		parser = null;
		reconnectDevice();
	});

	serial.on('open', function () {
		logger.info('port open ');


	});

	serial.on('error', function (err) {
		// error do reconnect
		serial = null;
		parser = null;
		logger.error("error", err);
		reconnectDevice();
	});

	parser.on('data', function (data) {

		var my = data.toString();
		// { ID: 5, Reset: 0, LOWBAT: 0, Temp: 22.3, Hygro: 47 }
		logger.debug(my);
		TempDataParse(my);

	});
};

var TempDataParse = function (my) {
	try {
		var obj = JSON.parse(my);
		if (obj.frame == 'data') {
			var data = stations.findWhere({ id: obj.ID });
			if (data === undefined) {
				// found new station
				logger.debug('new id');
				if ((obj.Reset) && (configData.add_new_stations)) {
					// reset flag is activ
					stations.add({
						id: obj.ID,
						label: 0,
						name: "New",
						state: 1,
						time: Date.now(),
						reset: obj.Reset,
						lowbattery: obj.LOWBAT,
						timestr: new Date().toLocaleString('de-DE'),
						datasource: "-1"
					});
				}
			}
			else {
				// Update data
				data.set({ "temp": obj.Temp });
				data.set({ "hum": obj.Hygro });
				data.set({ "time": Date.now() });
				data.set({ "state": 1 });
				data.set({ "reset": obj.Reset });
				data.set({ "lowbattery": obj.LOWBAT });
				data.set({ "timestr": new Date().toLocaleString('de-DE') });
			}
		}
		else if (obj.frame == 'info') {
			// crc error
			crcError = crcError + 1;
			logger.debug("CRC errors: ", crcError);
		}
		else {
			logger.error(obj);
		}
	} catch (e) {
		logger.error(my);
		logger.error(e);
	}

}
// check for connection errors or drops and reconnect
var reconnectDevice = function () {
	logger.info('initiating reconnect');
	setTimeout(function () {
		logger.info('reconnecting to arduino');
		connectDevice();
	}, 10000);
};

function main() {

	logger.info('Connect to:          ' + configData.server_url);
	logger.info('Using port:          ' + configData.server_port);
	logger.info('Path temp data:      ' + configData.location_temp);
	logger.info('Path pic data:       ' + configData.location_pic);
	logger.info('Add new station:     ' + configData.add_new_stations);
	logger.info('Send remote picture: ' + configData.remote_cam);
	logger.info('Send temp data:      ' + configData.remote_temp);
	logger.info('Log level:           ' + configData.loglevel);
	logger.info('Station filename:    ' + configData.station_file);
	logger.info('Use local RFM95:     ' + configData.localRFM95);
	logger.info('Use local DHT22:     ' + configData.localDHT22);
	logger.info('Use relais muc:      ' + configData.muc_power);

	// use arduino board
	if (configData.remote_temp) {
		setTimeout(connectDevice, 1000);
	}

	// send temp data
	if ((configData.remote_temp) || (configData.localRFM95) || (configData.localDHT22)) {
		setInterval(function () {
			logger.debug('send data');
			logger.debug(JSON.stringify(stations));
			sendOutData(JSON.stringify(stations));

		}, 1000 * 60 * 5); // send every 5 minutes
	}

	// send host data
	sendHostdata(JSON.stringify(hostdata));
	setInterval(function () {
		logger.debug('send hostdata');
		logger.debug(JSON.stringify(hostdata));

		sendHostdata(JSON.stringify(hostdata));

	}, 1000 * 60 * 5); // send every 5 minutes

	// remove all old station from list
	setInterval(function () {
		logger.debug('reset station list');
		let timenow = Date.now();
		
		for (var i = 0; i < stations.length; ++i) {
			let timeStation = stations.at(i).get("time");
			let secDiff = Math.floor((timenow - timeStation) / 1000);
			let minDiff = Math.floor(secDiff / 60);

			
			if (minDiff > 30) {
				// more then 30 min
				let ResetFlag = stations.at(i).get("reset");
				let state = stations.at(i).get("state");
				if (((ResetFlag === 1) || (datasource === -1)) && (state === 0)) {
					// reset flag is activ and no update since 1 h
					stations.remove(stations.at(i));
				}
				else {
					// station is offline
					stations.at(i).set({ "state": 0 });
				
				}
			}
		};
	}, 1000 * 60 * 10); // send every 10 minutes

	// send a remote picture
	if (configData.remote_cam) {
		sendPic();
		setInterval(function () {

			var strDate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
			logger.debug('send image: ' + strDate);
			sendPic();

		}, 1000 * 60 * 20); // send every 20 minutes
	}

	// use local RFM95 receiver
	if (configData.localRFM95) {

		rpio.FSKBegin();
		rpio.FSKReset();
		rpio.FSKRxChainCalibration();

		var version = rpio.FSKGetVersion();
		logger.info('RFM95 version: ' + version);

		rpio.FSKOn();
		setInterval(function () {

			var mystr;
			mystr = rpio.FSKGetData();
			if (mystr != "timeout") {
				logger.debug(mystr);
				TempDataParse(mystr);
			}

		}, 500); // every 500 ms
	}

	// power switch muc
	if (configData.muc_power) {

		rpio.RelaisInit();

		// switch on = no power at heater
		logger.info('Relais on');
		RelaisStat = true;
		rpio.RelaisOn();

		setInterval(function () {

			pollStatus(JSON.stringify(hostdata))

		}, 1000 * 10); // every 10 seconds 
	}

	// use local DHT sensor
	if (configData.localDHT22) {
		setInterval(function () {

			// Sensor DHT22, Pin 2
			var readout = sensor.read(22, 2);

			if (readout.isValid) {
				var strData = "{\"frame\":\"data\",\"ID\":99,\"Reset\":0,\"LOWBAT\":0,\"Temp\":" + readout.temperature.toFixed(1) + ",\"Hygro\":" + readout.humidity.toFixed(1) + "}";

				logger.debug(strData);
				TempDataParse(strData);
			}
		}, 1000 * 10); // every 10 seconds 
	}

}

if (require.main === module) {
	main();
}
