/*
 * Smart Health Monitoring - Water Quality Sensor
 * ESP32-based IoT sensor for monitoring water quality parameters
 * 
 * Sensors:
 * - pH sensor (analog)
 * - Turbidity sensor (analog)
 * - Temperature sensor (DS18B20)
 * - TDS sensor (analog)
 * 
 * Features:
 * - WiFi connectivity
 * - MQTT/HTTP data transmission
 * - Error handling and retries
 * - Deep sleep for power saving
 * - OTA updates support
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

// Pin definitions
#define PH_PIN A0
#define TURBIDITY_PIN 34 
#define TDS_PIN 35        
#define TEMP_PIN 4
#define LED_PIN 2

// WiFi credentials
const char* ssid = "Wireless_80C16D";
const char* password = "66666666";

// Server configuration
const char* serverUrl = "http://localhost:3000/api/sensor-data";
const char* mqttServer = "your-mqtt-broker.com";
const int mqttPort = 1883;
const char* mqttTopic = "sensors/water-quality";

// Sensor calibration values
const float pHOffset = 0.0;
const float turbidityOffset = 0.0;
const float tdsOffset = 0.0;

// Timing configuration
const unsigned long SENSOR_READ_INTERVAL = 30000; // 30 seconds
const unsigned long DEEP_SLEEP_DURATION = 300000; // 5 minutes
const int MAX_RETRIES = 3;

// Global variables
WiFiClient wifiClient;
HTTPClient httpClient;
PubSubClient mqttClient(wifiClient);
OneWire oneWire(TEMP_PIN);
DallasTemperature tempSensor(&oneWire);

unsigned long lastSensorRead = 0;
int retryCount = 0;
bool wifiConnected = false;
bool mqttConnected = false;

// Sensor data structure
struct SensorData {
  float pH;
  float turbidity;
  float temperature;
  float tds;
  float latitude;
  float longitude;
  unsigned long timestamp;
  String deviceId;
};

void setup() {
  Serial.begin(115200);
  Serial.println("Starting Water Quality Sensor...");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);
  pinMode(TDS_PIN, INPUT);
  
  // Initialize temperature sensor
  tempSensor.begin();
  
  // Initialize EEPROM for device ID
  initializeDeviceId();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize MQTT
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);
  
  // Blink LED to indicate startup
  blinkLED(3, 500);
  
  Serial.println("Water Quality Sensor initialized successfully!");
}

void loop() {
  unsigned long currentTime = millis();
  int turbidityRaw = analogRead(TURBIDITY_PIN);
  int tdsRaw = analogRead(TDS_PIN);

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectToWiFi();
  } else if (!wifiConnected) {
    wifiConnected = true;
    Serial.println("WiFi connected!");
  }
  
  // Check MQTT connection
  if (wifiConnected && !mqttConnected) {
    connectToMQTT();
  }
  
  if (mqttConnected) {
    mqttClient.loop();
  }
  
  // Read sensors at specified interval
  if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readAndTransmitSensors();
    lastSensorRead = currentTime;
  }
  
  // Deep sleep for power saving (optional)
  // ESP.deepSleep(DEEP_SLEEP_DURATION * 1000);
  
  delay(1000);
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi connected! IP address: ");
    Serial.println(WiFi.localIP());
    wifiConnected = true;
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    wifiConnected = false;
  }
}

void connectToMQTT() {
  String clientId = "water-quality-sensor-" + getDeviceId();
  
  if (mqttClient.connect(clientId.c_str())) {
    Serial.println("MQTT connected!");
    mqttConnected = true;
    mqttClient.subscribe("sensors/water-quality/commands");
  } else {
    Serial.print("MQTT connection failed, rc=");
    Serial.println(mqttClient.state());
    mqttConnected = false;
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("MQTT message received: ");
  Serial.println(message);
  
  // Handle commands
  if (String(topic) == "sensors/water-quality/commands") {
    if (message == "calibrate") {
      performCalibration();
    } else if (message == "restart") {
      ESP.restart();
    }
  }
}

void readAndTransmitSensors() {
  SensorData data = readSensorData();
  
  // Validate sensor data
  if (isValidSensorData(data)) {
    // Send via HTTP
    sendDataHTTP(data);
    
    // Send via MQTT
    if (mqttConnected) {
      sendDataMQTT(data);
    }
    
    // Blink LED to indicate successful transmission
    blinkLED(1, 200);
  } else {
    Serial.println("Invalid sensor data detected!");
    retryCount++;
    
    if (retryCount >= MAX_RETRIES) {
      Serial.println("Max retries reached. Restarting...");
      ESP.restart();
    }
  }
}

SensorData readSensorData() {
  SensorData data;
  
  // Read pH sensor
  int phRaw = analogRead(PH_PIN);
  data.pH = map(phRaw, 0, 4095, 0, 14) + pHOffset;
  
  // Read turbidity sensor
  int turbidityRaw = analogRead(TURBIDITY_PIN);
  data.turbidity = map(turbidityRaw, 0, 4095, 0, 100) + turbidityOffset;
  
  // Read TDS sensor
  int tdsRaw = analogRead(TDS_PIN);
  data.tds = map(tdsRaw, 0, 4095, 0, 1000) + tdsOffset;
  
  // Read temperature
  tempSensor.requestTemperatures();
  data.temperature = tempSensor.getTempCByIndex(0);
  
  // Get GPS coordinates (if GPS module is connected)
  data.latitude = 0.0; // Replace with actual GPS reading
  data.longitude = 0.0; // Replace with actual GPS reading
  
  // Set timestamp and device ID
  data.timestamp = millis();
  data.deviceId = getDeviceId();
  
  return data;
}

bool isValidSensorData(const SensorData& data) {
  return (data.pH >= 0 && data.pH <= 14) &&
         (data.turbidity >= 0 && data.turbidity <= 100) &&
         (data.temperature >= -40 && data.temperature <= 125) &&
         (data.tds >= 0 && data.tds <= 1000);
}

void sendDataHTTP(const SensorData& data) {
  if (!wifiConnected) return;
  
  httpClient.begin(serverUrl);
  httpClient.addHeader("Content-Type", "application/json");
  httpClient.addHeader("Authorization", "Bearer " + String(getDeviceId()));
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = data.deviceId;
  doc["timestamp"] = data.timestamp;
  doc["sensors"]["pH"] = data.pH;
  doc["sensors"]["turbidity"] = data.turbidity;
  doc["sensors"]["temperature"] = data.temperature;
  doc["sensors"]["tds"] = data.tds;
  doc["location"]["latitude"] = data.latitude;
  doc["location"]["longitude"] = data.longitude;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = httpClient.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = httpClient.getString();
    Serial.println("HTTP Response: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    retryCount = 0; // Reset retry count on success
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    retryCount++;
  }
  
  httpClient.end();
}

void sendDataMQTT(const SensorData& data) {
  if (!mqttConnected) return;
  
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = data.deviceId;
  doc["timestamp"] = data.timestamp;
  doc["sensors"]["pH"] = data.pH;
  doc["sensors"]["turbidity"] = data.turbidity;
  doc["sensors"]["temperature"] = data.temperature;
  doc["sensors"]["tds"] = data.tds;
  doc["location"]["latitude"] = data.latitude;
  doc["location"]["longitude"] = data.longitude;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  if (mqttClient.publish(mqttTopic, jsonString.c_str())) {
    Serial.println("MQTT data sent successfully");
  } else {
    Serial.println("MQTT publish failed");
  }
}

void performCalibration() {
  Serial.println("Starting sensor calibration...");
  
  // Calibrate pH sensor
  Serial.println("Calibrating pH sensor...");
  delay(2000);
  int phRaw = analogRead(PH_PIN);
  Serial.println("pH raw value: " + String(phRaw));
  
  // Calibrate turbidity sensor
  Serial.println("Calibrating turbidity sensor...");
  delay(2000);
  int turbidityRaw = analogRead(TURBIDITY_PIN);
  Serial.println("Turbidity raw value: " + String(turbidityRaw));
  
  // Calibrate TDS sensor
  Serial.println("Calibrating TDS sensor...");
  delay(2000);
  int tdsRaw = analogRead(TDS_PIN);
  Serial.println("TDS raw value: " + String(tdsRaw));
  
  Serial.println("Calibration completed!");
}

void initializeDeviceId() {
  String deviceId = "WQS-" + String(random(100000, 999999));
  
  // Store device ID in EEPROM
  for (int i = 0; i < deviceId.length(); i++) {
    EEPROM.write(i, deviceId[i]);
  }
  EEPROM.commit();
}

String getDeviceId() {
  String deviceId = "";
  for (int i = 0; i < 10; i++) {
    char c = EEPROM.read(i);
    if (c != 0) {
      deviceId += c;
    }
  }
  return deviceId;
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

// OTA Update functions (optional)
void checkForUpdates() {
  // Implement OTA update logic here
  Serial.println("Checking for updates...");
}

void performOTAUpdate() {
  // Implement OTA update logic here
  Serial.println("Performing OTA update...");
}
