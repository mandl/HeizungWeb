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


var Backbone = require('backbone');

var TempStation = Backbone.Model.extend({
       defaults: {
       id: 0,
       label: 0,
       name : "Bad",
       temp : 0,
       hum  : 0,
       state : 0,
       time : 0,
       reset : 0,
       lowbattery : 0,
       timestr: "",
       datasource: "0"
     }
});


var TempStations = Backbone.Collection.extend({
	model: TempStation,
	 url: '/datastations'
	
	
});



module.exports.TempStation = TempStation;
module.exports.TempStations = TempStations;