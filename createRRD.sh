#!/bin/bash

rrdtool create ./lib/weather1.rrd --step 900 \
DS:temps1:GAUGE:1200:-40:50 \
DS:temps2:GAUGE:1200:-40:50 \
DS:temps3:GAUGE:1200:-40:50 \
DS:temps4:GAUGE:1200:-40:50 \
DS:temps5:GAUGE:1200:-40:50 \
DS:temps6:GAUGE:1200:-40:50 \
DS:temps7:GAUGE:1200:-40:50 \
DS:temps8:GAUGE:1200:-40:50 \
DS:temps9:GAUGE:1200:-40:50 \
DS:temps10:GAUGE:1200:-40:50 \
DS:temps11:GAUGE:1200:-40:50 \
DS:temps12:GAUGE:1200:-40:50 \
DS:temps13:GAUGE:1200:-40:50 \
DS:temps14:GAUGE:1200:-40:50 \
DS:hums1:GAUGE:1200:0:100 \
DS:hums2:GAUGE:1200:0:100 \
DS:hums3:GAUGE:1200:0:100 \
DS:hums4:GAUGE:1200:0:100 \
DS:hums5:GAUGE:1200:0:100 \
DS:hums6:GAUGE:1200:0:100 \
DS:hums7:GAUGE:1200:0:100 \
DS:hums8:GAUGE:1200:0:100 \
DS:hums9:GAUGE:1200:0:100 \
DS:hums10:GAUGE:1200:0:100 \
DS:hums11:GAUGE:1200:0:100 \
DS:hums12:GAUGE:1200:0:100 \
DS:hums13:GAUGE:1200:0:100 \
DS:hums14:GAUGE:1200:0:100 \
RRA:AVERAGE:0.5:1:960 \
RRA:MIN:0.5:96:3600 \
RRA:MAX:0.5:96:3600 \
RRA:AVERAGE:0.5:96:3600

rrdtool create ./lib/weather2.rrd --step 900 \
DS:temps1:GAUGE:1200:-40:50 \
DS:temps2:GAUGE:1200:-40:50 \
DS:temps3:GAUGE:1200:-40:50 \
DS:temps4:GAUGE:1200:-40:50 \
DS:temps5:GAUGE:1200:-40:50 \
DS:temps6:GAUGE:1200:-40:50 \
DS:temps7:GAUGE:1200:-40:50 \
DS:temps8:GAUGE:1200:-40:50 \
DS:temps9:GAUGE:1200:-40:50 \
DS:temps10:GAUGE:1200:-40:50 \
DS:temps11:GAUGE:1200:-40:50 \
DS:temps12:GAUGE:1200:-40:50 \
DS:temps13:GAUGE:1200:-40:50 \
DS:temps14:GAUGE:1200:-40:50 \
DS:hums1:GAUGE:1200:0:100 \
DS:hums2:GAUGE:1200:0:100 \
DS:hums3:GAUGE:1200:0:100 \
DS:hums4:GAUGE:1200:0:100 \
DS:hums5:GAUGE:1200:0:100 \
DS:hums6:GAUGE:1200:0:100 \
DS:hums7:GAUGE:1200:0:100 \
DS:hums8:GAUGE:1200:0:100 \
DS:hums9:GAUGE:1200:0:100 \
DS:hums10:GAUGE:1200:0:100 \
DS:hums11:GAUGE:1200:0:100 \
DS:hums12:GAUGE:1200:0:100 \
DS:hums13:GAUGE:1200:0:100 \
DS:hums14:GAUGE:1200:0:100 \
RRA:AVERAGE:0.5:1:960 \
RRA:MIN:0.5:96:3600 \
RRA:MAX:0.5:96:3600 \
RRA:AVERAGE:0.5:96:3600

rrdtool create ./lib/weather3.rrd --step 900 \
DS:temps1:GAUGE:1200:-40:50 \
DS:temps2:GAUGE:1200:-40:50 \
DS:temps3:GAUGE:1200:-40:50 \
DS:temps4:GAUGE:1200:-40:50 \
DS:temps5:GAUGE:1200:-40:50 \
DS:temps6:GAUGE:1200:-40:50 \
DS:temps7:GAUGE:1200:-40:50 \
DS:temps8:GAUGE:1200:-40:50 \
DS:temps9:GAUGE:1200:-40:50 \
DS:temps10:GAUGE:1200:-40:50 \
DS:temps11:GAUGE:1200:-40:50 \
DS:temps12:GAUGE:1200:-40:50 \
DS:temps13:GAUGE:1200:-40:50 \
DS:temps14:GAUGE:1200:-40:50 \
DS:hums1:GAUGE:1200:0:100 \
DS:hums2:GAUGE:1200:0:100 \
DS:hums3:GAUGE:1200:0:100 \
DS:hums4:GAUGE:1200:0:100 \
DS:hums5:GAUGE:1200:0:100 \
DS:hums6:GAUGE:1200:0:100 \
DS:hums7:GAUGE:1200:0:100 \
DS:hums8:GAUGE:1200:0:100 \
DS:hums9:GAUGE:1200:0:100 \
DS:hums10:GAUGE:1200:0:100 \
DS:hums11:GAUGE:1200:0:100 \
DS:hums12:GAUGE:1200:0:100 \
DS:hums13:GAUGE:1200:0:100 \
DS:hums14:GAUGE:1200:0:100 \
RRA:AVERAGE:0.5:1:960 \
RRA:MIN:0.5:96:3600 \
RRA:MAX:0.5:96:3600 \
RRA:AVERAGE:0.5:96:3600

rrdtool create ./lib/weather5.rrd --step 900 \
DS:temps1:GAUGE:1200:-40:50 \
DS:temps2:GAUGE:1200:-40:50 \
DS:temps3:GAUGE:1200:-40:50 \
DS:temps4:GAUGE:1200:-40:50 \
DS:temps5:GAUGE:1200:-40:50 \
DS:temps6:GAUGE:1200:-40:50 \
DS:temps7:GAUGE:1200:-40:50 \
DS:temps8:GAUGE:1200:-40:50 \
DS:temps9:GAUGE:1200:-40:50 \
DS:temps10:GAUGE:1200:-40:50 \
DS:temps11:GAUGE:1200:-40:50 \
DS:temps12:GAUGE:1200:-40:50 \
DS:temps13:GAUGE:1200:-40:50 \
DS:temps14:GAUGE:1200:-40:50 \
DS:hums1:GAUGE:1200:0:100 \
DS:hums2:GAUGE:1200:0:100 \
DS:hums3:GAUGE:1200:0:100 \
DS:hums4:GAUGE:1200:0:100 \
DS:hums5:GAUGE:1200:0:100 \
DS:hums6:GAUGE:1200:0:100 \
DS:hums7:GAUGE:1200:0:100 \
DS:hums8:GAUGE:1200:0:100 \
DS:hums9:GAUGE:1200:0:100 \
DS:hums10:GAUGE:1200:0:100 \
DS:hums11:GAUGE:1200:0:100 \
DS:hums12:GAUGE:1200:0:100 \
DS:hums13:GAUGE:1200:0:100 \
DS:hums14:GAUGE:1200:0:100 \
RRA:AVERAGE:0.5:1:960 \
RRA:MIN:0.5:96:3600 \
RRA:MAX:0.5:96:3600 \
RRA:AVERAGE:0.5:96:3600

rrdtool create ./lib/burner.rrd --step 5m \
DS:runtime1:GAUGE:20m:0:36000 \
RRA:LAST:0.5:1:960
