
var demoData = require('Temp');
var myView = require('View');

// create collections
var dd = new demoData.TempStations();
var remote = new demoData.TempStations();
var remote2 = new demoData.TempStations();

remote.url = '/datastationsmuc';
remote2.url = '/datastationsdra';

// create views
var localStationData = new myView.StationsView({ collection: dd, el: '#stations' });
var remoteStationData = new myView.StationsView({ collection: remote, el: '#stationsremote' });
var remoteStationData2 = new myView.StationsView({ collection: remote2, el: '#stationsremote2' });

// receive Data
dd.fetch();
remote.fetch();
remote2.fetch();


setInterval(function () {

	// update every 5 seconds
	dd.fetch();
	remote.fetch();
	remote2.fetch();

}, 5000);

$(document).ready(function () {
	console.log('ready');
	localStationData.render();
	remoteStationData.render();
	remoteStationData2.render();
});