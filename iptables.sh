#!/bin/sh
# iptables Firewall Skript
IPTABLES="/sbin/iptables"

echo "Loading Firewall ..."

# Purge/Flush 
# ~~~~~~~~~~~
# Alle Regeln löschen
$IPTABLES -F 
$IPTABLES -t nat -F
$IPTABLES -t mangle -F

# Alle Regelketten löschen
$IPTABLES -X 
$IPTABLES -t nat -X
$IPTABLES -t mangle -X

# Regeln
# ~~~~~~
# IPv4 Default
$IPTABLES -P INPUT DROP
$IPTABLES -P FORWARD DROP
$IPTABLES -P OUTPUT ACCEPT

# Loopback-Schnittstelle Verkehr erlauben
$IPTABLES -A INPUT -i lo -j ACCEPT 
$IPTABLES -A OUTPUT -o lo -j ACCEPT

# Abgehenden Verkehr erlauben
$IPTABLES -A OUTPUT -j ACCEPT

# ICMP-Antwortpakete erlauben
$IPTABLES -A INPUT -p icmp -m icmp --icmp-type echo-reply -j ACCEPT 
$IPTABLES -A INPUT -p icmp -m icmp --icmp-type echo-request -j ACCEPT 
$IPTABLES -A INPUT -p icmp -m icmp --icmp-type destination-unreachable -j ACCEPT

$IPTABLES -A INPUT -p icmp -m icmp --icmp-type address-mask-request -j DROP
$IPTABLES -A INPUT -p icmp -m icmp --icmp-type timestamp-request -j DROP
$IPTABLES -A INPUT -p icmp -m icmp --icmp-type 8 -m limit --limit 1/second -j ACCEPT 


# Alle Pakete zu einer bestehenden TCP-Verbindung akzeptieren
$IPTABLES -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# SSH-Verbindungen zulassen

$IPTABLES -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set --name ssh
$IPTABLES -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 30 --hitcount 10 --rttl --name ssh -j DROP
$IPTABLES -A INPUT -p tcp --dport 22 -m limit --limit 2/s -j ACCEPT
$IPTABLES -A INPUT -p tcp --dport 22 -m connlimit --connlimit-above 5 -j DROP


# Webserver Zugriff erlauben HTTP & HTTPS
$IPTABLES -A INPUT -p tcp -m state --state NEW -m tcp --dport 80 -j ACCEPT
$IPTABLES -A INPUT -p tcp -m state --state NEW -m tcp --dport 443 -j ACCEPT
$IPTABLES -A INPUT -p tcp -m state --state NEW -m tcp --dport 3000 -j ACCEPT
 
 
 # 23. Prevent DoS attack
$IPTABLES -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
$IPTABLES -A INPUT -p tcp --dport 443 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
 
# Alle Pakete ordentlich zurückweisen
$IPTABLES -A INPUT -p tcp -j REJECT --reject-with tcp-reset 
$IPTABLES -A INPUT -j REJECT --reject-with icmp-port-unreachable
$IPTABLES -A FORWARD -j REJECT

echo "... done!"
