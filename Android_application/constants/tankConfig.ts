// Default tank configuration — mirrors the Arduino sketch constants

export const DEFAULT_CONFIG = {
  // Slave URLs
  tank1Url: 'http://192.168.18.78/measurement',
  tank2Url: 'http://192.168.18.79/measurement',

  // Absolute heights in cm
  tank1Height: 142.0,
  tank2Height: 108.0,

  // Distance from sensor at MAX fill level (offset subtracted from raw reading)
  tank1MaxLevelDistance: 29.56,
  tank2MaxLevelDistance: 0.0,

  // Labels shown in the UI
  tank1Label: 'Underground Tank',
  tank2Label: 'Roof Tank',

  // Auto-refresh interval in milliseconds
  refreshInterval: 30000,
};

export type TankConfig = typeof DEFAULT_CONFIG;
