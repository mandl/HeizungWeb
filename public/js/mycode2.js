var demoData = require('Heizung');
var myView = require('HeizungView');

var dd = new demoData.HeizungModel();
var myControlsView = new myView.heizungControlsView({el: '#controls',model:dd });
var myStatusView = new myView.heizungStatusView({model:dd,el: '#status'  });


//dd.fetch();

$(document).ready(function() {
	console.log('ready');
	myControlsView.render();   
	myStatusView.render();
    
  });