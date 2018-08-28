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

const fs = require('fs');
const child_process = require('child_process');
const { exec } = require('child_process');
const express = require('express');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const db = require('./db');
const path = require('path');
const jsonBody = require('body/json');
const Rest = require('connect-rest');
const bodyParser = require('body-parser');
const {logger, logfolder} = require('./lib/logger');
const forcast = require('./lib/forcast');
const configData = require('./config.json');
const os = require('os');



var handlebars = require('express-handlebars')
.create({
    defaultLayout: 'main',
    helpers: {
        section: function (name, options) {
            if (!this._sections) {
                this._sections = {};
            }
            this._sections[name] = options.fn(this);
            return null;
        },
        formatTimeTwc:function(strTime) {
        	strTime = strTime.toString();
            // 2018-05-19T20:00:00+0200
            return strTime.substr(11,8);
        }
    }
});


const stationData = require('./stationRemote1.json');
const stationData2 = require('./stationRemote2.json');

const allPiData = require('./allPiRemote.json');

const pnpFolder = path.join(__dirname ,'picture');

const ar = require('./lib/temp');

const TempStations = require('./app/models/tempstation');

const RemotePiCollection = require('./app/models/remotestationpi');


var stationsRemote = new TempStations.TempStations();
var stationsDraRemote = new TempStations.TempStations();


var stationsMuc = new TempStations.TempStations(stationData);
var stationsDra = new TempStations.TempStations(stationData2);

var allpis = new RemotePiCollection.RemotePiCollection(allPiData);

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user. The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new Strategy(function(username, password, cb) {
	db.users.findByUsername(username, function(err, user) {
		if (err) {
			return cb(err);
		}
		if (!user) {
			logger.info("Login fail: "+ username);
			return cb(null, false);
		}
		if (user.password != password) {
			logger.info("Login fail: "+ username + " " + password );
			return cb(null, false);
		}
		logger.info("Login ok: "+ username);
		return cb(null, user);
	});
}));

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session. The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
	cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
	db.users.findById(id, function(err, user) {
		if (err) {
			return cb(err);
		}
		cb(null, user);
	});
});



// initial configuration of connect-rest. all-of-them are optional.
// default context is /api, all services are off by default
var options = {
	context: '/api'
	// logger:{ file: 'mochaTest.log', level: 'debug' },
	// apiKeys: [ '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9' ],
	// discover: { path: 'discover', secure: true },
	// proto: { path: 'proto', secure: true }
};



// Create a new Express application.
var app = express();

app.disable('x-powered-by');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
// app.use(require('morgan')('dev'));
app.use(require('cookie-parser')());
app.use(bodyParser.urlencoded({ extended : true }));
app.use(require('express-session')({
	secret : 'keyboard cat',
	resave : false,
	saveUninitialized : false
}));

app.use(bodyParser.raw( {inflate:false, limit:'10mb', type:'image/jpeg'} ));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// static routes
app.use(express.static(__dirname+'/public'));
app.use('/picture',require('connect-ensure-login').ensureLoggedIn(),express.static(__dirname + '/picture'))

// view engine
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');


app.get('/login', function(req, res) {
	 res.sendFile(path.join(__dirname, '/public/login.html'));
});

app.get('/stations', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {	
	res.render('stations', { layout:'main', title: 'Stations'});
});


app.get('/webcam', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
	
	var camFile = path.join(pnpFolder,'cam.jpg');
	var ipcam1File = path.join(pnpFolder,'ipcam1.jpg');
	var ipcam2File = path.join(pnpFolder,'ipcam2.jpg');
	var ipcam3File = path.join(pnpFolder,'ipcam3.jpg');
	
	logger.info("Webcam and ipcam page");
	// child_process.exec('LD_PRELOAD=/usr/lib/arm-linux-gnueabihf/libv4l/v4l1compat.so
	// fswebcam --save '+ camFile);
	child_process.execSync('wget -O '+ ipcam1File + ' ' + configData.ipcam1 +'/cgi-bin/getsnapshot.cgi');
	child_process.execSync('wget -O '+ ipcam2File + ' ' + configData.ipcam2 +'/cgi-bin/getsnapshot.cgi');
	child_process.execSync('wget -O '+ ipcam3File + ' ' + configData.ipcam3 +'/cgi-bin/getsnapshot.cgi');
	child_process.execSync('raspistill -rot 90 -a 12 -md 0 -o '+ camFile);
	res.render('webcam', { layout:'main', title: 'Webcam'});
});

