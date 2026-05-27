#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <IskakINO_LiquidCrystal_I2C.h>

// --- Wi-Fi Credentials ---
const char* ssid = "<YOUR SSID here>";
const char* password = "<YOUR wifi password here>";

// --- Static IP Configuration for Master ---
IPAddress local_IP(192, 168, YY, XX);
IPAddress gateway(192, 168, YY, 1);
IPAddress subnet(255, 255, 255, 0);

// --- Tank Configurations ---
const float TANK1_HEIGHT = 142.0; 
const float TANK2_HEIGHT = 108.0; 

// ---- Distance of water from sensor at max level ----
const float MAX_LEVEL_DISTANCE_TANK_1 = 29.56;
const float MAX_LEVEL_DISTANCE_TANK_2 = 0;

const String slave1_URL = "http://<Your local ip series here + device ip>/measurement"; // sample = 192.168.yy.xx
const String slave2_URL = "http://<Your local ip series here + device ip>/measurement"; // sample = 192.168.yy.xx

// --- New Pin Assignments ---
const int BUTTON_PIN = 0;     // D3 (Flash button, safe for pullup)
const int LED_YELLOW = 5;     // D1
const int LED_RED = 4;        // D2
const int LED_GREEN = 14;     // D5

// --- I2C LCD Setup ---
LiquidCrystal_I2C lcd(16, 2);

// --- Timing Variables ---
unsigned long lastFetchTime = 0;
const unsigned long FETCH_DELAY = 60000;      // 1 minute data fetch interval
unsigned long lastBlinkTime = 0;
const unsigned long BLINK_DELAY = 500;        // 500ms LED blinking interval

// --- Tracking Variables for Rising Detection ---
unsigned long lastTrendCheckTime = 0;
const unsigned long TREND_DELAY = 120000;     // 2 minutes for trend checking
float previousRoofPct = -1.0;
bool isRoofRising = false;

// --- State Variables for LEDs ---
bool ugOnline = false;
float ugPct = -1.0;
bool roofOnline = false;
float roofPct = -1.0;
bool blinkState = false;

// Function declarations
float getMeasurement(String url);
void updateMeasurements();
void controlLEDs();

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n--- Master Node Starting ---");

  // Configure Pins
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);

  // Turn off LEDs initially (Active High)
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(LED_GREEN, LOW);

  // Initialize I2C (SDA -> D6/GPIO12, SCL -> D7/GPIO13)
  Wire.begin(12, 13);
  lcd.begin();
  lcd.backlight();
  lcd.print("Connecting Wi-Fi");

  Serial.println("Configuring Static IP...");
  if (!WiFi.config(local_IP, gateway, subnet)) {
    Serial.println("Static IP configuration failed!");
  } else {
    Serial.println("Static IP configured.");
  }

  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi Connected!");
  Serial.print("Master IP Address: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.print("Network Ready!");
  delay(2000);

  // Initial immediate reading
  updateMeasurements();
}

void loop() {
  // 1. Check Push Button (Active Low)
  if (digitalRead(BUTTON_PIN) == LOW) {
    Serial.println("\n[Button Pressed] Instant Refresh Triggered.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Refreshing...");
    
    delay(200); // Debounce delay
    
    updateMeasurements();
    lastFetchTime = millis(); // Reset cycle timer
  }

  // 2. Periodic Network Fetch (Every 60 Seconds)
  if (millis() - lastFetchTime >= FETCH_DELAY) {
    updateMeasurements();
    lastFetchTime = millis();
  }

  // 3. Handle asynchronous LED Blinking
  if (millis() - lastBlinkTime >= BLINK_DELAY) {
    blinkState = !blinkState;
    lastBlinkTime = millis();
    controlLEDs(); 
  }
}

