/*
    Heizung
    
    Copyright (C) 2018-2019 Mandl

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
var _ = require('underscore');
var $ = require('jquery');
Backbone.$ = $;

var powerControlsView = Backbone.View.extend({

	// Cache the template function for a single item.
	template : _.template($('#controls-template').html()),
	events : {
		'click #onPower' : 'handleOn'

	},
	// Called when the view is first created
	initialize : function() {
		this.listenTo(this.model, 'change', this.render);

	},
	// Re-render the titles of the todo item.
	render : function() {
		this.$el.html(this.template(this.model.attributes));
		this.$onHeizung = this.$('#onPower');


		if (this.model.get('PowerState')) {
			this.$onHeizung.text('Off');
			this.$onHeizung.removeClass("btn-danger").addClass("btn-success");
		} else
			this.$onHeizung.text('On');

		return this;
	},

	handleOn : function() {
		console.log('on');
		this.model.switchPower();
	}

});

module.exports.powerControlsView = powerControlsView;

