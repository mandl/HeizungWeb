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

const binding = require('bindings')('sx1276');
const util = require('util');
const EventEmitter = require('events').EventEmitter;


/*
 * Event Emitter gloop.
 */
function sx1276()
{
	EventEmitter.call(this);
}
util.inherits(sx1276, EventEmitter);

module.exports = new sx1276;


/*
 * SPI
 */
sx1276.prototype.FSKBegin = function()
{


	binding.FSKInit();
}

sx1276.prototype.FSKReset = function()
{
	binding.FSKReset();
}

sx1276.prototype.FSKGetVersion = function()
{
	var ret;
	ret = binding.FSKGetVersion();
	return ret;
}

sx1276.prototype.FSKRxChainCalibration = function()
{
	var ret;
	ret = binding.FSKRxChainCalibration();
	return ret;
}

sx1276.prototype.FSKOn = function()
{
	module.exports.emit('fsk');
	binding.FSKOn();
	
}

sx1276.prototype.FSKGetData = function()
{
	
	var ret;
	
	ret = binding.FSKGetData();
	return ret;
	
}



process.on('exit', function(code) {
	binding.FSKClose();
});
