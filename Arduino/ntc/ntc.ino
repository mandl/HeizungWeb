/*thermistor parameters:

   RT0: 10 000 Ω
   B: 3977 K +- 0.75%
   T0:  25 C
   +- 5%


   P1  10 Pin

   1  12 Volt
   2  12 Volt
   3  GND
   4  GND
   5  NTC 1
   6  NTC 1
   7  NTC 2
   8  NTC 2
   9  NC
   10 NC


   P2 10 Pin

   1  Fan 1 + 12 Volt
   2  Fan 1 -
   3  Fan 1 Tacho
   4  Fan 2 + 12 Volt
   5  Fan 2 -
   6  Fan 2 Tacho
   7  Fan 3 + 12 Volt
   8  Fan 3 -
   9  Fan 4Tacho
   10 NC
*/

/* These values are in the datasheet */
#define RT0 10000   // Ω
#define B 4300      // K



const int FanPin1 = 9;  // Main fan
const int FanPin2 = 10; // nForce fan
const int FanPin3 = 11; // Disk fan


const int Tacho1 = 8;
const int Tacho2 = 7;
const int Tacho3 = 6;


/* Fan case */
const byte SpeedFan1Low  = 250;
const byte SpeedFan1High = 255;

/* Fan nForce */
const byte SpeedFan2Low  = 30;
const byte SpeedFan2High = 150;

const byte SpeedFan3Low  = 00;
const byte SpeedFan3High = 0;


byte SpeedFan1;
byte SpeedFan2;
byte SpeedFan3;

int AbfrageZahl = 5; // Je mehr abfragen, desto stabiler isr das Ergebnis, dauert aber länger
int Abfrage[5]; // Array Variable für das Mitteln der Temperatur http://arduino.cc/de/pmwiki.php?n=Reference/Array

#define VCC 5.01    //Supply voltage
#define R 10000     //R=10KΩ

/* Variables */
float RT, VR, ln, TX, T0, VRT;

void setup() {

  TCCR1B = (TCCR1B & 0b11111000) | 0x01; /* Setzt Timer1 (Pin 9 und 10) auf 31300Hz */
  pinMode(Tacho1, INPUT);
  pinMode(Tacho2, INPUT);
  pinMode(Tacho3, INPUT);
  Serial.begin(9600);
  T0 = 25 + 273.15;                 /* Temperature T0 from datasheet, conversion from Celsius to kelvin */

  /* start all fans */
  SpeedFan1 = 255;
  SpeedFan2 = 255;
  SpeedFan3 = 255;

  analogWrite(FanPin1, SpeedFan1);
  analogWrite(FanPin2, SpeedFan2);
  analogWrite(FanPin3, SpeedFan3);
  delay(4000);

  SpeedFan1 = SpeedFan1Low;
  SpeedFan2 = SpeedFan2Low;
  SpeedFan3 = SpeedFan3Low;

  analogWrite(FanPin1, SpeedFan1);
  analogWrite(FanPin2, SpeedFan2);
  analogWrite(FanPin3, SpeedFan3);
}


void loop()
{
  float TX1, TX2, TX3;
  unsigned long FanRPM1;
  unsigned long FanRPM2;
  unsigned long FanRPM3;

  // case temperature
  TX1 = readNtc(A3);

  // nForce temperature
  TX2 = readNtc(A6);

  // disk temperature
  TX3 = readNtc(A5);

  Serial.print("Temperature case: ");
  Serial.print(TX1);
  Serial.print(" C nForce: ");
  Serial.print(TX2);
  Serial.print(" C  disk: ");
  Serial.print(TX3);
  Serial.println(" C");

  /* Fan 1 */
  if (TX1 >= 50 )
  {
    SpeedFan1 = SpeedFan1High;
    analogWrite(FanPin1, SpeedFan1);
  }
  else if ((TX1 <= 30) && ( TX1 > 15))
  {
    if (SpeedFan1 == 0)
    {
      /* restart fan */
      analogWrite(FanPin1, 255);
      delay(3000);

    }
    SpeedFan1 = SpeedFan1Low;
    analogWrite(FanPin1, SpeedFan1);
  }
  else if (TX1 <= 10)
  {
    /* Fan stop */
    SpeedFan1 = 0;
    analogWrite(FanPin1, SpeedFan1);
  }

  /* Fan 2 nForce */
  if (TX2 >= 47 )
  {
    SpeedFan2 = SpeedFan2High;
    analogWrite(FanPin2, SpeedFan2);
  }
  else if ((TX2 <= 44) && (TX2 > 15))
  {
    if (SpeedFan2 == 0)
    {
      /* restart fan */
      analogWrite(FanPin2, 255);
      delay(3000);

    }
    SpeedFan2 = SpeedFan2Low;
    analogWrite(FanPin2, SpeedFan2);
  }
  else if (TX < 10)
  {
    /* Fan stop */
    SpeedFan2 = 0;
    analogWrite(FanPin2, SpeedFan2);
  }

  /* Fan 3 */
  if (TX2 >= 50 )
  {
    SpeedFan3 = SpeedFan3High;
    analogWrite(FanPin3, SpeedFan3);
  }
  else if (TX2 <= 35)
  {
    SpeedFan3 = SpeedFan3Low;
    analogWrite(FanPin3, SpeedFan3);
  }

  delay(10000);

  Serial.print("Speed Fan1 RPM ");
  FanRPM1 = pulse_stretch(FanPin1, Tacho1, SpeedFan1);
  Serial.print(FanRPM1);
  Serial.print("  Fan2 RPM ");
  FanRPM2 = pulse_stretch(FanPin2, Tacho2, SpeedFan2);
  Serial.print(FanRPM2);
  Serial.print("  Fan3 RPM ");
  FanRPM3 = pulse_stretch(FanPin3, Tacho3, SpeedFan3);
  Serial.println(FanRPM3);
}

float readNtc(int pin) {

  int Durchschnitt;
  for (int i = 0; i < AbfrageZahl; i++) {
    Abfrage[i] = analogRead(pin);
    delay(10);
  }

  // Mittelt alle Abfragen
  Durchschnitt = 0;
  for (int i = 0; i < AbfrageZahl; i++) {
    Durchschnitt += Abfrage[i];
  }
  Durchschnitt /= AbfrageZahl;

  VRT = Durchschnitt;              //Acquisition analog value of VRT
  VRT = ( 5.0 / 1023.00) * VRT;      //Conversion to voltage
  VR = VCC - VRT;
  RT = VRT / (VR / R);               //Resistance of RT

  ln = log(RT / RT0);
  TX = (1 / ((ln / B) + (1 / T0))); //Temperature from thermistor

  TX = TX - 273.15;                 //Conversion to Celsius
  return TX;
}

unsigned long pulse_stretch(int FanPin, int Tacho, int FanSpeed) {

  unsigned long FlankenZeit;
  unsigned long UmdrZeit;
  unsigned long RPS;
  unsigned long RPM;

  if (FanSpeed != 0) {
    analogWrite(FanPin, 255);  /* Constant volt */
    FlankenZeit = pulseIn(Tacho, HIGH); /* get pulse length */
    if(FlankenZeit < 100)
       FlankenZeit = pulseIn(Tacho, HIGH); /* get pulse length */
    analogWrite(FanPin, FanSpeed); /* reset fan spedd */
    //Serial.println();
    //Serial.println(FlankenZeit);
    UmdrZeit = ((FlankenZeit * 4) / 1000);
    RPS = (1000 / UmdrZeit);
    RPM = (RPS * 60);
  }
  else {
    RPM = 0;
  }
  return RPM;
}
