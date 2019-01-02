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
const { exec } = require('child_process');
const { execFileSync} = require('child_process');
const { execSync} = require('child_process');
const express = require('express');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const db = require('./db');
const path = require('path');
const jsonBody = require('body/json');
const bodyParser = require('body-parser');
const {logger, logfolder} = require('./lib/logger');
const forcast = require('./lib/forcast');
const configData = require('./config.json');
const os = require('os');
const proxy = require('express-http-proxy');
const math = require('mathjs');
const moment = require('moment');



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





// Create a new Express application.
var app = express();

app.disable('x-powered-by');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
// app.use(require('morgan')('dev'));
app.use(require('cookie-parser')());
app.use(bodyParser.urlencoded({ extended : true }));
app.use(require('express-session')({
	secret : configData.secret,
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
	 //res.sendFile(path.join(__dirname, '/public/login.html'));
    res.render('login', { layout:'main', title: 'Login'});
    
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
	
	execSync('wget -q -O '+ ipcam1File + ' ' + configData.ipcam1 +'/cgi-bin/getsnapshot.cgi');
	execSync('wget -q -O '+ ipcam2File + ' ' + configData.ipcam2 +'/cgi-bin/getsnapshot.cgi');
	execSync('wget -q -O '+ ipcam3File + ' ' + configData.ipcam3 +'/cgi-bin/getsnapshot.cgi');
	execSync('raspistill -rot 90 -a 12 -md 0 -o '+ camFile);
	
	res.render('webcam', { layout:'main', title: 'Webcam'});
});

app.get('/webcamremote', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
	logger.info("Webcam remote page");
	res.render('webcamRemote', { layout:'main', title: 'Webcam remote'});
});


app.get('/', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
	logger.info("villa page");
    var dataJson = path.join(pnpFolder, 'temp1.json');
    var humDataJson = path.join(pnpFolder, 'hum1.json');
    
    var count = 8;
    
    var chartColors = {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
        };
   
    var chartData2 = {
           
            labels: [],
            datasets: [{data: [],label:"Outside",borderColor:chartColors.red,fill: false},
                       {data: [],label:"Living",backgroundColor:chartColors.orange,fill: false},
                       {data: [],label:"Dining",backgroundColor:chartColors.yellow,fill: false},
                       {data: [],label:"Plants",backgroundColor:chartColors.green,fill: false},
                       {data: [],label:"Wasch",backgroundColor:chartColors.blue,fill: false},
                       {data: [],label:"Roof",backgroundColor:chartColors.purple,fill: false},
                       {data: [],label:"Heater",backgroundColor:chartColors.grey,fill: false},
                       {data: [],label:"Bad",backgroundColor:chartColors.red,fill: false}
                      ]
           
    };
    
    var chartHumData = {
            
            labels: [],
            datasets: [{data: [],label:"Outside",borderColor:chartColors.red,fill: false},
                       {data: [],label:"Living",backgroundColor:chartColors.orange,fill: false},
                       {data: [],label:"Dining",backgroundColor:chartColors.yellow,fill: false},
                       {data: [],label:"Plants",backgroundColor:chartColors.green,fill: false},
                       {data: [],label:"Wasch",backgroundColor:chartColors.blue,fill: false},
                       {data: [],label:"Roof",backgroundColor:chartColors.purple,fill: false},
                       {data: [],label:"Heater",backgroundColor:chartColors.grey,fill: false},
                       {data: [],label:"Bad",backgroundColor:chartColors.red,fill: false}
                       ]
           
    };
    
    let rawdata = fs.readFileSync(dataJson); 
    let rawhumdata = fs.readFileSync(humDataJson); 
    var tempdata = JSON.parse(rawdata);  
    var humdata = JSON.parse(rawhumdata);  
    var startTime = tempdata.meta.start;
    // console.log(tempdata.data[0]);
    // console.log(tempdata.data.length);
    
    moment.locale('de');
    const date = moment.unix(startTime);
 
    for(var i=0; i<tempdata.data.length; i++)
    {// console.log(typeof tempdata.data[i][0]);
        chartData2.labels[i]=date.format("LT");
        for(var n=0; n < count; n++)
        {
           if( tempdata.data[i][n] != null)
           {
               chartData2.datasets[n].data[i] = math.round(tempdata.data[i][n],1);   
           }
        }  
        date.add(900, 'seconds');
    }
    
    const date2 = moment.unix(startTime);
    
    for(var i=0; i<humdata.data.length; i++)
    {// console.log(typeof tempdata.data[i][0]);
        chartHumData.labels[i]=date2.format("LT");
        for(var n=0; n < count ; n++)
        {
           if( humdata.data[i][n] != null)
           {
               chartHumData.datasets[n].data[i] = math.round(humdata.data[i][n],1);   
           }
        }  
        date2.add(900, 'seconds');
    }
   
    // console.log(JSON.stringify(chartHumData));
 
	res.render('graphview', { layout:'main', title: 'Villa', tempData : encodeURIComponent(JSON.stringify(chartData2)),humData: encodeURIComponent(JSON.stringify(chartHumData))});
});



