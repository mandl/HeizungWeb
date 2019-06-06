#include "bcm2835.h"
#include "relais.h"


void RelaisInit(void) {

	//if (!bcm2835_init())
	//	return;

	// Pin BMC 26 output
	bcm2835_gpio_fsel(RPI_V2_GPIO_P1_37, BCM2835_GPIO_FSEL_OUTP);
}

void RealisClose(void) {
	bcm2835_close();

}

void RelaisOn(void) {

	bcm2835_gpio_set(RPI_V2_GPIO_P1_37);

}

void RelaisOff(void) {
	bcm2835_gpio_clr(RPI_V2_GPIO_P1_37);
}

