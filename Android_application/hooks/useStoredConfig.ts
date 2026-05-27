import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CONFIG, TankConfig } from '@/constants/tankConfig';

const STORAGE_KEY = 'water_monitor_config_v1';

export function useStoredConfig(): [TankConfig, (next: TankConfig) => Promise<void>] {
  const [config, setConfig] = useState<TankConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
        }
      })
      .catch(() => {/* silently use defaults */});
  }, []);

  const save = useCallback(async (next: TankConfig) => {
    setConfig(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return [config, save];
}