app.get('/dra', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
    logger.info("dra page");
    var dataJson = path.join(pnpFolder, 'temp3.json');
    var humDataJson = path.join(pnpFolder, 'hum3.json');
    
    var count = 7;
    
    var chartColors = {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
        };
   
    var chartData2 = {
           
            labels: [],
            datasets: [{data: [],label:"Living",borderColor:chartColors.red,fill: false},
                       {data: [],label:"Keller Tief",backgroundColor:chartColors.orange,fill: false},
                       {data: [],label:"Kitchen",backgroundColor:chartColors.yellow,fill: false},
                       {data: [],label:"Waschkeller",backgroundColor:chartColors.green,fill: false},
                       {data: [],label:"Bad",backgroundColor:chartColors.blue,fill: false},
                       {data: [],label:"Hobby",backgroundColor:chartColors.purple,fill: false},
                       {data: [],label:"Outside",backgroundColor:chartColors.grey,fill: false}
                      ]
           
    };
    
    var chartHumData = {
            
            labels: [],
            datasets: [{data: [],label:"Living",borderColor:chartColors.red,fill: false},
                       {data: [],label:"Keller Tief",backgroundColor:chartColors.orange,fill: false},
                       {data: [],label:"Kitchen",backgroundColor:chartColors.yellow,fill: false},
                       {data: [],label:"Waschkeller",backgroundColor:chartColors.green,fill: false},
                       {data: [],label:"Bad",backgroundColor:chartColors.blue,fill: false},
                       {data: [],label:"Hobby",backgroundColor:chartColors.purple,fill: false},
                       {data: [],label:"Outside",backgroundColor:chartColors.grey,fill: false}
                       ]
           
    };
    
    let rawdata = fs.readFileSync(dataJson); 
    let rawhumdata = fs.readFileSync(humDataJson); 
    var tempdata = JSON.parse(rawdata);  
    var humdata = JSON.parse(rawhumdata);  
    var startTime = tempdata.meta.start;
    // console.log(tempdata.data[0]);
    // console.log(tempdata.data.length);
    
    moment.locale('de');
    const date = moment.unix(startTime);
 
    for(var i=0; i<tempdata.data.length; i++)
    {// console.log(typeof tempdata.data[i][0]);
        chartData2.labels[i]=date.format("LT");
        for(var n=0; n < count; n++)
        {
           if( tempdata.data[i][n] != null)
           {
               chartData2.datasets[n].data[i] = math.round(tempdata.data[i][n],1);   
           }
        }  
        date.add(900, 'seconds');
    }
    
    const date2 = moment.unix(startTime);
    
    for(var i=0; i<humdata.data.length; i++)
    {// console.log(typeof tempdata.data[i][0]);
        chartHumData.labels[i]=date2.format("LT");
        for(var n=0; n < count ; n++)
        {
           if( humdata.data[i][n] != null)
           {
               chartHumData.datasets[n].data[i] = math.round(humdata.data[i][n],1);   
           }
        }  
        date2.add(900, 'seconds');
    }
   
    // console.log(JSON.stringify(chartHumData));
 
    res.render('graphview', { layout:'main', title: 'Dra', tempData : encodeURIComponent(JSON.stringify(chartData2)),humData: encodeURIComponent(JSON.stringify(chartHumData))});
});