app.get('/webcamremote', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
	logger.info("Webcam remote page");
	res.render('webcamRemote', { layout:'main', title: 'Webcam remote'});
});




// get stations data

app.get('/datastations',
	function(req, res) {
			// logger.debug(ar.getStationData());
			res.json(ar.getStationData());
});

app.get('/datastationsmuc',
		function(req, res) {
				// logger.debug(stationsRemote);
				res.json(stationsRemote.toJSON());
});


app.get('/datastationsdra',
		function(req, res) {
				// logger.debug(stationsRemote);
				res.json(stationsDraRemote.toJSON());
});

app.get('/weather',
		function(req, res) {
				var lat = req.query.lat;
				var lon = req.query.lon;
				var range = req.query.range;
				
				forcast.get15Forcast(res,lat,lon,range)
});


app.get('/control',  require('connect-ensure-login').ensureLoggedIn(),function(req, res) {
	
	logger.info("Control page");
	res.render('control', { layout:'main', title: 'Control'});
});

app.get('/admin',  require('connect-ensure-login').ensureLoggedIn(),function(req, res) {
	logger.info("Admin page");
	piHardwareVersion = fs.readFileSync('/proc/device-tree/model');
	runVersion = os.platform() + " " + os.release() + "    Node version: " + process.version + " " + piHardwareVersion;
	res.render('admin', { layout:'main', title: 'Admin',dayOn:ar.getHeater().get('dayNightTimeOn'),dayOff:ar.getHeater().get('dayNightTimeoff'),osVersion:runVersion,PiStations:allpis.toJSON()});
});

app.get('/muc',  require('connect-ensure-login').ensureLoggedIn(),function(req, res) {
	logger.info("Muc page");
	res.render('mainview', { layout:'main', title: 'Muc',stations:stationsMuc.toJSON(),prefix:'muc'});
});

app.get('/dra', require('connect-ensure-login').ensureLoggedIn(),function(req, res) {
	logger.info("Dra page");
	res.render('mainview', { layout:'main', title: 'Dra',stations:stationsDra.toJSON(),prefix:'dra'});
});

app.get('/map', require('connect-ensure-login').ensureLoggedIn(),function(req, res) {
	logger.info("Map page");
	res.render('map', { layout:'main', title: 'Dra'});
});


app.get('/heater',

		 function(req, res) {
			res.json(ar.getHeater().toJSON());			
		});


function updateBurner(err, payload) {
    // logger.debug(payload);
    ar.getHeater().set(payload);
    if(payload.burnerState === true)
    {
    	 logger.debug('switch on');
         ar.switchOn();
    }     
    else
    {
    	 logger.debug('switch off');
    	 ar.switchOff();
    }
    
    if (err) {
      logger.error(err);
    } else {

}};

function getStationJson(err, payload) {
    
	
	var dataTemp = {}; 
	stationsRemote.reset(payload);
    var TimeNow = Date.now();
    logger.debug(payload);
    
    stationsRemote.each(function(model) {
	// logger.debug(model.attributes);
	// model.get('id');
	// model.get('time');
	// logger.debug(TimeNow - model.get('time'));
	if((TimeNow - model.get('time')) < (1000 * 60 * 30))
	{	
    	var preFix = model.get('datasource');	
		dataTemp["temps"+preFix]  = model.get('temp');
		dataTemp["hums"+preFix] = model.get('hum');
		}
    });
    
    delete dataTemp['hums-1'];
    delete dataTemp['temps-1'];
    var ol = Object.keys(dataTemp);
   
    if ( ol.length  > 0)
    {
    	logger.debug("Save remote data");
    	ar.updateDB2(dataTemp);
    }
    if (err) {
      logger.error(err);
    } else {

}}

function getHostdata(err, payload) {
	
	var data = allpis.findWhere({
		hostname : payload.hostname
	});
	if (data === undefined) {
		logger.info('found new hostname '+ payload.hostname);
		
	} else {
		
		data.set({
			"release" :payload.release
		});
		
		data.set({
			"node" :payload.node
		});
		data.set({
			"piHardwareVersion" :payload.piHardwareVersion
		});
		//console.log(data);
	}
}

