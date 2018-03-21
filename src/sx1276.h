#include <stdio.h>
#include <stdint.h>
#ifndef __MY_SX1276_h__
#define __MY_SX1276_h__



/*!
 * SX1276 definitions
 */
#define XTAL_FREQ                                   32000000
#define FREQ_STEP                                   61.03515625

#ifdef __cplusplus
extern "C" {
#endif

void SX1276Init(void);
void SX1276Close(void);
void SX1276Reset( void );
uint8_t  SX1276GetVersion(void);
void SX1276RxChainCalibration( void );
void SX1276SetChannel( uint32_t freq );


void SX1276FSKOn(void);
uint32_t SX1276FSKGetData(char *buf,uint32_t len);


#ifdef __cplusplus
}
#endif
#endif