app.get('/muc', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
    logger.info("muc");
    var dataJson = path.join(pnpFolder, 'temp2.json');
    var humDataJson = path.join(pnpFolder, 'hum2.json');
    
    var count = 5;
    
    var chartColors = {
            red: 'rgb(255, 99, 132)',
            orange: 'rgb(255, 159, 64)',
            yellow: 'rgb(255, 205, 86)',
            green: 'rgb(75, 192, 192)',
            blue: 'rgb(54, 162, 235)',
            purple: 'rgb(153, 102, 255)',
            grey: 'rgb(201, 203, 207)'
        };
   
    var chartData2 = {
           
            labels: [],
            datasets: [{data: [],label:"Outside",borderColor:chartColors.red,fill: false},
                       {data: [],label:"Bad",backgroundColor:chartColors.orange,fill: false},
                       {data: [],label:"",backgroundColor:chartColors.yellow,fill: false},
                       {data: [],label:"Living",backgroundColor:chartColors.green,fill: false},
                       {data: [],label:"Board",backgroundColor:chartColors.blue,fill: false}
                      ]
           
    };
    
    var chartHumData = {
            
            labels: [],
            datasets: [{data: [],label:"Outside",borderColor:chartColors.red,fill: false},
                       {data: [],label:"Bad",backgroundColor:chartColors.orange,fill: false},
                       {data: [],label:"",backgroundColor:chartColors.yellow,fill: false},
                       {data: [],label:"Living",backgroundColor:chartColors.green,fill: false},
                       {data: [],label:"Board",backgroundColor:chartColors.blue,fill: false}
                       ]
           
    };
    
    let rawdata = fs.readFileSync(dataJson); 
    let rawhumdata = fs.readFileSync(humDataJson); 
    var tempdata = JSON.parse(rawdata);  
    var humdata = JSON.parse(rawhumdata);  
    var startTime = tempdata.meta.start;
    // console.log(tempdata.data[0]);
    // console.log(tempdata.data.length);
    
    moment.locale('de');
    const date = moment.unix(startTime);
 
    for(var i=0; i<tempdata.data.length; i++)
    {// console.log(typeof tempdata.data[i][0]);
        chartData2.labels[i]=date.format("LT");
        for(var n=0; n < count; n++)
        {
           if( tempdata.data[i][n] != null)
           {
               chartData2.datasets[n].data[i] = math.round(tempdata.data[i][n],1);   
           }
        }  
        date.add(900, 'seconds');
    }
    
    const date2 = moment.unix(startTime);
    
    for(var i=0; i<humdata.data.length; i++)
    {// console.log(typeof tempdata.data[i][0]);
        chartHumData.labels[i]=date2.format("LT");
        for(var n=0; n < count ; n++)
        {
           if( humdata.data[i][n] != null)
           {
               chartHumData.datasets[n].data[i] = math.round(humdata.data[i][n],1);   
           }
        }  
        date2.add(900, 'seconds');
    }
   
    // console.log(JSON.stringify(chartHumData));
 
    res.render('graphview', { layout:'main', title: 'Muc', tempData : encodeURIComponent(JSON.stringify(chartData2)),humData: encodeURIComponent(JSON.stringify(chartHumData))});
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
	   var dataJson = path.join(pnpFolder, 'burner.json');
	  
	    
	    var count = 1;
	    
	    var chartColors = {
	            red: 'rgb(255, 99, 132)',
	            orange: 'rgb(255, 159, 64)',
	            yellow: 'rgb(255, 205, 86)',
	            green: 'rgb(75, 192, 192)',
	            blue: 'rgb(54, 162, 235)',
	            purple: 'rgb(153, 102, 255)',
	            grey: 'rgb(201, 203, 207)'
	        };
	   
	    var chartData2 = {
	           
	            labels: [],
	            datasets: [{data: [],label:"Runtime",borderColor:chartColors.red,fill: false}
	                     
	                      ]      
	    };
	    
	    
	    let rawdata = fs.readFileSync(dataJson); 
	  
	    var tempdata = JSON.parse(rawdata);  
	    var startTime = tempdata.meta.start;
	
	    
	    moment.locale('de');
	    const date = moment.unix(startTime);
	 
	    for(var i=0; i<tempdata.data.length; i++)
	    {
	        chartData2.labels[i]=date.format("LT");
	        for(var n=0; n < count; n++)
	        {
	           if( tempdata.data[i][n] != null)
	           {
	               chartData2.datasets[n].data[i] = math.round(tempdata.data[i][n],1);   
	           }
	        }  
	        date.add(300, 'seconds');
	    }
	    
	res.render('control', { layout:'main', title: 'Control',burnerData : encodeURIComponent(JSON.stringify(chartData2))});
});