function getStationDraJson(err, payload) {
    
	// logger.debug(payload);
	var dataTemp = {}; 
	stationsDraRemote.reset(payload);
    var TimeNow = Date.now();
    // logger.debug(payload);
    
    stationsDraRemote.each(function(model) {
	
	if((TimeNow - model.get('time')) < (1000 * 60 * 30))
	{	
    	var preFix = model.get('datasource');	
		dataTemp["temps"+preFix]  = model.get('temp');
		dataTemp["hums"+preFix] = model.get('hum');
		}
    });
    
    delete dataTemp['hums-1'];
    delete dataTemp['temps-1'];
    var ol = Object.keys(dataTemp);
   
    if ( ol.length  > 0)
    {
    	logger.debug("Save remote data");
    	ar.updateDB3(dataTemp);
    }
    if (err) {
      logger.error(err);
    } else {

}}

//
// Client data

app.post('/mucdata',
		function(req, res) {
	    jsonBody(req, res, getStationJson);
		res.send('ok');
		res.end();		
});

app.post('/dradata',
		function(req, res) {
	    jsonBody(req, res, getStationDraJson);
		res.send('ok');
		res.end();		
});

app.post('/hostdata',
		function(req, res) {
	    jsonBody(req, res, getHostdata);
		res.send('ok');
		res.end();		
});

app.post('/heater',

	function(req, res) {
	 jsonBody(req, res, updateBurner);
	
	    res.send('ok');
	    res.end();		
});

//
// Camera post
//

app.post('/dracam',

		function(req, res) {
		
			logger.debug(req.headers);
			var picFile = path.join(pnpFolder,"dracam.jpg");
			fs.writeFile(picFile, req.body, function(err) {
		        if(err) {
		            logger.error(err);
		        } else {
		        	logger.debug("pic save " + picFile);
		        }
		    });
		    res.send('ok');
		    res.end();		
	});


app.post('/muccam',

		function(req, res) {
		
			// logger.debug(req.headers);
			var picFile  = path.join(pnpFolder,"muccam.jpg")
			fs.writeFile(picFile, req.body, function(err) {
		        if(err) {
		            logger.error(err);
		        } else {
		            logger.debug("pic save " + picFile);
		        }
		    });
		    res.send('ok');
		    res.end();		
	});

app.post('/dipcam1',

		function(req, res) {
		
			// logger.debug(req.headers);
			var picFile = path.join(pnpFolder,"dipcam1.jpg");
			fs.writeFile(picFile, req.body, function(err) {
		        if(err) {
		            logger.error(err);
		        } else {
		        	logger.debug("pic save " + picFile);
		        }
		    });
		    res.send('ok');
		    res.end();		
	});

app.post('/dipcam2',

		function(req, res) {
		
			// logger.debug(req.headers);
			var picFile = path.join(pnpFolder,"dipcam2.jpg");
			fs.writeFile(picFile, req.body, function(err) {
		        if(err) {
		            logger.error(err);
		        } else {
		        	logger.debug("pic save " + picFile);
		        }
		    });
		    res.send('ok');
		    res.end();		
	});

app.post('/dipcam3',

		function(req, res) {
		
			// logger.debug(req.headers);
			var picFile = path.join(pnpFolder,"dipcam3.jpg");
			fs.writeFile(picFile, req.body, function(err) {
		        if(err) {
		            logger.error(err);
		        } else {
		        	logger.debug("pic save " + picFile);
		        }
		    });
		    res.send('ok');
		    res.end();		
	});


// Login
app.post('/login', passport.authenticate('local', {
	failureRedirect : '/login'
}), function(req, res) {
	res.redirect('/');
});


