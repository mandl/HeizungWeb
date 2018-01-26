
#Create SSl
    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout ./ssl/key.pem -out ./ssl/cert.pem

#Install

    sudo npm install forever -g

    sudo npm install browserify -g

    sudo apt-get install rrdtool

    npm install

#Create rrd Database

    ./createRRD.sh


#Web Cam

    sudo apt-get install fswebcam

    LD_PRELOAD=/usr/lib/arm-linux-gnueabihf/libv4l/v4l1compat.so fswebcam  --save cam.jpg
