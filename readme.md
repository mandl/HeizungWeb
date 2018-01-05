
#Create SSl

openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout ./ssl/key.pem -out ./ssl/cert.pem

#Install

sudo npm install forever -g

sudo npm install browserify -g

sudo apt-get install rrdtool

npm install

#Create rrd Database

rrdtool create weather.rrd --step 900 \
DS:temps1:GAUGE:1200:-40:50 \
DS:temps2:GAUGE:1200:-40:50 \
DS:temps3:GAUGE:1200:-40:50 \
DS:temps4:GAUGE:1200:-40:50 \
DS:temps5:GAUGE:1200:-40:50 \
DS:temps6:GAUGE:1200:-40:50 \
DS:temps7:GAUGE:1200:-40:50 \
DS:temps8:GAUGE:1200:-40:50 \
DS:hums1:GAUGE:1200:0:100 \
DS:hums2:GAUGE:1200:0:100 \
DS:hums3:GAUGE:1200:0:100 \
DS:hums4:GAUGE:1200:0:100 \
DS:hums5:GAUGE:1200:0:100 \
DS:hums6:GAUGE:1200:0:100 \
DS:hums7:GAUGE:1200:0:100 \
DS:hums8:GAUGE:1200:0:100 \
RRA:AVERAGE:0.5:1:960 \
RRA:MIN:0.5:96:3600 \
RRA:MAX:0.5:96:3600 \
RRA:AVERAGE:0.5:96:3600

