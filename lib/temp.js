var path = require('path');
var SerialPort = require('serialport');
var rrdtool = require('rrdtool');
var winston = require('winston');
var TempStations = require('../app/models/tempstation');

var stationData = require('../station.json');
var stations = new TempStations(stationData);


winston.level = 'info';
winston.add(winston.transports.File, { filename: 'temp.log' });

winston.info('Server start');

var Readline = SerialPort.parsers.Readline;
var serial;
var parser;

var f = path.join(__dirname, 'weather.rrd');
var db = rrdtool.open(f);

var dataTemp = {
		time1  : 0,
		temps1 : 0,
		hums1  : 0,
		time2  : 0,
		temps2 : 0,
		hums2  : 0,
		time3  : 0,
		temps3 : 0,
		hums3  : 0
	};

var connectDevice = function() {
	var port = SerialPort.list(function(err, ports) {
		ports.forEach(function(port) {
			console.log(port.comName);
			console.log(port.pnpId);
			console.log(port.manufacturer);
			if (port.manufacturer != undefined) {
				var name = port.manufacturer;
				console.log(typeof name);
				if (name.startsWith('Arduino')) {
					console.log('!!!!!!!');
					return port;
				}
			}
		});
	});

	serial = new SerialPort('/dev/ttyACM0', {
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
			timestap = Date.now();
			
			delete dataTemp.time1;
			delete dataTemp.time2;
			delete dataTemp.time3;
			
			try {
			db.update(dataTemp, function(err) {
				if (err != null)
					winston.info(err);
			});
			} catch (e) {
				return winston.error(e);
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
			}		
			else{
				//console.log(data);
				var preFix = data.get('datasource');
				dataTemp["temps"+preFix]  = obj.Temp;
				dataTemp["hums"+preFix] = obj.Hygro;
				dataTemp["time"+preFix] = Date.now();
				//console.log(dataTemp);
			}
			
	
		} catch (e) {
			return winston.error(e);
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

module.exports.connectDevice = connectDevice;