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
const stationData = require('../stationRemote1.json');
const configData = require('../config.json');
const fs = require('fs');
const path = require('path');
const pnpFolder = path.join('../' ,'public','images');

var stations = new TempStations.TempStations(stationData);

const  Readline = SerialPort.parsers.Readline;

var serial;
var parser;
var crcError = 0;

var sendOutData = function(data) {
	
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
	  console.log('statusCode:', res.statusCode);
	  console.log('headers:', res.headers);
	
	  res.on('data', (d) => {
	    process.stdout.write(d);
	  });
	});
	
	req.on('error', (e) => {
	  console.error(e);
	});
	req.write(data);
	req.end();

};

var sendPic = function() {
	
	//console.log(data);
	var camFile = path.join(pnpFolder,'cam.jpg')
	child_process.execSync('raspistill -a 12 -md 0 -o '+ camFile);
	
	var data = fs.readFileSync(camFile);
	//console.log(data);
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
	  console.log('statusCode:', res.statusCode);
	  console.log('headers:', res.headers);
	
	  res.on('data', (d) => {
	    process.stdout.write(d);
	  });
	});
	
	req.on('error', (e) => {
	  console.error(e);
	});
	req.write(data);
	req.end();

};

var connectDevice = function() {
	var port = SerialPort.list(function(err, ports) {
		ports.forEach(function(port) {
			//console.log(port.comName);
			//console.log(port.pnpId);
			//console.log(port.manufacturer);
			if (port.manufacturer != undefined) {
				var name = port.manufacturer;
				if (name.startsWith('Arduino')) {
					console.log('Found Arduino at: ' + port.comName);
					DoConnect(port);
					return;
				}
			}
		 
		});
		
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
			console.log('close port');
			serial = null;
			parser = null;
			reconnectDevice();
		});
		
		serial.on('open', function() {
			console.log('port open ');
			setInterval(function() {
				console.log('send data');
				console.log(JSON.stringify(stations));		
				sendOutData(JSON.stringify(stations));	
				
			}, 1000 * 60 * 5); // send every 5 minutes
			
		});
		
		serial.on('error', function(err) {
		
			serial = null;
			parser = null;
			console.error("error", err);
			reconnectDevice();
		});
	
		parser.on('data', function(data) {
	
			var my = data.toString();
	
			// { ID: 5, Reset: 0, LOWBAT: 0, Temp: 22.3, Hygro: 47 }
			
			console.log(my);
			try {
				var obj = JSON.parse(my);
				if (obj.frame == 'data')
				{	
				
					var data = stations.findWhere({id: obj.ID});
							
					if(data  === undefined)
					{
						console.log('new id');
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
						//console.log(data);
						// Update
						data.set({"temp": obj.Temp});
						data.set({"hum" : obj.Hygro});
						data.set({"time": Date.now()});
						data.set({"reset": obj.Reset});
						data.set({"lowbattery": obj.LOWBAT});
						data.set({"timestr": new Date().toLocaleString()});
						//console.log(dataTemp);
					}
				}
				else if (obj.frame == 'info')
				{
					crcError = crcError + 1;
					console.log(crcError);
				}	
				else
				{
					
					console.log(obj);
				}
				} catch (e) {
				
			}
		});
};

// check for connection errors or drops and reconnect
var reconnectDevice = function() {
	console.log('INITIATING RECONNECT');
	setTimeout(function() {
		console.log('RECONNECTING TO ARDUINO');
		connectDevice();
	}, 10000);
};

console.log('Connect to:      ' + configData.server_url);
console.log('Using port:      ' + configData.server_port);
console.log('Path temp data:  ' + configData.location_temp);
console.log('Path pic data:   ' + configData.location_pic);
console.log('Add new station: ' + configData.add_new_stations);
setTimeout(connectDevice, 1000);


setInterval(function() {
	console.log('send image');
	sendPic();
	
}, 1000 * 60 * 1); // send every 1 minutes


