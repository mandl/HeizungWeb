
var demoData = require('Temp');
var myView = require('View');

// create collections
var dd = new demoData.TempStations();
var remote = new demoData.TempStations();

remote.url = '/datastationsmuc';

// creat views
var localStationData = new myView.StationsView({collection:dd,el:'#stations'});
var remoteStationData = new myView.StationsView({collection:remote,el:'#stationsremote'});

// receive Data
dd.fetch();
remote.fetch();


setInterval(function() { 
	
	// update every 5 seconds
	dd.fetch(); 
	remote.fetch();
	
	
},5000);

$(document).ready(function() {
	console.log('ready');
	localStationData.render();  
	remoteStationData.render(); 
  });