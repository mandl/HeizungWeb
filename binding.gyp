{
  "targets": [
    {
      "target_name": "sx1276",
      "include_dirs": [ "<!(node -e \"require('nan')\")" ],
      "sources": [
        "src/bcm2835.c",
        "src/sx1276.c",
        "src/rfm95.cc"
      ]
    }
  ]
}