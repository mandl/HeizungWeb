{
  "targets": [
    {
      "target_name": "sx1276",
      "include_dirs": [ "<!(node -e \"require('nan')\")" ],
      "sources": [
        "src/bcm2835.c",
        "src/sx1276.c",
        "src/relais.c",
        "src/rfm95.cc"
      ]
    },

    {
      "variables": {
        "dht_verbose%": "false"
      },
      "target_name": "node_dht_sensor",
      "sources": [
        "src/bcm2835.c",
        "src/node-dht-sensor.cpp",
        "src/dht-sensor.cpp",
        "src/util.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
      "conditions": [
        ["dht_verbose=='true'", {
          "defines": [ "VERBOSE" ]
        }]
      ]
    }
  ]
}
