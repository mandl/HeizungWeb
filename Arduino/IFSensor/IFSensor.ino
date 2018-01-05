// the sensor communicates using SPI, so include the library:
#include <SPI.h>

/*

 Funkthermometer TX 29-IT
 RF Soap als Empfänger eines Energiemessgerätes und eines Funkthermometers
 
 Das TX29IT ist ein kostengünstiges (ca. 10 €) Funkthermometer, welches seine Daten ca. alle 4 s über Funk (868 Mhz) überträgt.
 Parameter der Funkübertragung:
 
 Mittenfrequenz 868,3 MHz
 Modulation: FSK
 Frequenzhub: +/- 90 kHz
 Datenrate: 17.241 kbit/s
 
 */

// ##### IT+ Frame #####
// Frame example (5 byte):
// 92h 03h 94h 59h 3Ch  --> Addr:32, Temp:-0.6, Hygro:89.0
// 92h 86h 24h 28h DEh  --> Addr:40, Temp:22.4, Hygro:40.0
// | || |  ||  ||  ||
// 9 28  624   28  DE
// | |    |    |   +--> CRC-8 (x8 + x5 + x4 +1)
// | |    |    +------> Hygro in % 
// | |    |				  bit6..0 = hygro value (0..127, 106 = no hygro)
// | |    |				  bit7 = weak battery indicator (0=okay, 1=weak)
// | |    |				  example: 28 --> hygro 40%, battery okay
// | |    +-----------> Temp (T+40)*10 in °C
// | |					  nibble 1 = T10
// | |					  nibble 2 = T1
// | |					  nibble 3 = T0.1
// | |					  example1: 624 --> 62.4 - 40 = 22.4°C
// | |                    example2: 394 --> 39.4 - 40 = -0.6°C
// | +----------------> SensorID 
// |					  bit7..2 SensorID (0..63)
// |					  bit1 = Restart flag (0=no restart, 1=restart-->new batt)
// |					  bit0 = unused (always 0)
// +------------------> Message length (number of nibbles that follow)
//                        example: 9 --> 9 nibbles follow


// pins used for the connection with the sensor
// the other you need are controlled by the SPI library):
//const int dataReadyPin = 6;
const int chipSelectPin = 10;
const int rfm_IRQPin = 3;

const int Ledpin = 13;

volatile int state = LOW;
volatile byte rxfill = 0;
volatile byte frame[5];         // frame buffer
volatile byte frameready= false;  // neuer Frame
volatile unsigned long time;
volatile unsigned int stateirq=0;



void setup() {

  unsigned int data;
  frameready = false;
  rxfill = 0;
  stateirq=0;
  // wait open the port
  //while (!Serial);

  //Serial.println("init start");

  Serial.begin(9600);

 

  //setupBlueToothConnection();

  // start the SPI library:
  SPI.begin();

  SPI.setClockDivider(SPI_CLOCK_DIV8);  // 16 Mhz / 8 = 2 Mhz

  SPI.setBitOrder(MSBFIRST);

  // initalize the  data ready and chip select pins:
  pinMode(chipSelectPin, OUTPUT);
  digitalWrite(chipSelectPin, HIGH);

  pinMode(Ledpin, OUTPUT);

  digitalWrite(Ledpin, LOW);

  pinMode(rfm_IRQPin, INPUT_PULLUP);

  delay(200);
  rf12_xfer(0xFE00);
  // give time to set up:
  delay(500);

  initRM12_2();
  // 5. Power Setting Command

  // Reset Sync pattern
  rf12_xfer(0xCA89);
  rf12_xfer(0xCA83);

  data = rf12_xfer(0x0000);
  if(data & 0x8000)
  {
    //afc = byte(data);
    // data in RX FIFO
    //Serial.println("dummy read");
    rf12_xfer(0xB000);
  }  

  //digitalem Pin3
  attachInterrupt(1, rf12_interrupt, LOW);

  //Serial.println("init done");

  // get time	
  time = millis();

}

void initRM12()
{

  // Configuration Setting Command
  rf12_xfer(0x80C7 | (2 << 4)); // EL (ena TX), EF (ena RX FIFO), 12.0pF 

  //Komponentenauswahl (Power Management 82xx) 
  rf12_xfer(0x82D9);

  // 3. Frequency Setting Command
  rf12_xfer(0xA67c); // FREQUENCY 868.300MHz

  // 4. Data Rate Command
  rf12_xfer(0xC613); // DATA RATE 17.241 kbps

  rf12_xfer(0x94a0); // RECEIVER CONTROL VDI Medium 134khz LNA max DRRSI 103 dbm

  // 6. Data Filter Command
  rf12_xfer(0xC2AC); // AL,!ml,DIG,DQD4 

  // 7. FIFO and Reset Mode Command  0xCAF3
  rf12_xfer(0xCA8B); // FIFO8,1-SYNC,!ff,DR 

  rf12_xfer(0xCE2D); // SYNC=2D； 

  // 9. AFC Command
  rf12_xfer(0xC483); // @PWR,NO RSTRIC,!st,!fi,OE,EN 

  // 10. TX Configuration Control Command
  rf12_xfer(0x9850); // !mp,90kHz,MAX OUT 

  rf12_xfer(0xCC77); // OB1，OB0, LPX,！ddy，DDIT，BW0 
  //rf12_xfer(0xE000); // NOT USE 

  // 13. Low Duty-Cycle Command
  rf12_xfer(0xC800); // NOT USE 

  // 14. Low Battery Detector and Microcontroller Clock Divider Command
  rf12_xfer(0xC049); // 1.66MHz,3.1V 

}  