// Control admin
app.post('/admincontrol', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
	
	ar.getHeater().set({
		"dayNightTimeOn" : req.body.ControlSelectDayOn
	});
	
	ar.getHeater().set({
		"dayNightTimeoff" : req.body.ControlSelectDayOff
	});
	
	if (req.body.CheckResetRuntime !== undefined)
	{
		logger.info("Reset runtim");
		ar.ResetRuntimeData();
		ar.getHeizungData();
	}
	if(req.body.CheckResetStationList !== undefined)
	{
		logger.info("Reset station list");
		stationsDraRemote.reset();
		stationsRemote.reset();
		
	}	
	
	if(req.body.UpgradePI !== undefined)
	{
		logger.info("Upgrade system");
		child_process.execSync('apt-get update');
		child_process.execSync('apt-get -y upgrade');
	}
	
	if(req.body.CheckReboot !== undefined)
	{
		logger.info("Reboot system");
		req.logout();
		res.redirect('/');
		exec('/sbin/reboot');
		
	}	

	res.redirect('/control');	
});

app.get('/logout', function(req, res) {
	
	req.logout();
	logger.info("Logout");
	res.redirect('/');
});


// log routes
app.get('/log', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
	var logtext = fs.readFileSync(path.join(__dirname, '/lib/temp.log'),'utf8')
	
	logtext = logtext.replace(/\n/g,'<br>');
	res.render('logfile', { layout:'main',logdata: logtext});

});

// delete log
app.get('/deleteLog', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
	
	fs.writeFileSync(logfolder(),"");
	res.send('ok');
	res.end();		
});


// update week and day graph

var updatePng = function(prefix,count,dbprefix){
	
	logger.debug("updatePng: " + prefix);
	var pngPathName = path.join(pnpFolder, 'burner.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:runtime1=./lib/burner.rrd:runtime1:AVERAGE','AREA:runtime1#000000:Runtime']);

		
	for(var i=1; i <= count; i++)
	{
		// Day
		var pngPathName = path.join(pnpFolder, prefix + 'hum'+ i +'.png');
		child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums'+i+'=./lib/weather'+ dbprefix + '.rrd:hums'+i+':AVERAGE','LINE1:hums'+i+'#000000:Humidity']);
		var pngPathName = path.join(pnpFolder, prefix +  'temp'+ i +'.png');
		child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps'+i+'=./lib/weather'+ dbprefix + '.rrd:temps'+i+':AVERAGE','LINE1:temps'+i+'#000000:Temp']);
		
		// week
		var pngPathName = path.join(pnpFolder, prefix + 'humWeek'+ i +'.png');
		child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:hums'+i+'=./lib/weather'+ dbprefix + '.rrd:hums'+i+':AVERAGE','LINE1:hums'+i+'#000000:Humidity']);
		var pngPathName = path.join(pnpFolder, prefix + 'tempWeek'+ i +'.png');
		child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:temps'+i+'=./lib/weather'+ dbprefix + '.rrd:temps'+i+':AVERAGE','LINE1:temps'+i+'#000000:Temp']);

	}
}

app.get('/',require('connect-ensure-login').ensureLoggedIn(),

		 function(req, res) {
	  		var my = ar.getStationData()
	  		logger.info("Villa main page");
			res.render('mainview', { title: 'Villa',stations:my,prefix:''});

});

// Handle 404
app.use(function(req, res, next) {
	res.redirect('/');
    
});

app.listen(3000, function () {
	  logger.info('Heizung listening on port 3000');
});


updatePng('',8,'1');
updatePng('muc',4,'2');
updatePng('dra',7,'3');

// connect Arduino
setTimeout(ar.connectDevice, 1000);

// Check night/day switch
setInterval(function() { 
	logger.debug('Check state');
	var d = new Date();
	var current_hour = d.getHours();
	
	ar.getHeizungData();
	ar.getStatus();
	
	if(ar.getHeater().get('dayNightState'))
	{
		
		var start = ar.getHeater().get('dayNightTimeOn');
		var end = ar.getHeater().get('dayNightTimeoff');
		
		logger.debug('dayNightTimeOn ' + start);
		logger.debug('dayNightTimeoff ' + end);

		
		if(( current_hour >= start ) &&( current_hour < end ))
		{
			// on
			logger.debug('switch on');
	        ar.switchOn();
		}
		else
		{
		   // off
		   logger.debug('switch off');
	       ar.switchOff();
		}
	}
},1000 * 60 * 1);  // every minute

// Update data graph
setInterval(function() {
	
	updatePng('',9,'1');
	updatePng('muc',5,'2');
	updatePng('dra',7,'3');
	
},1000 * 60 * 10);  // every 10 minutes
