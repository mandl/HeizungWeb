#include <stdio.h>
#include <stdint.h>
#ifndef __RELAIS_h__
#define __RELAIS_h__


#ifdef __cplusplus
extern "C" {
#endif

void RelaisInit(void);
void RelaisClose(void);
void RelaisOn( void );
void RelaisOff( void );

#ifdef __cplusplus
}
#endif
#endif