void initRM12_2()
{
  // Bit	15	14	13	12	11	10	9	8	7	6	5	4	3	2	1	0
  //  	1	0	0	0	0	0	0	0	el	ef	b1	b0	x3	x2	x1	x0	0x8008
  //	1	0	0	0	0	0	0	0	1	1	1	0	0	1	1	1	0x80E7
  rf12_xfer(0x80E7);			// ena TX latch, ena RX FIFO, 868MHz, 12.0pF

  //	1	0	0	0	0	0	1	0	er	ebb	et	es	ex	eb	ew	dc	0x8208
  //	1	0	0	0	0	0	1	0	-------- do on the fly ---------


  // 	1	1	0	0	1	1	0	0	0	ob1	ob0	lpx	dly	dit	bw1	bw0	0xCC77
  //	1	1	0	0	1	1	0	0	0	1	1	1	0	1	1	1	0xCC77
  rf12_xfer(0xCC77);			// drv 5/10MHz, low-power OSC, no dith., band width 256kB

  // 	1	1	0	0	0	0	0	0	d2	d1	d0	v4	v3	v2	v1	v0	0xC000
  //	1	1	0	0	0	0	0	0	0	1	0	0	1	0	0	1	0xC049
  rf12_xfer(0xC049);			// 1.66MHz, 3.1V

  // 	1	0	1	0	f11	f10	f9	f8	f7	f6	f5	f4	f3	f2	f1	f0	0xA680
  //	1	0	1	0	0	1	1	0	0	1	1	1	1	1	0	0	0xA67C
  rf12_xfer(0xA67C);			// FREQUENCY 868.300MHz

  // 	1	1	0	0	0	1	1	0	cs	r6	r5	r4	r3	r2	r1	r0	0xC623
  //	1	1	0	0	0	1	1	0	0	0	0	1	0	0	1	1	0xC613
  rf12_xfer(0xC613);			// DATA RATE 17.241 kbps

  //	1	0	0	1	0	pi	d1	d0	i2	i1	i0	g1	g0	r2	r1	r0	0x9080
  //	1 	0	0	1	0	1	0	0	1	0	1	0	0	0	0	0	0x94A0
  rf12_xfer(0x94A8);			// VDI, fast, 134khz, LNA 0dB, DRRSI -103 dB

  //	1	1	0	0	1	1	1	0	b7	b6	b5	b4	b3	b2	b1	b0	0xCED4
  //	1 	1	0	0	1	1	1	0	1	1	0	1	0	1	0	0	0xCED4
  rf12_xfer(0xCED4);			// SYNC=2DD4

    // 	1	1	0	0	0	0	1	0	al	ml	1	s	1	q2	q1	q0	0xC22C
  //	1	1	0	0	0	0	1	0	1	0	1	0	1	1	0	0	0xC2AC
  rf12_xfer(0xC2AC);			// autolock, dig. filter, mid level

  // 	1	1	0	0	1	0	1	0	f3	f2	f1	f0	sp	al	ff	dr	0xCA80
  //	1	1	0	0	1	0	1	0	1	0	0	0	0	0	1	1	0xCA83
  rf12_xfer(0xCA03);			// FIFO level =  8, 2-SYNC, sync fill, FIFO ena, reset off

  // 	1	1	0	0	0	1	0	0	a1	a0	rl1	rl0	st	fi	oe	en	0xC4F7
  //	1	1	0	0	0	1	0	0 	1	0	0	0	0	0	1	1	0xC483
  rf12_xfer(0xC483);			// AFC if VDI=0, unlimited range, AFC OE+EN

  // 	1	0	0	1	1	0	0	mp	m3	m2	m1	m0	0	p2	p1	p0	0x9800
  //	1	0	0	1	1	0	0	0	0	1	0	1	0	0	0	0	0x9850
  rf12_xfer(0x9850);			//  no inv, deviation 90kHz, MAX OUT

  // 	1	1	1	r4	r3	r2	r1	r0	m7	m6	m5	m4	m3	m2	m1	m0	0xE196
  //	1	1	1	0	0	0	0	0	0	0	0	0	0	0	0	0	0xE000
  rf12_xfer(0xE000);			// NOT USE

  // 	1	1	0	0	1	0	0	0	d6	d5	d4	d3	d2	d1	d0	en	0xC80E
  //	1	1	0	0	1	0	0	0	0	0	0	0	0	0	0	0	0xC800  
  rf12_xfer(0xC800);			// NOT USE

  rf12_xfer(0x82D9);
}  

