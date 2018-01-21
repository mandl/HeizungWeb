
var demoData = require('Temp');
var myView = require('View');


var dd = new demoData.TempStations();


var helloData = new myView.StationsView({collection:dd,el: '#stations'  });

dd.fetch();

setInterval(function() { dd.fetch(); },5000);

$(document).ready(function() {
	console.log('ready');
	helloData.render();  
	
    
  });