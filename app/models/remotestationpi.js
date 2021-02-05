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

var RemotePi = Backbone.Model.extend({
       defaults: {
       hostname : "Demo",
       release : "?",
       node  : "?",
       location: "?",
       piHardwareVersion:"?",
       pingDate:"?",
       number: 0,
       reboot: 0
     }
});


var RemotePiCollection = Backbone.Collection.extend({
	model: RemotePi,
	 url: '/remotepi'
	
	
});



module.exports.RemotePi = RemotePi;
module.exports.RemotePiCollection = RemotePiCollection;
