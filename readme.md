# Update 

	sudo apt update
	
	sudo apt upgrade
	
	sudo rpi-update

# Install Node.js
## ARM v7

    curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
    
    sudo apt-get install nodejs
    
##ARM v6

    wget https://nodejs.org/dist/v9.9.0/node-v9.9.0-linux-armv6l.tar.xz
    
    tar xf  node-v9.9.0-linux-armv6l.tar.xz
    
    sudo cp -R * /usr/local/
    
    
    

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
    
    node-gyp rebuild
    
    

# Create rrd Database

    ./createRRD.sh

# RAM Disk

    sudo nano /etc/fstab
    
    tmpfs /mnt/RAMDisk tmpfs defaults,noatime,nodev,nosuid,size=32M 0 0
    tmpfs /tmp tmpfs defaults,noatime,nosuid,size=100m 0 0
    tmpfs /var/tmp tmpfs defaults,noatime,nosuid,size=30m 0 0
   
    ln -s /mnt/RAMDisk /home/pi/HeizungWeb/picture
  

# Service

	sudo forever-service install Heizung
	
	sudo nano /etc/rc.local
	
	sudo service Heizung start

# Web Cam

    sudo apt-get install fswebcam

    LD_PRELOAD=/usr/lib/arm-linux-gnueabihf/libv4l/v4l1compat.so fswebcam  --save cam.jpg

    
# Nginx

    sudo apt-get install nginx -y   
    
    sudo systemctl enable nginx
    
    sudo rm /etc/nginx/sites-available/default  
    
    sudo nano /etc/nginx/sites-available/default
    
    sudo nginx -t
    
    sudo /etc/init.d/nginx reload


# lets encrypt

    sudo apt-get install certbot 


# Services

    sudo systemctl disable bluetooth
    sudo systemctl disable avahi-daemon
    sudo systemctl disable hciuart
    
    systemctl list-unit-files | grep enabled
    


# IPTables

    sudo apt-get install iptables-persistent

    sudo /sbin/iptables -L
    
    sudo bash -c "iptables-save > /etc/iptables/rules.v4"

# Logging


    sudo nano /etc/rsyslog.conf
    

###############
#### RULES ####
###############

add the following line.

    *.*     ~

