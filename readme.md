# Install Node.js

    curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
    

# Create SSl

    mkdir ssl
    
    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout ./ssl/key.pem -out ./ssl/cert.pem

# Install

    sudo npm install forever -g
    
    sudo npm install forever-service -g

    sudo npm install browserify -g

    sudo apt-get install rrdtool

    npm install
    
    npm run-script build-1
    
    npm run-script build-2
    
    

# Create rrd Database

    ./createRRD.sh

# RAM Disk

    sudo nano /etc/fstab

    tmpfs /mnt/RAMDisk tmpfs nodev,nosuid,size=16M 0 0

    ln -s /mnt/RAMDisk /home/pi/HeizungWeb/public/images

# Service

	sudo forever-service install Heizung
	
	sudo nano /etc/rc.local
	
	sudo service Heizung start

# Web Cam

    sudo apt-get install fswebcam

    LD_PRELOAD=/usr/lib/arm-linux-gnueabihf/libv4l/v4l1compat.so fswebcam  --save cam.jpg
