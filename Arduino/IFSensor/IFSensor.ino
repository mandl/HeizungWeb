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


// the sensor communicates using SPI, so include the library:
#include <SPI.h>
#include <Bounce.h>
#include <avr/wdt.h>
#include <SerialCommands.h>
#include <EEPROM.h>



//#define RFM01
#define USE_DHT22

#ifdef USE_DHT22
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>

#define DHTPIN            A5         // Pin which is connected to the DHT sensor.

#define DHTTYPE           DHT22     // DHT 22 (AM2302)

DHT_Unified dht(DHTPIN, DHTTYPE);

#endif


/*
  Funkthermometer TX 29-IT

  Das TX29IT ist ein kostengünstiges (ca. 10 €) Funkthermometer, welches seine Daten ca. alle 4 s über Funk (868 Mhz) überträgt.
  Parameter der Funkübertragung:

  Mittenfrequenz 868,3 MHz
  Modulation: FSK
  Frequenzhub: +/- 90 kHz
  Datenrate: 17.241 kbit/s

  Receiver

  RFM 01
  SI4320 Universal ISM FSK Receiver
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


#ifdef RFM01

#define CMD_STATUS              0x0000
#define CMD_FREQ                0xa000

#define CMD_CONFIG              0x8000
#define CMD_RCON                0xc000
#define CMD_WAKEUP              0xe000
#define CMD_LOWDUTY             0xcc00
#define CMD_LOWBATT             0xc200
#define CMD_AFC                 0xc600
#define CMD_DFILTER             0xc420
#define CMD_DRATE               0xc800
#define CMD_FIFO                0xce00
#define CMD_RSTMODE             0xda00

#define CMD_RESET               0xff00

// Configuration settings

// Frequency Band (in MHz), bits 12-11

#define BAND_315                (0 << 11)   //  ...0 0... .... ....
#define BAND_433                (1 << 11)   //  ...0 1... .... ....
#define BAND_868                (2 << 11)   //  ...1 0... .... ....
#define BAND_915                (3 << 11)   //  ...1 1... .... ....

#define LOWBATT_EN              (1 << 10)   //  .... .1.. .... .... --> controls the operation of the low battery detector
#define WAKEUP_EN               (1 << 9)    //  .... ..1. .... .... --> controls the operation of the wake-up timer
#define CRYSTAL_EN              (1 << 8)    //  .... ...1 .... .... --> contros if the crystal is active during sleep mode
#define NO_CLOCK                1           //  .... .... .... ...1 --> disables the clock output

// Crystal Load Capacitance (in pF), bits 7-4

#define LOAD_CAP_8C5            (0 << 4)
#define LOAD_CAP_9C0            (1 << 4)
#define LOAD_CAP_9C5            (2 << 4)
#define LOAD_CAP_10C0           (3 << 4)
#define LOAD_CAP_10C5           (4 << 4)
#define LOAD_CAP_11C0           (5 << 4)
#define LOAD_CAP_11C5           (6 << 4)
#define LOAD_CAP_12C0           (7 << 4)
#define LOAD_CAP_12C5           (8 << 4)
#define LOAD_CAP_13C0           (9 << 4)
#define LOAD_CAP_13C5           (10 << 4)
#define LOAD_CAP_14C0           (11 << 4)
#define LOAD_CAP_14C5           (12 << 4)
#define LOAD_CAP_15C0           (13 << 4)
#define LOAD_CAP_15C5           (14 << 4)
#define LOAD_CAP_16C0           (15 << 4)

// Baseband Bandwidth (in kHz)

#define BW_X1                   (0 << 1)    // reserved
#define BW_400                  (1 << 1)
#define BW_340                  (2 << 1)
#define BW_270                  (3 << 1)
#define BW_200                  (4 << 1)
#define BW_134                  (5 << 1)
#define BW_67                   (6 << 1)
#define BW_X2                   (7 << 1)    // reserved


// Receiver Settings

// VDI (valid data indicator) signal, bits 7-6

#define VDI_DRSSI               (0 << 6)    // .... .... 00.. .... --> Digital RSSI Out(DRSSI)
#define VDI_DQD                 (1 << 6)    // .... .... 01.. .... --> Data Quality Detector Output(DQD)
#define VDI_CR_LOCK             (2 << 6)    // .... .... 10.. .... --> Clock recovery lock
#define VDI_DRSSIDQD            (3 << 6)    // .... .... 11.. .... --> DRSSI && DQD

// LNA gain set (in dB), bits 5-4

#define LNA_0                   (0 << 4)    // .... .... ..00 ....
#define LNA_6                   (2 << 4)    // .... .... ..01 ....
#define LNA_14                  (1 << 4)    // .... .... ..10 ....
#define LNA_20                  (3 << 4)    // .... .... ..11 ....

#define LNA_XX                  (3 << 4)

// Threshold of the RSSI detector (in dBm), bits 1-3

#define RSSI_103                (0 << 1)    // .... .... .... 000.
#define RSSI_97                 (1 << 1)    // .... .... .... 001.
#define RSSI_91                 (2 << 1)    // .... .... .... 010.
#define RSSI_85                 (3 << 1)    // .... .... .... 011.
#define RSSI_79                 (4 << 1)    // .... .... .... 100.
#define RSSI_73                 (5 << 1)    // .... .... .... 101.
#define RSSI_X1                 (6 << 1)    // .... .... .... 110. --> reserved
#define RSSI_X2                 (7 << 1)    // .... .... .... 111. --> reserved

#define RX_EN                   1           // .... .... .... ...1 --> enables the whole receiver chain


// DFILTER values

// Clock recovery, bit 7-6

#define CR_AUTO                 (1 << 7)    // .... .... 1... .... --> auto lock control
#define CR_LOCK_FAST            (1 << 6)    // .... .... .1.. .... --> fast mode
#define CR_LOCK_SLOW            (0 << 6)    // .... .... .0.. .... --> slow mode

// Data filter type, bits 4-3

#define FILTER_OOK              (0 << 3)    // .... .... ...0 0... --> OOK to filter
#define FILTER_DIGITAL          (1 << 3)    // .... .... ...0 1... --> Digital filter
#define FILTER_X                (2 << 3)    // .... .... ...1 0... --> reserved
#define FILTER_ANALOG           (3 << 3)    // .... .... ...1 1... --> Analog RC filter

// DQD threshold parameter, bits 2-0
// Note: To let the DQD report "good signal quality" the threshold parameter should be less than 4 in the case when the bitrate is
// close to the deviation. At higher deviation/bitrate settings higher threshold parameter can report "good signal quality" as well.

#define DQD_0                   0
#define DQD_1                   1
#define DQD_2                   2
#define DQD_3                   3
#define DQD_4                   4
#define DQD_5                   5
#define DQD_6                   6
#define DQD_7                   7

// AFC values

#define AFC_ON                  (1 << 0)    // .... .... .... ...1 --> enables the calculation of the offset frequency
#define AFC_OFF                 (0 << 0)    // .... .... .... ...0 --> disables the calculation of the offset frequency
#define AFC_OUT_ON              (1 << 1)    // .... .... .... ..1. --> enables the output (frequency offset) register
#define AFC_OUT_OFF             (0 << 1)    // .... .... .... ..0. --> disables the output (frequency offset) register
#define AFC_FINE                (1 << 2)    // .... .... .... .1.. --> switches the circuit to high accuracy (fine) mode
#define AFC_STROBE              (1 << 3)    // .... .... .... 1... --> strobe edge

// Range limit, bit 4-5

#define AFC_RL_NONE             (0 << 4)    // .... .... ..00 .... --> No restriction
#define AFC_RL_15               (1 << 4)    // .... .... ..01 .... --> +15/-16
#define AFC_RL_7                (2 << 4)    // .... .... ..10 .... --> +7/-8
#define AFC_RL_3                (3 << 4)    // .... .... ..11 .... --> +3/-4

// Automatic operation mode selector, bits 6-7

#define AFC_MANUAL              (0 << 6)    // .... .... 00.. .... --> Auto mode off (Strobe is controlled by microcontroller)
#define AFC_POWERUP             (1 << 6)    // .... .... 01.. .... --> Runs only once after each power-up
#define AFC_VDI                 (2 << 6)    // .... .... 10.. .... --> Drop the foffset value when the VDI signal is low
#define AFC_ALWAYS              (3 << 6)    // .... .... 11.. .... --> Keep the foffset value independently from the state of the VDI signal


// Status Register Read Sequence

#define STATUS_FFIT             (1 << 15)   // 1... .... .... .... --> Number of the data bits in the FIFO is reached the preprogrammed limit
#define STATUS_FFOV             (1 << 14)   // .1.. .... .... .... --> FIFO overflow
#define STATUS_WKUP             (1 << 13)   // ..1. .... .... .... --> Wake-up timer overflow
#define STATUS_LBD              (1 << 12)   // ...1 .... .... .... --> Low battery detect, the power supply voltage is below the preprogrammed limit

#define STATUS_FFEM             (1 << 11)   // .... 1... .... .... --> FIFO is empty
#define STATUS_DRSSI            (1 << 10)   // .... .1.. .... .... --> The strength of the incoming signal is above the preprogrammed limit
#define STATUS_DQD              (1 << 9)    // .... ..1. .... .... --> Data Quality Detector detected a good quality signal
#define STATUS_CRL              (1 << 8)    // .... ...1 .... .... --> Clock recovery lock

#define STATUS_ATGL             (1 << 7)    // .... .... 1... .... --> Toggling in each AFC cycle
#define STATUS_ASAME            (1 << 6)    // .... .... .1.. .... --> AFC stabilized (measured twice the same offset value)
#define STATUS_OFFS6            (1 << 5)    // .... .... ..1. .... --> Offset value to be added to the value of the Frequency control word
#define STATUS_OFFS4            (1 << 4)    // .... .... ...1 .... -->

#define STATUS_OFFS3            (1 << 3)    // .... .... .... 1... -->
#define STATUS_OFFS2            (1 << 2)    // .... .... .... .1.. -->
#define STATUS_OFFS1            (1 << 1)    // .... .... .... ..1. -->
#define STATUS_OFFS0            (1 << 0)    // .... .... .... ...1 -->

#define STATUS_OFFS             0x3f
#define STATUS_OFFSIGN          0x20

#else

// *********************************   RFM12 **************************************

#define CMD_AFC                 0xc400
#define CMD_DFILTER             0xc220
#define CMD_RESET               0xfe00


// AFC values

#define AFC_ON                  (1 << 0)    // .... .... .... ...1 --> enables the calculation of the offset frequency
#define AFC_OFF                 (0 << 0)    // .... .... .... ...0 --> disables the calculation of the offset frequency
#define AFC_OUT_ON              (1 << 1)    // .... .... .... ..1. --> enables the output (frequency offset) register
#define AFC_OUT_OFF             (0 << 1)    // .... .... .... ..0. --> disables the output (frequency offset) register
#define AFC_FINE                (1 << 2)    // .... .... .... .1.. --> switches the circuit to high accuracy (fine) mode
#define AFC_STROBE              (1 << 3)    // .... .... .... 1... --> strobe edge

// Range limit, bit 4-5

#define AFC_RL_NONE             (0 << 4)    // .... .... ..00 .... --> No restriction
#define AFC_RL_15               (1 << 4)    // .... .... ..01 .... --> +15/-16
#define AFC_RL_7                (2 << 4)    // .... .... ..10 .... --> +7/-8
#define AFC_RL_3                (3 << 4)    // .... .... ..11 .... --> +3/-4

// Automatic operation mode selector, bits 6-7

#define AFC_MANUAL              (0 << 6)    // .... .... 00.. .... --> Auto mode off (Strobe is controlled by microcontroller)
#define AFC_POWERUP             (1 << 6)    // .... .... 01.. .... --> Runs only once after each power-up
#define AFC_KEEP_REC            (2 << 6)    // .... .... 10.. .... --> 
#define AFC_KEEP                (3 << 6)    // .... .... 11.. .... --> 

// pin16 function select

#define PIN16_VDI_output       (1 << 10)

// VDI (valid data indicator) signal, bits 9-8

#define VDI_FAST               (0 << 8)    // .... .... 00.. .... --> Fast  CR_LOCK & DQD
#define VDI_MEDIUM             (1 << 8)    // .... .... 01.. .... --> Medium
#define VDI_SLOW               (2 << 8)    // .... .... 10.. .... --> Slow
#define VDI_ALWAYS_ON          (3 << 8)    // .... .... 11.. .... --> Always on

// Baseband Bandwidth (in kHz)  7-5

#define BW_X1                   (0 << 5)    // reserved
#define BW_400                  (1 << 5)
#define BW_340                  (2 << 5)
#define BW_270                  (3 << 5)
#define BW_200                  (4 << 5)
#define BW_134                  (5 << 5)
#define BW_67                   (6 << 5)
#define BW_X2                   (7 << 5)    // reserved

// LNA gain set (in dB), bits 4-3

#define LNA_0                   (0 << 3)    // .... .... ..00 ....
#define LNA_6                   (2 << 3)    // .... .... ..01 ....
#define LNA_14                  (1 << 3)    // .... .... ..10 ....
#define LNA_20                  (3 << 3)    // .... .... ..11 ....

#define LNA_XX                  (3 << 4)

// Threshold of the RSSI detector (in dBm), bits 2-0

#define RSSI_103                (0 << 0)    // .... .... .... 000.
#define RSSI_97                 (1 << 0)    // .... .... .... 001.
#define RSSI_91                 (2 << 0)    // .... .... .... 010.
#define RSSI_85                 (3 << 0)    // .... .... .... 011.
#define RSSI_79                 (4 << 0)    // .... .... .... 100.
#define RSSI_73                 (5 << 0)    // .... .... .... 101.
#define RSSI_X1                 (6 << 0)    // .... .... .... 110. --> reserved
#define RSSI_X2                 (7 << 0)    // .... .... .... 111. --> reserved


// DFILTER values

// Clock recovery, bit 7-6

#define CR_AUTO                 (1 << 7)    // .... .... 1... .... --> auto lock control
#define CR_LOCK_FAST            (1 << 6)    // .... .... .1.. .... --> fast mode
#define CR_LOCK_SLOW            (0 << 6)    // .... .... .0.. .... --> slow mode

// Data filter type, bits 4-3

#define FILTER_DIGITAL          (2 << 3)    // .... .... ...1 0... --> Digital filter
#define FILTER_ANALOG           (3 << 3)    // .... .... ...1 1... --> Analog RC filter

// DQD threshold parameter, bits 2-0
// Note: To let the DQD report "good signal quality" the threshold parameter should be less than 4 in the case when the bitrate is
// close to the deviation. At higher deviation/bitrate settings higher threshold parameter can report "good signal quality" as well.

#define DQD_0                   0
#define DQD_1                   1
#define DQD_2                   2
#define DQD_3                   3
#define DQD_4                   4
#define DQD_5                   5
#define DQD_6                   6
#define DQD_7                   7


#define STATUS_FFIT             (1 << 15)   // 1... .... .... .... --> Number of the data bits in the FIFO is reached the preprogrammed limit
#define STATUS_POR              (1 << 14)   // .1.. .... .... .... --> Power on reset
#define STATUS_RGUR             (1 << 14)   // .1.. .... .... .... --> 
#define STATUS_FFOV             (1 << 13)   // ..1. .... .... .... --> FIFO overflow
#define STATUS_WKUP             (1 << 12)   // ...1 .... .... .... --> Wake-up timer overflow

#define STATUS_EXT              (1 << 11)   // .... 1... .... .... --> 
#define STATUS_LBD              (1 << 10)   // .... .1.. .... .... --> DLow battery detect, the power supply voltage is below the preprogrammed limit
#define STATUS_FFEM             (1 << 9)    // .... ..1. .... .... --> FIFO is empty
#define STATUS_ATS              (1 << 8)    // .... ...1 .... .... --> Toggling in each AFC cycle
#define STATUS_DRSSI            (1 << 8)    // .... ...1 .... .... --> the strength of the incoming signal is above the preprogrammed limit

#define STATUS_DQD              (1 << 7)    // .... .... 1... .... --> Data Quality Detector detected a good quality signal
#define STATUS_CRL              (1 << 6)    // .... .... .1.. .... --> Clock recovery lock
#define STATUS_ATGL             (1 << 5)    // .... .... ..1. .... -->
#define STATUS_OFFS6            (1 << 4)    // .... .... ...1 .... -->

#define STATUS_OFFS3            (1 << 3)    // .... .... .... 1... -->
#define STATUS_OFFS2            (1 << 2)    // .... .... .... .1.. -->
#define STATUS_OFFS1            (1 << 1)    // .... .... .... ..1. -->
#define STATUS_OFFS0            (1 << 0)    // .... .... .... ...1 -->

#define STATUS_OFFS             0x3f
#define STATUS_OFFSIGN          0x20


#endif

// pins used for the connection with the receiver
// the other you need are controlled by the SPI library):
// Pin nFFS: 1-10k Pullup too Vcc  RFM01
// Pin nSEL

// *****************************************************************************************************
//    Pins
//
//  Pin A0    Spannung
//  Pin A1    PT1000_1
//  Pin 10    chipSelectPin RM01x
const int chipSelectPin = 10;

//  Pin 3 niRQ RM01x
const int rfm_IRQPin = 3;

//  Pin 11 BETRIEBS_STUNDEN  input
const int BETRIEBS_STUNDEN = 11;

// Pin 9 BRENNER_STOERUNG   input
const int BRENNER_STOERUNG = 9;

// Pin 12 BLINK_LICHT output
const int BLINK_LICHT = 12;

// Pin 8 HEIZUNG_AN  output
const int HEIZUNG_AN = 8;

volatile byte rxfill = 0;
volatile byte frame[5];         // frame buffer
volatile byte frameready = false; // neuer Frame

int Betriebsstunden = 1;
int BrennerStoerung = 1;
int BrennerRun      = 0;
int HeizungActive    = 0;
int Spannung = 0; // Akku Spannung
int PT1000_1 = 0; // Temperatur
int reset = 1;

double temp = 106;
double hum  =106;

int BetriebsstundenOld = 1;
int BetriebsstundenNew = 1;
unsigned long currentMillisStart;

struct settings_t
{
  int64_t runtime;
  unsigned int starts;
} settings;

typedef struct t  {
  unsigned long tStart;
  unsigned long tTimeout;
};

//Tasks and their Schedules.
t t_func1 = {0, 100}; //Run every 100ms
t t_func2 = {0, 4000}; //Run every 4 seconds.

bool tCheck (struct t *t ) {
  if (millis() > t->tStart + t->tTimeout)
    return true;
  return false;
}

void tRun (struct t *t) {
  t->tStart = millis();
}

void func1 (void) {
  //This executes every 100ms.
}
void func2 (void) {

 #ifdef USE_DHT22
  //This executes every 4 seconds.
  sensors_event_t event;
  dht.temperature().getEvent(&event);
  if (isnan(event.temperature)) {
    Serial.print("{\"frame\":\"infodht\"");
    Serial.print(",\"msg\":\"Error reading temperature\"");
    Serial.println("}");
  }
  else {
    temp = event.temperature;
  }
  // Get humidity event and print its value.
  dht.humidity().getEvent(&event);
  if (isnan(event.relative_humidity)) {
    Serial.print("{\"frame\":\"infodht\"");
    Serial.print(",\"msg\":\"Error reading humidity\"");
    Serial.println("}");
  }
  else {
    hum = event.relative_humidity;
  }
  Serial.print("{\"frame\":\"data\"");
  Serial.print(",\"ID\":99");
  Serial.print(",\"Reset\":0");
  Serial.print(",\"LOWBAT\":0");
  Serial.print(",\"Temp\":");
  Serial.print(temp);
  Serial.print(",\"Hygro\":");
  Serial.print(hum);
  Serial.println("}");
#endif

}


Bounce BrennerStoerungbouncer = Bounce( BRENNER_STOERUNG, 1200 );
Bounce Betriebsstundenbouncer = Bounce( BETRIEBS_STUNDEN, 800);

char serial_command_buffer_[32];
SerialCommands serial_commands_(&Serial, serial_command_buffer_, sizeof(serial_command_buffer_), (const char*) "\r\n", (const char*)" ");

//This is the default handler, and gets called when no other command matches.
void cmd_unrecognized(SerialCommands* sender, const char* cmd)
{
  sender->GetSerial()->print("{\"error\":\"");
  sender->GetSerial()->print(cmd);
  sender->GetSerial()->println("\"}");

}

//called for ON command
void cmd_led_on(SerialCommands* sender)
{
  digitalWrite(HEIZUNG_AN, HIGH);
  HeizungActive = 1;
  sender->GetSerial()->print("{\"frame\":\"an_ok\"");
  sender->GetSerial()->println("}");
}

//called for OFF command
void cmd_led_off(SerialCommands* sender)
{
  digitalWrite(HEIZUNG_AN, LOW);
  HeizungActive = 0;
  sender->GetSerial()->print("{\"frame\":\"aus_ok\"");
  sender->GetSerial()->println("}");
}

// reset saved data
void cmd_resetRuntime(SerialCommands* sender)
{
  settings.runtime = 0;
  settings.starts = 0;
  eeprom_write_block((const void*)&settings, (void*)0, sizeof(settings));
  sender->GetSerial()->print("{\"frame\":\"reset_ok\"");
  sender->GetSerial()->println("}");
}

// read saved data
void cmd_readData(SerialCommands* sender)
{
  char sbuf[50];
  sender->GetSerial()->print("{\"frame\":\"rundata\"");
  sender->GetSerial()->print(",\"runtime\":");
  sprintf(sbuf, "%ld", settings.runtime);
  sender->GetSerial()->print(sbuf);
  sender->GetSerial()->print(",\"starts\":");
  sender->GetSerial()->print(settings.starts);
  sender->GetSerial()->println("}");
}
//
void cmd_setData(SerialCommands* sender)
{

}
void cmd_status(SerialCommands* sender)
{
  // werte lesen
  Spannung = analogRead(0);
  BrennerStoerung = BrennerStoerungbouncer.read();
  Betriebsstunden = Betriebsstundenbouncer.read();
  PT1000_1 = analogRead(1);

  sender->GetSerial()->print("{\"frame\":\"statusdata\"");
  sender->GetSerial()->print(",\"reset\":");
  sender->GetSerial()->print(reset);
  sender->GetSerial()->print(",\"BrennerStoerung\":");
  sender->GetSerial()->print(!BrennerStoerung);
  sender->GetSerial()->print(",\"Spannung\":");
  sender->GetSerial()->print(Spannung);
  sender->GetSerial()->print(",\"PT1000_1\":");
  sender->GetSerial()->print(PT1000_1);
  sender->GetSerial()->print(",\"HeizungActive\":");
  sender->GetSerial()->print(HeizungActive);
  sender->GetSerial()->print(",\"BrennerRun\":");
  sender->GetSerial()->print(BrennerRun);
  sender->GetSerial()->println("}");

  reset = 0;
}

//
//  Note: Commands are case sensitive
//
SerialCommand cmd_led_on_("an", cmd_led_on);
SerialCommand cmd_led_off_("aus", cmd_led_off);
SerialCommand cmd_status_("status", cmd_status);
SerialCommand cmd_resetRuntime_("resetdata", cmd_resetRuntime);
SerialCommand cmd_readData_("readdata", cmd_readData);
SerialCommand cmd_setData_("setdata", cmd_setData);


void setup() {


  frameready = false;
  rxfill = 0;

  Serial.begin(115200);

  // wait open the port
  //while (!Serial);
  //Serial.println("init start");
#ifdef USE_DHT22
  dht.begin();
#endif

  serial_commands_.SetDefaultHandler(cmd_unrecognized);
  serial_commands_.AddCommand(&cmd_led_on_);
  serial_commands_.AddCommand(&cmd_led_off_);
  serial_commands_.AddCommand(&cmd_status_);
  serial_commands_.AddCommand(&cmd_resetRuntime_);
  serial_commands_.AddCommand(&cmd_readData_);
  serial_commands_.AddCommand(&cmd_setData_);

  // read saved data
  eeprom_read_block((void*)&settings, (void*)0, sizeof(settings));

  // start the SPI library:
  SPI.begin();
  SPI.setClockDivider(SPI_CLOCK_DIV8);  // 16 Mhz / 8 = 2 Mhz
  SPI.setBitOrder(MSBFIRST);

  // initalize the  data ready and chip select pins:
  pinMode(chipSelectPin, OUTPUT);
  digitalWrite(chipSelectPin, HIGH);

  pinMode(rfm_IRQPin, INPUT_PULLUP);

  // internal LED off
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN,LOW);
  
  delay(500);
  rfm01_cmd(CMD_RESET);

  // give time to set up:
  delay(500);

#ifdef RFM01

  rfm01_init();

#else

  rfm12_init();

#endif

  //digitalem Pin3
  attachInterrupt(1, rf12_interrupt, LOW);

  // initialize the digital pin as an output.
  pinMode(HEIZUNG_AN, OUTPUT);
  pinMode(BLINK_LICHT, OUTPUT);

  pinMode(BETRIEBS_STUNDEN, INPUT_PULLUP);  // Betriebsstunden
  pinMode(BRENNER_STOERUNG, INPUT_PULLUP);  // Brenner stoerung

  wdt_enable(WDTO_8S);

}

#ifdef RFM01

void rfm01_init()
{
  // Source: "RFM01 Universal ISM Band FSK Receiver" (http://www.hoperf.com/upload/rf/RFM01.pdf)

  rfm01_cmd(CMD_STATUS);      // ------------- Status Read Command -------------

  rfm01_cmd(CMD_CONFIG |      // -------- Configuration Setting Command --------
            BAND_868 |                  // selects the 868 MHz frequency band
            LOAD_CAP_12C5 |             // 12.5pF crystal load capacitance
            BW_134 |                    // 134kHz baseband bandwidth
            NO_CLOCK );                 // no clock

  rfm01_cmd(CMD_RSTMODE | 1 ); // Disable reset

  rfm01_cmd(CMD_FREQ |        // -------- Frequency Setting Command --------
            0x067c);                    // 868.300 .0 MHz --> F = ((915/(10*3))-30)*4000 = 2001 = 0x07d0


  rfm01_cmd(CMD_LOWDUTY |     // -------- Low Duty-Cycle Command --------
            0x0e);                      // (this is the default setting)

  rfm01_cmd(CMD_AFC |         // -------- AFC Command --------
            AFC_VDI |                   // drop the f_offset value when the VDI signal is low
            AFC_RL_15 |                 // limits the value of the frequency offset register to +15/-16
            AFC_STROBE |                // the actual latest calculated frequency error is stored into the output registers of the AFC block
            AFC_FINE |                  // switches the circuit to high accuracy (fine) mode
            AFC_OUT_ON |                // enables the output (frequency offset) register
            AFC_ON);                    // enables the calculation of the offset frequency by the AFC circuit

  rfm01_cmd(CMD_DFILTER |     // -------- Data Filter Command --------
            CR_LOCK_FAST |              // clock recovery lock control, fast mode, fast attack and fast release
            FILTER_DIGITAL |            // select the digital data filter
            DQD_4);                     // DQD threshold parameter

  rfm01_cmd(CMD_DRATE |       // -------- Data Rate Command --------
            0 << 7 |                    // cs = 0
            0x13);                      // R = 19 = 0x13
  // BR = 10000000 / 29 / (R + 1) / (1 + cs*7) = 17.241 kbps

  rfm01_cmd(CMD_RCON |        // -------- Receiver Setting Command --------
            VDI_CR_LOCK |               // VDI (valid data indicator) signal: clock recovery lock
            LNA_0 |                     // LNA gain set to 0dB
            RSSI_97);                   // threshold of the RSSI detector set to 97dB

  ResetFiFO();                // Reset FiFo

  rfm01_cmd(CMD_RCON |        // -------- Receiver Setting Command ---------
            VDI_CR_LOCK |               // VDI (valid data indicator) signal: clock recovery lock
            LNA_0 |                     // LNA gain set to 0dB
            RSSI_97  |                  // threshold of the RSSI detector set to 103dB
            RX_EN);                     // enables the whole receiver chain
}


#else


void rfm12_init()
{
  unsigned int data;

  // Bit	15	14	13	12	11	10	9	8	7	6	5	4	3	2	1	0
  //  1	0	0	0	0	0	0	0	el ef b1 b0 x3 x2	x1 x0
  //	1	0	0	0	0	0	0	0	1	 1	1	 0	0	 1	1	 1
  rfm01_cmd(0x80E7);			// ena TX latch, ena RX FIFO, 868MHz, 12.0pF

  // 	1	1	0	0	1	1	0	0	0	ob1	ob0	lpx	dly	dit	bw1	bw0	0xCC77
  //	1	1	0	0	1	1	0	0	0	1	1	1	0	1	1	1	0xCC77
  rfm01_cmd(0xCC77);			// drv 5/10MHz, low-power OSC, no dith., band width 256kB

  // 	1	1	0	0	0	0	0	0	d2	d1	d0	v4	v3	v2	v1	v0
  //	1	1	0	0	0	0	0	0	0	1	0	0	1	0	0	1	0xC049
  rfm01_cmd(0xC049);			// 1.66MHz, 3.1V

  // 	1	0	1	0	f11	f10	f9	f8	f7	f6	f5	f4	f3	f2	f1	f0
  //	1	0	1	0	0	1	1	0	0	1	1	1	1	1	0	0	0xA67C
  rfm01_cmd(0xA67C);			// FREQUENCY 868.300MHz

  // 	1	1	0	0	0	1	1	0	cs r6 r5 r4 r3 r2 r1 r0
  //	1	1	0	0	0	1	1	0	0	 0	0	 1	0	 0	1	 1
  rfm01_cmd(0xC613);			// DATA RATE 17.241 kbps

  //	1	0	0	1	0	p16	d1 d0	i2 i1	i0	g1	g0	r2	r1	r0
  //	1 0	0	1	0	1	  1	 0	1	 0	1	  0	  0	  0	  0	  1
  //rfm01_cmd(0x94A8);			// VDI, fast, 134khz, LNA 0dB, DRRSI -103 dB

  rfm01_cmd(0x9000 |        // -------- Receiver Setting Command --------
            PIN16_VDI_output |
            VDI_SLOW |              //
            BW_134 |
            LNA_0 |                 // LNA gain set to 0dB
            RSSI_97);               // threshold of the RSSI detector set to 97dB


  //	1	1	0	0	1	1	1	0	b7	b6	b5	b4	b3	b2	b1	b0	0xCED4
  //	1 1	0	0	1	1	1	0	1	1	0	1	0	1	0	0	0xCED4
  rfm01_cmd(0xCED4);			// SYNC=2DD4

  // 	1	1	0	0	0	0	1	0	al	ml	1	s	1	q2	q1	q0	0xC22C
  //	1	1	0	0	0	0	1	0	1	0	1	0	1	1	0	0	0xC2AC
  //rfm01_cmd(0xC2AC);			// autolock, dig. filter, mid level
  rfm01_cmd(CMD_DFILTER |     // -------- Data Filter Command --------
            CR_LOCK_FAST |              // clock recovery lock control, fast mode, fast attack and fast release
            FILTER_DIGITAL |            // select the digital data filter
            DQD_4);                     // DQD threshold parameter

  // 	1	1	0	0	1	0	1	0	f3	f2	f1	f0	sp	al	ff	dr	0xCA80
  //	1	1	0	0	1	0	1	0	1	  0	  0	  0  	0  	0	  1  	1 	0xCA83
  rfm01_cmd(0xCA03);			// FIFO level =  8, 2-SYNC, sync fill, FIFO ena, reset off

  // 	1	1	0	0	0	1	0	0	a1 a0	rl1	rl0	st fi	oe	en	0xC4F7
  //	1	1	0	0	0	1	0	0 1	 0	0	  0	  0	 0	1	  1	  0xC483
  //rfm01_cmd(0xC483);			// AFC if VDI=0, unlimited range, AFC OE+EN
  rfm01_cmd(CMD_AFC |         // -------- AFC Command --------
            AFC_KEEP |
            AFC_RL_15 |                 // limits the value of the frequency offset register to +15/-16
            AFC_STROBE |                // the actual latest calculated frequency error is stored into the output registers of the AFC block
            AFC_FINE |                  // switches the circuit to high accuracy (fine) mode
            AFC_OUT_ON |                // enables the output (frequency offset) register
            AFC_ON);                    // enables the calculation of the offset frequency by the AFC circuit

  // 	1	0	0	1	1	0	0	mp	m3	m2	m1	m0	0	p2	p1	p0	0x9800
  //	1	0	0	1	1	0	0	0	0	1	0	1	0	0	0	0	0x9850
  rfm01_cmd(0x9850);			//  no inv, deviation 90kHz, MAX OUT

  // 	1	1	1	r4	r3	r2	r1	r0	m7	m6	m5	m4	m3	m2	m1	m0	0xE196
  //	1	1	1	0	0	0	0	0	0	0	0	0	0	0	0	0	0xE000
  rfm01_cmd(0xE000);			// NOT USE

  // 	1	1	0	0	1	0	0	0	d6	d5	d4	d3	d2	d1	d0	en	0xC80E
  //	1	1	0	0	1	0	0	0	0	0	0	0	0	0	0	0	0xC800
  rfm01_cmd(0xC800);			// NOT USE

  rfm01_cmd(0x82D9);

  ResetFiFO();

  data = rfm01_cmd(0x0000);
  if (data & STATUS_FFIT)
  {
    //afc = byte(data);
    // data in RX FIFO
    //Serial.println("dummy read");
    rfm01_cmd(0xB000);
  }
}

#endif

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

      reg <<= 1;
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

  serial_commands_.ReadSerial();

  BrennerStoerungbouncer.update();
  Betriebsstundenbouncer.update();

  BetriebsstundenOld = BetriebsstundenNew;
  BetriebsstundenNew = Betriebsstundenbouncer.read();

  if (( BetriebsstundenOld == 1) && (BetriebsstundenNew == 0))
  {
    // Brenner laeuft
    Serial.print("{\"frame\":\"burnerrun\"");
    Serial.println("}");
    currentMillisStart = millis();
    BrennerRun = 1;
  }

  if (( BetriebsstundenOld == 0) && (BetriebsstundenNew == 1))
  {
    // Brenner stop 
    BrennerRun = 0;
    uint32_t runnow = currentMillisStart > millis() ? 1 + currentMillisStart + ~millis() : millis() - currentMillisStart;
    settings.runtime = settings.runtime + runnow;
    settings.starts ++ ;
    eeprom_write_block((const void*)&settings, (void*)0, sizeof(settings));
    Serial.print("{\"frame\":\"burnerstop\"");
    Serial.print(",\"runtime\":");
    Serial.print(runnow, DEC);
    Serial.print(",\"starts\":");
    Serial.print(settings.starts, DEC);
    Serial.println("}");
    
  }

  if (frameready == true)
  {
    crc = CheckITPlusCRC(&frame[0], 5);
    if (crc == 0)
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
      Serial.print("{\"frame\":\"data\"");
      Serial.print(",\"ID\":");
      Serial.print(SensorId);
      Serial.print(",\"Reset\":");
      if (ResetFlag == 1)
      {
        Serial.print("1");
      }
      else
      {
        Serial.print("0");
      }
      Serial.print(",\"LOWBAT\":");
      if (weakbat == 1)
      {
        Serial.print("1");
      }
      else
      {
        Serial.print("0");
      }
      Serial.print(",\"Temp\":");
      Serial.print(Temp, DEC);
      Serial.print(".");
      Serial.print(DeciTemp);
      Serial.print(",\"Hygro\":");
      Serial.print(Hygro);
      Serial.println("}");
    }
    else
    {
      Serial.print("{\"frame\":\"info\",\"CRCfalse\":\"");
      Serial.print(crc, HEX);
      Serial.println("\"}");
    }
    rxfill = 0;
    frameready = false;
  }
 

  BrennerStoerung = BrennerStoerungbouncer.read();
  if (BrennerStoerung == 1)
  {
    // Blinklicht aus
    digitalWrite(BLINK_LICHT, LOW);
  }
  else
  {
    digitalWrite(BLINK_LICHT, HIGH);
  }

  if (tCheck(&t_func1)) {
    func1();
    tRun(&t_func1);
  }

  if (tCheck(&t_func2)) {
    func2();
    tRun(&t_func2);
  }
  wdt_reset();
}


void rf12_interrupt() {

  unsigned int val;
  byte data1;
  byte data2;
  byte data3;

  digitalWrite(chipSelectPin, LOW);

  data1 = SPI.transfer(0);
  data2 = SPI.transfer(0);
  data3 = SPI.transfer(0);

  val = (data1 << 8) + (data2);

  //Serial.println(val,HEX);

  // take the chip select high to de-select:
  digitalWrite(chipSelectPin, HIGH);

#ifdef RFM01
  if ((val & STATUS_FFIT) && (val & STATUS_DRSSI) && (val & STATUS_DQD) && (val & STATUS_CRL))
#else
  if (val & STATUS_FFIT)
#endif
  {
    if (((data3 & 0xf0) == 0x90) && (rxfill == 0))
    {
      // new frame
      frame[0] = data3;
      rxfill++;
    }
    else if ((rxfill > 0) && (rxfill <= 3))
    {
      frame[rxfill] = data3;
      rxfill++;
    }
    else if (rxfill == 4)
    {
      // laste bye
      frame[4] = data3;
      //rxfill = 0;
      frameready = true;

      // reset and restart FIFO
      ResetFiFO();

    }
  }
  else {
    ResetFiFO();
  }
}
void ResetFiFO()
{
#ifdef RFM01

  rfm01_cmd(CMD_FIFO |        // -------- Output and FIFO Mode Command --------
            8 << 4 |                    // f = 8, FIFO generates IT when number of the received data bits reaches this level
            1 << 2 |                    // s = 1, set the input of the FIFO fill start condition to sync word
            0 << 1 |                    // Disables FIFO fill after synchron word reception
            0);                         // Disables the 16bit deep FIFO mode

  rfm01_cmd(CMD_FIFO |        // -------- Output and FIFO Mode Command --------
            8 << 4 |                    // f = 8, FIFO generates IT when number of the received data bits reaches this level
            1 << 2 |                    // s = 1, set the input of the FIFO fill start condition to sync word
            1 << 1 |                    // Enables FIFO fill after synchron word reception
            1);                         // Ensables the 16bit deep FIFO mode
#else
  rfm01_cmd(0xCA89);
  rfm01_cmd(0xCA83);
#endif
}


//Sends a SPI command
unsigned int rfm01_cmd(unsigned int value) {

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



