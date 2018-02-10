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

const path = require('path');
const SerialPort = require('serialport');
const rrdtool = require('rrdtool');
const winston = require('winston');
const TempStations = require('../app/models/tempstation');
const stationData = require('../station.json');

var stations = new TempStations.TempStations(stationData);


winston.level = 'info';
winston.add(winston.transports.File, { filename: 'temp.log' });

winston.info('Server start');

var Readline = SerialPort.parsers.Readline;
var serial = null;
var parser = null;


try{
	var f = path.join(__dirname, 'weather1.rrd');
	
	var db = rrdtool.open(f);
	
	var f2 = path.join(__dirname, 'weather2.rrd');
	var db2 = rrdtool.open(f2);
	
	var f3 = path.join(__dirname, 'weather3.rrd');
	var db3 = rrdtool.open(f3);

} catch (e) {
	console.log(e);
} 

var connectDevice = function() {
	var port = SerialPort.list(function(err, ports) {
		ports.forEach(function(port) {
			//console.log(port.comName);
			//console.log(port.pnpId);
			//console.log(port.manufacturer);
			if (port.manufacturer != undefined) {
				var name = port.manufacturer;
				console.log(typeof name);
				if (name.startsWith('Arduino')) {
					console.log('Found Arduino at ' + port.comName);
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
			winston.info('close port');
			serial = null;
			parser = null;
			reconnectDevice();
		});
		
		serial.on('open', function() {
			winston.info('port open ');
			setInterval(function() {
				console.log('save data');
				 var TimeNow = Date.now();
				 var dataTemp = {}; 
				stations.each(function(model){
					
					if(TimeNow - model.get('time') < 1000 * 60 * 20)
			    	{	
				    	var preFix = model.get('datasource');
				    	
						dataTemp["temps"+preFix]  = model.get('temp');
						dataTemp["hums"+preFix] = model.get('hum');
			    	}
					
				});
				console.log(dataTemp);
				delete dataTemp['hums-1'];
			    delete dataTemp['temps-1'];
			    var ol = Object.keys(dataTemp);
			    if ( ol.length  > 0) 
				{			
					try {
						
						db.update(dataTemp, function(err) {
							if (err != null)
								winston.info(err);
					});
					} catch (e) {
						return winston.error(e);
					}
				}	
				
			}, 1000 * 60 * 5);
			
		});
		
		serial.on('error', function(err) {
	
			winston.error("serial error");
			serial = null;
			parser = null;
			console.error("error", err);
			reconnectDevice();
		});
	
		parser.on('data', function(data) {
	
			var my = data.toString();
	
			// { ID: 5, Reset: 0, LOWBAT: 0, Temp: 22.3, Hygro: 47 }
			winston.debug(my);
			console.log(my);
			try {
				var obj = JSON.parse(my);
				
				var data = stations.findWhere({id: obj.ID});
						
				if(data  === undefined)
				{
					console.log('new id');
					if(obj.Reset)
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
					
					data.set({"temp": obj.Temp});
					data.set({"hum" : obj.Hygro});
					data.set({"time": Date.now()});
					data.set({"reset": obj.Reset});
					data.set({"lowbattery": obj.LOWBAT});
					data.set({"timestr": new Date().toLocaleString()});
					
				}	
			} catch (e) {
				winston.error(my);
				winston.error(e);
			}
		});
};

// check for connection errors or drops and reconnect
var reconnectDevice = function() {
	winston.info('INITIATING RECONNECT');
	setTimeout(function() {
		winston.info('RECONNECTING TO ARDUINO');
		connectDevice();
	}, 10000);
};

var getStationData = function() {
	return stations.toJSON();
};

var getHeaterData = function() {
	return myHeater.toJSON();	
};

var switchOn = function() {
	
	if(serial != null)
		serial.write('an\r\n');
};

var switchOff = function() {
	if(serial != null)
		serial.write('aus\r\n');
};

var getStatus = function() {
	if(serial != null)
		serial.write('status\r\n');
};

var updateDB2 = function(dataTemp) {
	
	console.log('do');	
	console.log(dataTemp);	
		
	try {
		db2.update(dataTemp, function(err) {
			if (err != null)
				winston.info(err);
		});
		} catch (e) {
			return winston.error(e);
		} 
};


exports.connectDevice = connectDevice;
exports.getStationData = getStationData;

exports.switchOn = switchOn;
exports.switchOff = switchOff;
exports.getStatus = getStatus;

exports.updateDB2 = updateDB2;
