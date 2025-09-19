# IoT Sensors Module

This module contains Arduino/ESP32 code for water quality monitoring sensors used in the Smart Health Monitoring Platform.

## 📁 Structure

```
iot-sensors/
├── water_quality_sensor/
│   ├── water_quality_sensor.ino    # Main sensor code
│   ├── libraries/                  # Required libraries
│   └── README.md                   # Sensor-specific documentation
├── air_quality_sensor/             # Future: Air quality monitoring
└── README.md                       # This file
```

## 🔧 Hardware Requirements

### Water Quality Sensor
- **Microcontroller**: ESP32 DevKit or Arduino Uno with WiFi shield
- **pH Sensor**: Analog pH sensor (e.g., SEN0161)
- **Turbidity Sensor**: Analog turbidity sensor (e.g., SEN0189)
- **Temperature Sensor**: DS18B20 digital temperature sensor
- **TDS Sensor**: Analog TDS sensor (e.g., SEN0244)
- **Power**: 5V/3.3V power supply or battery pack
- **Connectivity**: WiFi module (built-in for ESP32)

### Pin Connections

| Component | ESP32 Pin | Arduino Pin | Notes |
|-----------|-----------|-------------|-------|
| pH Sensor | A0 | A0 | Analog input |
| Turbidity Sensor | A1 | A1 | Analog input |
| TDS Sensor | A2 | A2 | Analog input |
| Temperature Sensor | GPIO 4 | Digital 2 | OneWire bus |
| LED Indicator | GPIO 2 | Digital 13 | Status LED |

## 📚 Required Libraries

Install these libraries in Arduino IDE:

1. **WiFi** (built-in)
2. **HTTPClient** (built-in for ESP32)
3. **PubSubClient** by Nick O'Leary
4. **OneWire** by Jim Studt
5. **DallasTemperature** by Miles Burton
6. **ArduinoJson** by Benoit Blanchon

### Installation via Library Manager:
1. Open Arduino IDE
2. Go to Tools → Manage Libraries
3. Search and install each library

## ⚙️ Configuration

### 1. WiFi Settings
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Server Configuration
```cpp
const char* serverUrl = "http://your-backend-url.com/api/sensor-data";
const char* mqttServer = "your-mqtt-broker.com";
const int mqttPort = 1883;
```

### 3. Sensor Calibration
```cpp
const float pHOffset = 0.0;        // Adjust based on calibration
const float turbidityOffset = 0.0; // Adjust based on calibration
const float tdsOffset = 0.0;       // Adjust based on calibration
```

## 🚀 Setup Instructions

### 1. Hardware Assembly
1. Connect sensors to ESP32 according to pin mapping
2. Power the ESP32 with 5V supply
3. Connect to computer via USB for programming

### 2. Software Setup
1. Install Arduino IDE
2. Install ESP32 board package:
   - File → Preferences
   - Add URL: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install
3. Install required libraries (see above)
4. Select board: "ESP32 Dev Module"
5. Configure WiFi and server settings
6. Upload code to ESP32

### 3. Calibration Process
1. Upload the code to ESP32
2. Open Serial Monitor (115200 baud)
3. Send MQTT command: `calibrate`
4. Follow calibration instructions
5. Adjust offset values in code if needed

## 📊 Data Format

The sensor sends data in JSON format:

```json
{
  "deviceId": "WQS-123456",
  "timestamp": 1234567890,
  "sensors": {
    "pH": 7.2,
    "turbidity": 15.5,
    "temperature": 25.3,
    "tds": 120.0
  },
  "location": {
    "latitude": 0.0,
    "longitude": 0.0
  }
}
```

## 🔄 Communication Protocols

### HTTP POST
- **Endpoint**: `/api/sensor-data`
- **Method**: POST
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer {deviceId}`
- **Body**: JSON sensor data

### MQTT
- **Broker**: Configurable MQTT broker
- **Topic**: `sensors/water-quality`
- **QoS**: 1 (at least once delivery)
- **Retain**: false

## 🛠️ Features

### Core Functionality
- ✅ Multi-sensor data collection
- ✅ WiFi connectivity with auto-reconnect
- ✅ HTTP and MQTT data transmission
- ✅ Error handling and retry mechanisms
- ✅ Data validation
- ✅ Device ID management

### Power Management
- ✅ Deep sleep mode (optional)
- ✅ LED status indicators
- ✅ Low power operation

### Maintenance
- ✅ OTA update support (framework)
- ✅ Remote calibration commands
- ✅ Remote restart capability
- ✅ Serial debugging interface

## 🧪 Testing

### 1. Serial Monitor Testing
```bash
# Open Serial Monitor at 115200 baud
# Look for these messages:
# - "Starting Water Quality Sensor..."
# - "WiFi connected! IP address: xxx.xxx.xxx.xxx"
# - "MQTT connected!"
# - "HTTP Response: 200"
```

### 2. Network Testing
```bash
# Test HTTP endpoint
curl -X POST http://your-backend-url.com/api/sensor-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer WQS-123456" \
  -d '{"deviceId":"WQS-123456","timestamp":1234567890,"sensors":{"pH":7.2,"turbidity":15.5,"temperature":25.3,"tds":120.0}}'

# Test MQTT (using mosquitto client)
mosquitto_pub -h your-mqtt-broker.com -t "sensors/water-quality" -m '{"deviceId":"WQS-123456","test":true}'
```

### 3. Sensor Validation
- Check sensor readings in Serial Monitor
- Verify data format matches expected JSON structure
- Test error handling by disconnecting WiFi
- Test retry mechanism by temporarily stopping server

## 🔧 Troubleshooting

### Common Issues

1. **WiFi Connection Failed**
   - Check SSID and password
   - Verify WiFi signal strength
   - Check for special characters in credentials

2. **HTTP Request Failed**
   - Verify server URL is correct
   - Check if server is running
   - Verify network connectivity

3. **MQTT Connection Failed**
   - Check MQTT broker URL and port
   - Verify broker is running
   - Check authentication if required

4. **Invalid Sensor Readings**
   - Check sensor connections
   - Verify power supply
   - Perform calibration
   - Check for electrical interference

5. **Device ID Issues**
   - Clear EEPROM and restart
   - Check EEPROM initialization code

### Debug Mode
Enable detailed logging by uncommenting debug statements in the code:

```cpp
#define DEBUG_MODE true

#ifdef DEBUG_MODE
  Serial.println("Debug: Detailed information here");
#endif
```

## 📈 Performance Optimization

### Power Consumption
- Use deep sleep mode for battery operation
- Reduce sensor reading frequency
- Optimize WiFi connection management

### Data Transmission
- Compress JSON payload
- Use MQTT for real-time data
- Batch multiple readings for HTTP

### Memory Usage
- Use PROGMEM for static strings
- Optimize JSON document size
- Implement circular buffer for data storage

## 🔄 Future Enhancements

- [ ] GPS module integration
- [ ] SD card data logging
- [ ] Bluetooth connectivity
- [ ] Solar panel power management
- [ ] Additional sensors (dissolved oxygen, conductivity)
- [ ] Edge computing for data preprocessing
- [ ] Machine learning for anomaly detection

## 📞 Support

For issues and questions:
1. Check this documentation
2. Review Serial Monitor output
3. Test individual components
4. Create an issue in the repository

---

**Note**: This sensor code is designed for educational and prototyping purposes. For production use, additional safety measures, error handling, and security features should be implemented.
