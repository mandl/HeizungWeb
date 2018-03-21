#include "bcm2835.h"
#include "sx1276Regs-Fsk.h"

#include "sx1276.h"

/*!
 * FSK bandwidth definition
 */
typedef struct {
	uint32_t bandwidth;
	uint8_t RegValue;
} FskBandwidth_t;

typedef struct {

	uint8_t SensorId;
	int8_t Temp;
	uint8_t Hygro;
	uint8_t ResetFlag;
	uint8_t DeciTemp;
	uint8_t weakbat;

} TempData_t;

// LoRa DIO1 to Pin 16    RPi GPIO4(wiringPi definition).
// Lora DIO2 to Pin 18    RPi GPIO5(wiringPi definition)
// Lora DI00 to Pin 7    (Green Led )

/*!
 * Precomputed FSK bandwidth registers values
 */
const FskBandwidth_t FskBandwidths[] = { { 2600, 0x17 }, { 3100, 0x0F }, { 3900,
		0x07 }, { 5200, 0x16 }, { 6300, 0x0E }, { 7800, 0x06 }, { 10400, 0x15 },
		{ 12500, 0x0D }, { 15600, 0x05 }, { 20800, 0x14 }, { 25000, 0x0C }, {
				31300, 0x04 }, { 41700, 0x13 }, { 50000, 0x0B },
		{ 62500, 0x03 }, { 83333, 0x12 }, { 100000, 0x0A }, { 125000, 0x02 }, {
				166700, 0x11 }, { 200000, 0x09 }, { 250000, 0x01 }, { 300000,
				0x00 }, // Invalid Badwidth
		};

void SX1276Init(void) {

	if (!bcm2835_init())
		return;

	bcm2835_spi_begin();

	bcm2835_spi_setBitOrder(BCM2835_SPI_BIT_ORDER_MSBFIRST);

	//Divide the clock frequency
	bcm2835_spi_setClockDivider(BCM2835_SPI_CLOCK_DIVIDER_65536);

	//Set data mode
	bcm2835_spi_setDataMode(BCM2835_SPI_MODE0);

	// set output
	bcm2835_gpio_fsel(RPI_V2_GPIO_P1_22, BCM2835_GPIO_FSEL_OUTP);

	// set high NSS = 1
	bcm2835_gpio_set(RPI_V2_GPIO_P1_22);

	bcm2835_delay(100);

	// Pin 7 input DI00
	bcm2835_gpio_fsel(RPI_V2_GPIO_P1_07, BCM2835_GPIO_FSEL_INPT);
	bcm2835_gpio_set_pud(RPI_V2_GPIO_P1_07, BCM2835_GPIO_PUD_OFF);

	// Pin 16
	bcm2835_gpio_fsel(RPI_V2_GPIO_P1_16, BCM2835_GPIO_FSEL_INPT);
	bcm2835_gpio_set_pud(RPI_V2_GPIO_P1_16, BCM2835_GPIO_PUD_OFF);

	// Pin 18
	bcm2835_gpio_fsel(RPI_V2_GPIO_P1_18, BCM2835_GPIO_FSEL_INPT);
	bcm2835_gpio_set_pud(RPI_V2_GPIO_P1_18, BCM2835_GPIO_PUD_OFF);

	// Pin 11 Reset
}

void SX1276Close(void) {
	bcm2835_spi_end();
	bcm2835_close();

}

void SX1276Reset(void) {
	// Set RESET pin to 0
	bcm2835_gpio_fsel(RPI_V2_GPIO_P1_11, BCM2835_GPIO_FSEL_OUTP);
	bcm2835_gpio_clr(RPI_V2_GPIO_P1_11);
	// Wait 1 ms
	bcm2835_delay(1);

	// Configure RESET as input
	bcm2835_gpio_fsel(RPI_V2_GPIO_P1_11, BCM2835_GPIO_FSEL_INPT);
	bcm2835_gpio_set_pud(RPI_V2_GPIO_P1_11, BCM2835_GPIO_PUD_OFF);

	// Wait 6 ms
	bcm2835_delay(6);
}

void SX1276ReadBuffer(uint8_t addr, uint8_t *buffer, uint8_t size) {
	uint8_t i;

	//NSS = 0;
	bcm2835_gpio_clr(RPI_V2_GPIO_P1_22);

	bcm2835_spi_transfer(addr & 0x7F);

	for (i = 0; i < size; i++) {
		buffer[i] = bcm2835_spi_transfer(0);
	}

	//NSS = 1;
	bcm2835_gpio_set(RPI_V2_GPIO_P1_22);
}

uint8_t SX1276Read(uint8_t addr) {
	uint8_t data;
	SX1276ReadBuffer(addr, &data, 1);
	return data;
}