app.get('/admin',  require('connect-ensure-login').ensureLoggedIn(),function(req, res) {
	logger.info("Admin page");
	piHardwareVersion = fs.readFileSync('/proc/device-tree/model');
	runVersion = os.platform() + " " + os.release() + "    Node version: " + process.version + " " + piHardwareVersion;
	res.render('admin', { layout:'main', title: 'Admin',dayOn:ar.getHeater().get('dayNightTimeOn'),dayOff:ar.getHeater().get('dayNightTimeoff'),osVersion:runVersion,PiStations:allpis.toJSON()});
});



// app.get('/dra',
// require('connect-ensure-login').ensureLoggedIn(),function(req, res) {
// logger.info("Dra page");
// res.render('mainview', { layout:'main', title:
// 'Dra',stations:stationsDra.toJSON(),prefix:'dra'});
// });

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
		allpis.add({
		   hostname : payload.hostname,
	       release : payload.release,
	       node  : payload.node,
	       location: "?",
	       piHardwareVersion:payload.piHardwareVersion,
	       pingDate:new Date().toLocaleString('de-DE')
		});
		
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
		data.set({
			"pingDate" : new Date().toLocaleString('de-DE')
		});
		// console.log(data);
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



app.use('/vdr', require('connect-ensure-login').ensureLoggedIn(),proxy(configData.serverOne));

app.use('/video', require('connect-ensure-login').ensureLoggedIn(),proxy(configData.serverTwo));

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
		execSync('apt-get update');
		execSync('apt-get -y upgrade');
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


