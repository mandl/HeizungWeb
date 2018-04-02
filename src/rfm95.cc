/*

 */

#include <nan.h>
#include "bcm2835.h"
#include "sx1276.h"


using namespace Nan;


/*
 * FSK functions.
 */
NAN_METHOD(FSKInit)
{
	SX1276Init();
}

NAN_METHOD(FSKReset)
{

	SX1276Reset();
}

NAN_METHOD(FSKGetVersion)
{
	uint8_t rval;

	rval = SX1276GetVersion();
	info.GetReturnValue().Set(rval);

}

NAN_METHOD(FSKRxChainCalibration)
{

	SX1276RxChainCalibration();

}

NAN_METHOD(FSKOn)
{

	SX1276FSKOn();

}


NAN_METHOD(FSKGetData)
{

	char buf[100];

	memset(buf, 0, sizeof(char));

	SX1276FSKGetData(buf,100);

	info.GetReturnValue().Set(Nan::New(buf).ToLocalChecked());

}

NAN_METHOD(FSKClose)
{

	SX1276Close();
}



NAN_MODULE_INIT(setup)
{
	NAN_EXPORT(target, FSKInit);
	NAN_EXPORT(target, FSKReset);
	NAN_EXPORT(target, FSKGetVersion);
	NAN_EXPORT(target, FSKClose);
	NAN_EXPORT(target, FSKRxChainCalibration);
	NAN_EXPORT(target, FSKOn);
	NAN_EXPORT(target, FSKGetData);

}

NODE_MODULE(sx1276, setup)