byte CheckITPlusCRC(volatile byte *msge, byte nbBytes) {
  byte reg = 0;
  byte curByte, curbit, bitmask;
  byte do_xor;

  while (nbBytes-- != 0) {
    curByte = *msge++; 
    bitmask = 0b10000000;
    while (bitmask != 0) {
      curbit = ((curByte & bitmask) == 0) ? 0 : 1;
      bitmask >>= 1;
      do_xor = (reg & 0x80);

      reg <<=1;
      reg |= curbit;

      if (do_xor)
      {
        reg ^= 0x31;
      }
    }
  }
  return reg;
}


void loop()
{

  byte crc = 0;
  byte SensorId;
  signed char Temp;
  
  byte Hygro;
  byte ResetFlag;
  byte DeciTemp;
  byte weakbat;
  unsigned long timeNow;
  char stra;
  
  

  timeNow =  millis();
  if((timeNow - time) > 5000)
  {
    time = timeNow;
    

  }
  
  if(frameready== true)
  {
    // new frame
    //for (byte i=0; i < 5; i++)
    //{
    //  Serial.print(frame[i],HEX);
    //  Serial.print(' ');
    //}
    //Serial.println();

    crc = CheckITPlusCRC(&frame[0],5);
    if(crc == 0)
    {
      //Serial.print("CRC ok ");
      //Serial.println(crc,HEX);

      // Id of sensor
      SensorId = (((frame[0] & 0x0f) << 4) + ((frame[1] & 0xf0) >> 4)) >> 2;

      // Reset flag is stored as bit #5 in sensorID.
      ResetFlag = (frame[1] & 0x20) >> 5;

      // Sign bit is stored into bit #7 of temperature. IT+ add a 40° offset to temp, so < 40 means negative
      Temp = (((frame[1] & 0x0f) * 10) + ((frame[2] & 0xf0) >> 4));
      DeciTemp = frame[2] & 0x0f;

      if (Temp >= 40) {
        Temp -= 40;
      } 
      else {
        if (DeciTemp == 0) {
          Temp = 40 - Temp;
        } 
        else {
          Temp = 39 - Temp;
          DeciTemp = 10 - DeciTemp;
        }
        // change to Two's complement
        Temp = ~(Temp);
        Temp |= 0b10000000;
      }
      Hygro = frame[3] & 0x7f;
      weakbat = (frame[3] & 0b10000000) >> 7;

      Serial.print("{\"ID\":");
      Serial.print(SensorId);
      Serial.print(",\"Reset\":");
      if(ResetFlag == 1)
      {
        Serial.print("1");
      }
      else
      {
        Serial.print("0");
      }
      Serial.print(",\"LOWBAT\":");
      if(weakbat == 1)
      {
        Serial.print("1");
      }
      else
      {
        Serial.print("0");
      }
      Serial.print(",\"Temp\":");
      Serial.print(Temp,DEC);
      Serial.print(".");
      Serial.print(DeciTemp);
      Serial.print(",\"Hygro\":");
      Serial.print(Hygro);  
      Serial.println("}");   
     
     
    }
    else
    {
      Serial.print("{\"CRCfalse\":\"");
      Serial.print(crc,HEX);
      Serial.println("\"}");
      
    }   

    frameready = false;
  }
}


void rf12_interrupt() {

  unsigned int data;
  byte data2;
  // Status read
  data = rf12_xfer(0x0000);
  if(data & 0x8000)
  {
    //afc = byte(data);
    // data in RX FIFO
    data2 = byte(rf12_xfer(0xB000));

    if (((data2 & 0xf0) == 0x90) && (rxfill == 0))
    {
      // new frame
      frame[0]= data2;
      rxfill++;
    }
    else if((rxfill > 0) && (rxfill <= 3))
    {
      frame[rxfill]= data2;
      rxfill++;
    } 
    else if(rxfill == 4)
    {
      // laste bye
      frame[4]= data2;
      rxfill = 0;
      frameready = true;

      // time stamp
      time = millis();

      // Reset Sync pattern
      rf12_xfer(0xCA89);
      rf12_xfer(0xCA83);

    }

  }

}


//Sends a command

unsigned int rf12_xfer(unsigned int value) {

  unsigned int val;
  byte num1;
  byte num2;

  // take the chip select low to select the device:
  digitalWrite(chipSelectPin, LOW);

  num1 = SPI.transfer(byte(value >> 8)); 
  num2 = SPI.transfer(byte(value));  

  // take the chip select high to de-select:
  digitalWrite(chipSelectPin, HIGH);

  val = (num1 << 8) + (num2);
  return val;
}



























