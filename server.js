var fs = require('fs');
var child_process = require('child_process');
var express = require('express');
var https = require('https')
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var db = require('./db');
var path = require('path');
var jsonBody = require('body/json');
var Rest = require('connect-rest');



var ar = require('./lib/temp');

var UpdateTime = Date.now();
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
			return cb(null, false);
		}
		if (user.password != password) {
			return cb(null, false);
		}
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



//initial configuration of connect-rest. all-of-them are optional.
//default context is /api, all services are off by default
var options = {
	context: '/api'
	//logger:{ file: 'mochaTest.log', level: 'debug' },
	//apiKeys: [ '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9' ],
	// discover: { path: 'discover', secure: true },
	// proto: { path: 'proto', secure: true }
};



// Create a new Express application.
var app = express();

var rest = Rest.create( options );

app.use(rest.processRequest());

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('public'));


// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('dev'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({
	extended : true
}));
app.use(require('express-session')({
	secret : 'keyboard cat',
	resave : false,
	saveUninitialized : false
}));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


rest.get('/demo',function(req,content,cb){
		
});

app.get('/login',

 function(req, res) {
	 res.sendFile(path.join(__dirname, '/public/login.html'));
});

app.get('/station',

		 function(req, res) {
			 res.sendFile(path.join(__dirname, '/public/station.html'));
		});


app.get('/datastations',
		 function(req, res) {
			res.json([{
			       'id' : 300,
			       'name' : 'kitchen',
			       'state' : 1
			       },
			       {
			       'id' : 301,
			       'name' : 'kitchen',
			       'state' : 1
			       },
			       {
			       'id' : 302,
			       'name' : 'kitchen',
			       'state' : 1
			       },
			       {
			       'id' : 303,
			       'name' : 'kitchen',
			       'state' : 1
			       },
			       {
			       'id' : 304,
			       'name' : 'room',
			       'state' : 1
			       }
			       ]);			
		});

app.get('/heizung',

		 function(req, res) {

			 res.sendFile(path.join(__dirname, '/public/heizung.html'));
		});



app.get('/heater',

		 function(req, res) {
			res.json({ 'burnerState' : true,
			       'hours' : 300,
			       'burnerStarts' : 2000,
			       'voltageBattery' : 40,
			       'temp' : 27});
			
		});


function updateBurner(err, payload) {
    console.log(payload);
    if(payload.burnerState === true)
    {
    	 console.log('switch on');
    }
    else
    {
    	 console.log('switch off');
    }
    
    if (err) {
      console.log(err);
    } else {

}}

app.post('/heater',

	function(req, res) {
	 jsonBody(req, res, updateBurner);
	
	    res.send('ok');
	    res.end();
			
});

app.post('/login', passport.authenticate('local', {
	failureRedirect : '/login'
}), function(req, res) {
	res.redirect('/');
});


function updateState(err, payload) {
    console.log(payload);
    
    if (err) {
      console.log(err);
    } else {

}}

app.post('/LED', function(req, res) {
    jsonBody(req, res, updateState)
  
    res.writeHead(200);
    res.write('ok');
    res.end();
});

app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

app.get('/profile', require('connect-ensure-login').ensureLoggedIn(), function(
		req, res) {
	res.render('profile', {
		user : req.user
	});
});

// log routes
app.get('/log', require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
  res.sendFile(path.join(__dirname, 'temp.log'));
});




