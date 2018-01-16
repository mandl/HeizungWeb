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


// one station
var Backbone = require('backbone');
var _ = require('underscore');

var StationView = Backbone.View.extend({
	  
	events: {
		'click': '_selectStation'
		},
	_selectStation: function(ev) {
		ev.preventDefault();
		console.log($(ev.currentTarget).html());
	},
	template: _.template($('#view-station-template').html()),
    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
      },
    render: function() {
      this.$el.html(this.template(this.model.attributes));		
      //this.$el.html(this.template());
      return this;
    }
  });

// Collection of stations

  var StationsView = Backbone.View.extend({
	   
	tagName: 'section',
    
    render: function() {
   	
    	var stationView = this.collection.map(function(movie) {
    		return (new StationView({model : movie})).render().el;
    		});
    	this.$el.html(stationView);
      
    },
    initialize: function() {
      this.listenTo(this.collection, 'all', this.render);
    }
  });
  
  module.exports.StationView = StationView;
  module.exports.StationsView = StationsView;