// update JSON
var updateJSON = function(){
    logger.debug("updateJSON");
    for(var i=1; i <= 3; i++)
    {
        var pngPathName = path.join(pnpFolder,'hum'+ i +'.json');
        const child = execFileSync('rrdtool',['xport','-s now-24h','-e now','--json','DEF:hums1=./lib/weather'+ i + '.rrd:hums1:AVERAGE','DEF:hums2=./lib/weather'+ i + '.rrd:hums2:AVERAGE','DEF:hums3=./lib/weather'+ i + '.rrd:hums3:AVERAGE','DEF:hums4=./lib/weather'+ i + '.rrd:hums4:AVERAGE','DEF:hums5=./lib/weather'+ i + '.rrd:hums5:AVERAGE','DEF:hums6=./lib/weather'+ i + '.rrd:hums6:AVERAGE','DEF:hums7=./lib/weather'+ i + '.rrd:hums7:AVERAGE','DEF:hums8=./lib/weather'+ i + '.rrd:hums8:AVERAGE','XPORT:hums1:humity1','XPORT:hums2:humity2','XPORT:hums3:humity3','XPORT:hums4:humity4','XPORT:hums5:humity5','XPORT:hums6:humity6']);
        fs.writeFileSync(pngPathName, child);
        
        var pngPathName = path.join(pnpFolder,'temp'+ i +'.json');
        const child2 = execFileSync('rrdtool',['xport','-s now-24h','-e now','--json','DEF:temps1=./lib/weather'+ i + '.rrd:temps1:AVERAGE','DEF:temps2=./lib/weather'+ i + '.rrd:temps2:AVERAGE','DEF:temps3=./lib/weather'+ i + '.rrd:temps3:AVERAGE','DEF:temps4=./lib/weather'+ i + '.rrd:temps4:AVERAGE','DEF:temps5=./lib/weather'+ i + '.rrd:temps5:AVERAGE','DEF:temps6=./lib/weather'+ i + '.rrd:temps6:AVERAGE','DEF:temps7=./lib/weather'+ i + '.rrd:temps7:AVERAGE','DEF:temps8=./lib/weather'+ i + '.rrd:temps8:AVERAGE','DEF:temps9=./lib/weather'+ i + '.rrd:temps9:AVERAGE','XPORT:temps1:temp1','XPORT:temps2:temp2','XPORT:temps3:temp3','XPORT:temps4:temp4','XPORT:temps5:temp5','XPORT:temps6:temp6','XPORT:temps7:temp7','XPORT:temps8:temp8','XPORT:temps9:temp9']);
        fs.writeFileSync(pngPathName, child2);
    }
    
    var pngPathName = path.join(pnpFolder, 'burner.json');
    const child3 = execFileSync('rrdtool',['xport','-s now-24h','-e now','--json','DEF:runtime1=./lib/burner.rrd:runtime1:AVERAGE','XPORT:runtime1:runtime']);
    fs.writeFileSync(pngPathName, child3);
  
	// rrdtool xport --start now-24h --end now --json
    // DEF:temps1=./lib/weather1.rrd:temps1:AVERAGE XPORT:temps1:"my"
}
var updatePng = function(prefix,count,dbprefix){
	
	logger.debug("updatePng: " + prefix);
	var pngPathName = path.join(pnpFolder, 'burner.png');
	execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:runtime1=./lib/burner.rrd:runtime1:AVERAGE','AREA:runtime1#000000:Runtime']);

		
	for(var i=1; i <= count; i++)
	{
		// Day
		var pngPathName = path.join(pnpFolder, prefix + 'hum'+ i +'.png');
		execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums'+i+'=./lib/weather'+ dbprefix + '.rrd:hums'+i+':AVERAGE','LINE1:hums'+i+'#000000:Humidity']);
		var pngPathName = path.join(pnpFolder, prefix +  'temp'+ i +'.png');
		execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps'+i+'=./lib/weather'+ dbprefix + '.rrd:temps'+i+':AVERAGE','LINE1:temps'+i+'#000000:Temp']);
		
		// week
		var pngPathName = path.join(pnpFolder, prefix + 'humWeek'+ i +'.png');
		execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:hums'+i+'=./lib/weather'+ dbprefix + '.rrd:hums'+i+':AVERAGE','LINE1:hums'+i+'#000000:Humidity']);
		var pngPathName = path.join(pnpFolder, prefix + 'tempWeek'+ i +'.png');
		execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:temps'+i+'=./lib/weather'+ dbprefix + '.rrd:temps'+i+':AVERAGE','LINE1:temps'+i+'#000000:Temp']);

	}
}

// app.get('/',require('connect-ensure-login').ensureLoggedIn(),
//
// function(req, res) {
// var my = ar.getStationData()
// logger.info("Villa main page");
// res.render('mainview', { title: 'Villa',stations:my,prefix:''});
//
// });

// Handle 404
app.use(function(req, res, next) {
	res.redirect('/');
    
});

app.listen(3000, function () {
	  logger.info('Heizung listening on port 3000');
});

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



updateJSON();

setInterval(function() {
	
	updateJSON();
	
},1000 * 60 * 10);  // every 10 minutes
