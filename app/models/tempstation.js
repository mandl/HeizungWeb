var Backbone = require('backbone');

var TempStation = Backbone.Model.extend({
       defaults: {
       id: 0,
       label: 0,
       name : "Bad",
       state : 0,
       datasource: "0"
     }
     
   });


var TempStations = Backbone.Collection.extend({
	model: TempStation,
	 url: '/datastations'
	
});

module.exports = TempStation;
module.exports = TempStations;