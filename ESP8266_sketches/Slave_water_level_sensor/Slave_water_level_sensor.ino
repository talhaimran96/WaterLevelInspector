
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

// --- Wi-Fi Credentials ---
const char* ssid = "<YOUR SSID here>";
const char* password = "<YOUR wifi password here>";


// --- Static IP Configuration ---
// CHANGE the last number to 102 for the second slave tank!
IPAddress local_IP(192, 168, YY, XX); 
IPAddress gateway(192, 168, YY, 1);
IPAddress subnet(255, 255, 255, 0);

// --- Ultrasonic Sensor Pins ---
const int trigPin = 5; // Was D1
const int echoPin = 4; // Was D2

ESP8266WebServer server(80);

void setup() {
  Serial.begin(115200);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  // Configure Static IP
  if (!WiFi.config(local_IP, gateway, subnet)) {
    Serial.println("Static IP configuration failed");
  }

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: ");
  Serial.println(WiFi.localIP());

  // Define what happens when Master requests data
  server.on("/measurement", []() {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH);
    float distance = (duration * 0.0343) / 2.0; // Convert to cm

    // Send data back to Master as plain text
    server.send(200, "text/plain", String(distance));
  });

  server.begin();
}

void loop() {
  server.handleClient(); // Listen for incoming requests
}