var updatePng = function(){
	
	console.log("updatePng");
	
    // room 1
	var pngPathName = path.join(__dirname + '/public/hum.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums1=./lib/weather.rrd:hums1:AVERAGE','LINE2:hums1#000000:Bad']);
	
	var pngPathName = path.join(__dirname + '/public/temp.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps1=./lib/weather.rrd:temps1:AVERAGE','LINE2:temps1#000000:Bad']);

	var pngPathName = path.join(__dirname + '/public/humWeek.png');
	child_process.execFile('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:hums1=./lib/weather.rrd:hums1:AVERAGE','LINE2:hums1#000000:Bad']);

	var pngPathName = path.join(__dirname + '/public/tempWeek.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:temps1=./lib/weather.rrd:temps1:AVERAGE','LINE2:temps1#000000:Bad']);
	
    // room 2
	var pngPathName = path.join(__dirname + '/public/hum2.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums2=./lib/weather.rrd:hums2:AVERAGE','LINE2:hums2#000000:Bad']);
	
	var pngPathName = path.join(__dirname + '/public/temp2.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps2=./lib/weather.rrd:temps2:AVERAGE','LINE2:temps2#000000:Bad']);

	var pngPathName = path.join(__dirname + '/public/humWeek2.png');
	child_process.execFile('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:hums2=./lib/weather.rrd:hums2:AVERAGE','LINE2:hums2#000000:Bad']);

	var pngPathName = path.join(__dirname + '/public/tempWeek2.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:temps2=./lib/weather.rrd:temps2:AVERAGE','LINE2:temps2#000000:Bad']);
	
	// room 3
	var pngPathName = path.join(__dirname + '/public/hum3.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums3=./lib/weather.rrd:hums3:AVERAGE','LINE2:hums3#000000:Bad']);
	
	var pngPathName = path.join(__dirname + '/public/temp3.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps3=./lib/weather.rrd:temps3:AVERAGE','LINE2:temps3#000000:Bad']);

	var pngPathName = path.join(__dirname + '/public/humWeek3.png');
	child_process.execFile('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:hums3=./lib/weather.rrd:hums3:AVERAGE','LINE2:hums3#000000:Bad']);
	
	var pngPathName = path.join(__dirname + '/public/tempWeek3.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 week','-e now','DEF:temps3=./lib/weather.rrd:temps3:AVERAGE','LINE2:temps3#000000:Bad']);

	// room4
	var pngPathName = path.join(__dirname + '/public/hum4.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums4=./lib/weather.rrd:hums4:AVERAGE','LINE2:hums4#000000:Bad']);
	
	var pngPathName = path.join(__dirname + '/public/temp4.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps4=./lib/weather.rrd:temps4:AVERAGE','LINE2:temps4#000000:Bad']);

	// room5
	var pngPathName = path.join(__dirname + '/public/hum5.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums5=./lib/weather.rrd:hums5:AVERAGE','LINE2:hums5#000000:Bad']);
	
	var pngPathName = path.join(__dirname + '/public/temp5.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps5=./lib/weather.rrd:temps5:AVERAGE','LINE2:temps5#000000:Bad']);

	// room6
	var pngPathName = path.join(__dirname + '/public/hum6.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums6=./lib/weather.rrd:hums6:AVERAGE','LINE2:hums6#000000:Bad']);
	
	var pngPathName = path.join(__dirname + '/public/temp6.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps6=./lib/weather.rrd:temps6:AVERAGE','LINE2:temps6#000000:Bad']);

	// room7
	var pngPathName = path.join(__dirname + '/public/hum7.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:hums7=./lib/weather.rrd:hums7:AVERAGE','LINE2:hums7#000000:Bad']);
	
	var pngPathName = path.join(__dirname + '/public/temp7.png');
	child_process.execFileSync('rrdtool',['graph',pngPathName,'-s now - 1 day','-e now','DEF:temps7=./lib/weather.rrd:temps7:AVERAGE','LINE2:temps7#000000:Bad']);

};

app.get('/',require('connect-ensure-login').ensureLoggedIn(),

		 function(req, res) {
			var myTime = Date.now();
			console.log(myTime);
			console.log(UpdateTime);
			if( (myTime - UpdateTime) > (1000 * 60 * 5))
			{	
				// more then 5 minute update png
				UpdateTime = myTime;
				updatePng();
			}
	        res.sendFile(path.join(__dirname, '/public/main.html'));
});

// Handle 404
app.use(function(req, res, next) {
	res.redirect('/');
    
});

https.createServer({
    key: fs.readFileSync(path.join(__dirname,'ssl','key.pem')),
    cert: fs.readFileSync(path.join(__dirname,'ssl','cert.pem'))
  }, app).listen(3000);

updatePng();
setTimeout(ar.connectDevice, 1000);