void SX1276WriteBuffer(uint8_t addr, uint8_t *buffer, uint8_t size) {
	uint8_t i;

	//NSS = 0;
	bcm2835_gpio_clr(RPI_V2_GPIO_P1_22);

	bcm2835_spi_transfer(addr | 0x80);
	for (i = 0; i < size; i++) {
		bcm2835_spi_transfer(buffer[i]);
	}

	//NSS = 1;
	bcm2835_gpio_set(RPI_V2_GPIO_P1_22);
}

void SX1276Write(uint8_t addr, uint8_t data) {
	SX1276WriteBuffer(addr, &data, 1);
}

void SX1276WriteFifo(uint8_t *buffer, uint8_t size) {
	SX1276WriteBuffer(0, buffer, size);
}

void SX1276ReadFifo(uint8_t *buffer, uint8_t size) {
	SX1276ReadBuffer(0, buffer, size);
}

void SX1276SetChannel(uint32_t freq) {
	//SX1276.Settings.Channel = freq;
	freq = (uint32_t)((double) freq / (double) FREQ_STEP);
	SX1276Write(REG_FRFMSB, (uint8_t)((freq >> 16) & 0xFF));
	SX1276Write(REG_FRFMID, (uint8_t)((freq >> 8) & 0xFF));
	SX1276Write(REG_FRFLSB, (uint8_t)(freq & 0xFF));
}

/*!
 * Performs the Rx chain calibration for LF and HF bands
 * \remark Must be called just after the reset so all registers are at their
 *         default values
 */
void SX1276RxChainCalibration(void) {
	uint8_t regPaConfigInitVal;
	uint32_t initialFreq;

	// Save context
	regPaConfigInitVal = SX1276Read(REG_PACONFIG);
	initialFreq = (double) (((uint32_t) SX1276Read(REG_FRFMSB) << 16)
			| ((uint32_t) SX1276Read(REG_FRFMID) << 8)
			| ((uint32_t) SX1276Read(REG_FRFLSB))) * (double) FREQ_STEP;

	// Cut the PA just in case, RFO output, power = -1 dBm
	SX1276Write(REG_PACONFIG, 0x00);

	// Launch Rx chain calibration for LF band
	SX1276Write(REG_IMAGECAL,
			(SX1276Read(REG_IMAGECAL) & RF_IMAGECAL_IMAGECAL_MASK)
					| RF_IMAGECAL_IMAGECAL_START);
	while ((SX1276Read(REG_IMAGECAL) & RF_IMAGECAL_IMAGECAL_RUNNING)
			== RF_IMAGECAL_IMAGECAL_RUNNING) {
	}

	// Sets a Frequency in HF band
	SX1276SetChannel(868000000);

	// Launch Rx chain calibration for HF band
	SX1276Write(REG_IMAGECAL,
			(SX1276Read(REG_IMAGECAL) & RF_IMAGECAL_IMAGECAL_MASK)
					| RF_IMAGECAL_IMAGECAL_START);
	while ((SX1276Read(REG_IMAGECAL) & RF_IMAGECAL_IMAGECAL_RUNNING)
			== RF_IMAGECAL_IMAGECAL_RUNNING) {
	}

	// Restore context
	SX1276Write(REG_PACONFIG, regPaConfigInitVal);
	SX1276SetChannel(initialFreq);
}

uint8_t SX1276GetVersion(void) {
	uint8_t version = SX1276Read(REG_VERSION);
	return version;

}

/*!
 * Returns the known FSK bandwidth registers value
 *
 * \param [IN] bandwidth Bandwidth value in Hz
 * \retval regValue Bandwidth register value.
 */
uint8_t GetFskBandwidthRegValue(uint32_t bandwidth) {
	uint8_t i;

	for (i = 0; i < (sizeof(FskBandwidths) / sizeof(FskBandwidth_t)) - 1; i++) {
		if ((bandwidth >= FskBandwidths[i].bandwidth)
				&& (bandwidth < FskBandwidths[i + 1].bandwidth)) {
			return FskBandwidths[i].RegValue;
		}
	}
	// ERROR: Value not found
	while (1) {
		printf("wrong");
	}
}

uint8_t CheckITPlusCRC(uint8_t *msge, int nbBytes) {
	uint8_t reg = 0;
	uint8_t curByte, curbit, bitmask;
	uint8_t do_xor;

	while (nbBytes-- != 0) {
		curByte = *msge++;
		bitmask = 0b10000000;
		while (bitmask != 0) {
			curbit = ((curByte & bitmask) == 0) ? 0 : 1;
			bitmask >>= 1;
			do_xor = (reg & 0x80);

			reg <<= 1;
			reg |= curbit;

			if (do_xor) {
				reg ^= 0x31;
			}
		}
	}
	return reg;
}