void updateMeasurements() {
  Serial.println("\n--- Fetching Tank Measurements ---");

  float dist1 = getMeasurement(slave1_URL);
  float dist2 = getMeasurement(slave2_URL);

  lcd.clear();

  // --- Process UG Tank (Tank 1) ---
  if (dist1 >= 0) {
    ugOnline = true;
    float baselineDist1 = dist1 - MAX_LEVEL_DISTANCE_TANK_1;
    ugPct = ((TANK1_HEIGHT - baselineDist1) / TANK1_HEIGHT) * 100.0;
    ugPct = constrain(ugPct, 0.0, 100.0);

    Serial.print("UG Tank - Level: "); Serial.print(ugPct, 1); Serial.println("%");
    lcd.setCursor(0, 0);
    lcd.print("UG: "); lcd.print(ugPct, 1); lcd.print("%");
  } else {
    ugOnline = false;
    ugPct = -1.0;
    Serial.println("UG is Offline or unreadable.");
    lcd.setCursor(0, 0);
    lcd.print("UG: Offline");
  }

  // --- Process Roof Tank (Tank 2) ---
  if (dist2 >= 0) {
    roofOnline = true;
    float baselineDist2 = dist2 - MAX_LEVEL_DISTANCE_TANK_2;
    roofPct = ((TANK2_HEIGHT - baselineDist2) / TANK2_HEIGHT) * 100.0;
    roofPct = constrain(roofPct, 0.0, 100.0);

    Serial.print("Roof Tank - Level: "); Serial.print(roofPct, 1); Serial.println("%");
    lcd.setCursor(0, 1);
    lcd.print("Roof: "); lcd.print(roofPct, 1); lcd.print("%");
  } else {
    roofOnline = false;
    roofPct = -1.0;
    isRoofRising = false; 
    Serial.println("Roof is Offline or unreadable.");
    lcd.setCursor(0, 1);
    lcd.print("Roof: Offline");
  }

  // --- Check Water Trend (Every 2 Minutes) ---
  if (millis() - lastTrendCheckTime >= TREND_DELAY || previousRoofPct < 0) {
    if (roofOnline && previousRoofPct >= 0) {
      if (roofPct > previousRoofPct + 0.2) { 
        isRoofRising = true;
      } else {
        isRoofRising = false;
      }
      Serial.print("Trend Check -> Prev: "); Serial.print(previousRoofPct, 1);
      Serial.print("%, Cur: "); Serial.print(roofPct, 1);
      Serial.println(isRoofRising ? "% (Rising)" : "% (Not Rising)");
    }
    
    if (roofOnline) {
      previousRoofPct = roofPct;
    } else {
      previousRoofPct = -1.0; 
    }
    lastTrendCheckTime = millis();
  }

  Serial.println("--- Update Complete ---");
  controlLEDs(); 
}

void controlLEDs() {
  // === YELLOW LED LOGIC (UG Tank) ===
  if (!ugOnline) {
    digitalWrite(LED_YELLOW, HIGH); 
  } else if (ugPct < 20.0) {        
    digitalWrite(LED_YELLOW, blinkState ? HIGH : LOW); 
  } else {
    digitalWrite(LED_YELLOW, LOW);  
  }

  // === RED LED LOGIC (Roof Tank) ===
  if (!roofOnline) {
    digitalWrite(LED_RED, HIGH);    
  } else if (roofPct < 20.0) {
    digitalWrite(LED_RED, blinkState ? HIGH : LOW);    
  } else {
    digitalWrite(LED_RED, LOW);     
  }

  // === GREEN LED LOGIC (Roof Status / Rising) ===
  if (roofOnline) {
    if (isRoofRising) {
      digitalWrite(LED_GREEN, blinkState ? HIGH : LOW); 
    } else if (roofPct > 35.0) {
      digitalWrite(LED_GREEN, HIGH);                    
    } else {
      digitalWrite(LED_GREEN, LOW);                     
    }
  } else {
    digitalWrite(LED_GREEN, LOW);                       
  }
}

float getMeasurement(String url) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;

    Serial.print("Requesting: ");   Serial.println(url);
    http.begin(client, url);
    int httpCode = http.GET();

    float distance = -1; 
    Serial.print("HTTP Response Code: "); Serial.println(httpCode);

    if (httpCode > 0) {
      String payload = http.getString();
      Serial.print("Raw Payload received: "); Serial.println(payload);
      distance = payload.toFloat();
    } else {
      Serial.println("Error on HTTP request");
    }

    http.end();
    return distance;
  } else {
    Serial.println("Wi-Fi Disconnected!");
  }
  return -1;
}