void SX1276FSKOn(void) {



	// 17.241 kbit/s
	uint32_t datarate = 17241;

	// 100 kHz
	uint32_t bandwidth = 100000;
	uint32_t bandwidthAfc = 100000;

	// 5 byte
	uint8_t payloadLen = 5;

	// set 868.300 Mhz
	SX1276SetChannel(868300000);

	// Set datarate
	datarate = (uint16_t)((double) XTAL_FREQ / (double) datarate);
	SX1276Write(REG_BITRATEMSB, (uint8_t)(datarate >> 8));
	SX1276Write(REG_BITRATELSB, (uint8_t)(datarate & 0xFF));

	// Set bandwidth
	SX1276Write(REG_RXBW, GetFskBandwidthRegValue(bandwidth));
	SX1276Write(REG_AFCBW, GetFskBandwidthRegValue(bandwidthAfc));

	// Set sync size 2
	SX1276Write(REG_SYNCCONFIG,
			(SX1276Read(REG_SYNCCONFIG) & RF_SYNCCONFIG_SYNCSIZE_MASK)
					| RF_SYNCCONFIG_SYNCSIZE_2);

	// Set sync byte
	SX1276Write(REG_SYNCVALUE1, 0x2D);
	SX1276Write(REG_SYNCVALUE2, 0xD4);

	// Set crc off, format fixed, dc free off, crc auto clear off
	SX1276Write(REG_PACKETCONFIG1,
			RF_PACKETCONFIG1_PACKETFORMAT_FIXED | RF_PACKETCONFIG1_DCFREE_OFF
					| RF_PACKETCONFIG1_CRC_OFF
					| RF_PACKETCONFIG1_CRCAUTOCLEAR_OFF
					| RF_PACKETCONFIG1_ADDRSFILTERING_OFF);

	// Set payloadlen
	SX1276Write(REG_PAYLOADLENGTH, payloadLen);

	// Set receiver config. AFC on, AGC on, Trigger preamble detect
	SX1276Write(REG_RXCONFIG,
			RF_RXCONFIG_AFCAUTO_ON | RF_RXCONFIG_AGCAUTO_ON
					| RF_RXCONFIG_RXTRIGER_PREAMBLEDETECT);

	// Set receiver mode
	SX1276Write(REG_OPMODE,
			(SX1276Read(REG_OPMODE) & RF_OPMODE_MASK) | RF_OPMODE_RECEIVER);

	// Set auto clear afc
	SX1276Write(REG_AFCFEI,
			(SX1276Read(REG_AFCFEI) & RF_AFCFEI_AFCAUTOCLEAR_MASK)
					| RF_AFCFEI_AFCAUTOCLEAR_ON);

	// Start receiver
	SX1276Write(REG_RXCONFIG,
			SX1276Read(REG_RXCONFIG) | RF_RXCONFIG_RESTARTRXWITHOUTPLLLOCK);

}

uint32_t SX1276FSKGetData(char *buf, uint32_t len) {

	TempData_t temp;
	uint8_t buffer[10];
	int8_t Temp;

	uint8_t crc;

	if(bcm2835_gpio_lev(RPI_V2_GPIO_P1_07) == LOW) {
		return 0;
	}

	// read buffer
	SX1276ReadFifo(buffer, 5);

	crc = CheckITPlusCRC(&buffer[0], 5);
	if (crc == 0) {

		// Id of sensor
		temp.SensorId = (((buffer[0] & 0x0f) << 4) + ((buffer[1] & 0xf0) >> 4))
				>> 2;

		// Reset flag is stored as bit #5 in sensorID.
		temp.ResetFlag = (buffer[1] & 0x20) >> 5;

		// Sign bit is stored into bit #7 of temperature. IT+ add a 40° offset to temp, so < 40 means negative
		Temp = (((buffer[1] & 0x0f) * 10) + ((buffer[2] & 0xf0) >> 4));
		temp.DeciTemp = buffer[2] & 0x0f;

		if (Temp >= 40) {
			Temp -= 40;
		} else {
			if (temp.DeciTemp == 0) {
				Temp = 40 - Temp;
			} else {
				Temp = 39 - Temp;
				temp.DeciTemp = 10 - temp.DeciTemp;
			}
			// change to Two's complement
			Temp = ~(Temp);
			Temp |= 0b10000000;
		}
		temp.Temp = Temp;
		temp.Hygro = buffer[3] & 0x7f;
		temp.weakbat = (buffer[3] & 0b10000000) >> 7;
		snprintf(buf, len,
				"{\"frame\":\"data\",\"ID\":%d,\"Reset\":%d,\"LOWBAT\":%d,\"Temp\":%d.%d,\"Hygro\":%d}",
				temp.SensorId, temp.ResetFlag, temp.weakbat, temp.Temp,
				temp.DeciTemp, temp.Hygro);
	} else {
		snprintf(buf, len, "{\"frame\":\"info\",\"CRCfalse\":\"%x\"}", crc);
	}

	return 1;

}

